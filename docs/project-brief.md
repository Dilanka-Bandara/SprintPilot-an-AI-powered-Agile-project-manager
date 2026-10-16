# AGENTS.md — SprintPilot

> This file is the instruction manual for AI coding agents (Codex) working in this repo.
> Read this whole file before writing any code. Follow it on every task.

---

## 1. What we are building

**SprintPilot** is an AI-powered Agile project management tool for software teams: a small Jira with an AI Scrum assistant built in.

Teams can:
- Sign in (Google or email) and create a **workspace**, then invite teammates.
- Manage a **backlog** of epics, stories, tasks and bugs with story points and priorities.
- Plan and run **sprints** on a drag-and-drop **sprint board**.
- Post **async daily standups** (yesterday / today / blockers).
- Connect a **GitHub repo**: pull requests that mention an issue key (e.g. `SP-12`) automatically move the issue to *In Review* and then *Done* when merged.
- See **sprint insights**: burndown chart, velocity, cycle time.
- Use **AI agents (Google ADK + Gemini)**:
  - **Story Writer:** rough idea → well-formed user stories with acceptance criteria and estimates.
  - **Sprint Planner:** suggests sprint scope from the backlog and the team's velocity.
  - **Standup Summarizer:** turns everyone's standups into a short team digest with blockers highlighted.
  - **Retro Writer:** writes a sprint retrospective report from the sprint's data.
  - **PR Reviewer:** reviews a pull request against the linked story's acceptance criteria.
  - **Scrum Assistant:** one chat that routes questions to the right agent.
- Get **automations (n8n)**: daily standup digest to email/Slack, AI PR review comment on GitHub, retro report to Google Docs when a sprint ends.

**Purpose:** learning full-stack development across React, Node.js, Go, Python AI agents, n8n and GCP, built the Agile way, as an internship/CV portfolio project.
Code must be **clean, tested, and commented where the "why" is not obvious**.

---

## 2. Tech stack (do not change without asking)

| Area | Choice |
|---|---|
| Frontend | React + Vite + TypeScript (strict), React Router, TanStack Query, Zustand (small client state), React Hook Form + Zod, Tailwind CSS, shadcn/ui, `@dnd-kit`, Recharts |
| Main API (BFF) | Node.js (LTS) + **Fastify** + TypeScript, `fastify-type-provider-zod`, `@fastify/swagger` |
| ORM / DB | **Prisma** + PostgreSQL 16 (Node owns the `public` schema) |
| Insights service | **Go** (latest stable) + **Gin**, `pgx` + **sqlc**, `golang-migrate`, `log/slog` (Go owns the `insights` schema) |
| AI agents service | **Python 3.12** + **Google ADK** (`google-adk`) + **Gemini** (Pro for reasoning, Flash for cheap/fast tasks), Pydantic, managed by `uv` |
| Workflow automation | **n8n** (self-hosted), workflows exported as JSON into `n8n/workflows/` |
| Auth | **Firebase Authentication** (Google + email/password); backends verify the Firebase ID token |
| Messaging | **Google Cloud Pub/Sub** (emulator locally) |
| Testing | Vitest + React Testing Library + MSW (web), Vitest + Fastify `inject` (api), Go `testing` + testify + testcontainers-go (insights), pytest + ADK evaluation (agents), Playwright (E2E) |
| Lint / format | ESLint + Prettier, golangci-lint + gofmt, Ruff (Python) |
| Git hooks | Lefthook (lint + format on commit, Conventional Commit message check) |
| Containers | Docker (multi-stage), Docker Compose |
| Cloud (GCP) | Cloud Run, Cloud SQL (PostgreSQL), Pub/Sub, Secret Manager, Artifact Registry, Firebase Hosting, Cloud Logging / Cloud Trace, Compute Engine (small VM for n8n), Vertex AI (Gemini) |
| IaC | Terraform (GCP provider) |
| CI/CD | GitHub Actions with **Workload Identity Federation** (no long-lived GCP keys) |
| Agile tooling | GitHub Projects (board + sprints), GitHub Issues with user-story template, PR template |

Always use the **latest stable** version of each package. Model names are **never hard-coded**: read `GEMINI_PRO_MODEL` and `GEMINI_FLASH_MODEL` from env.

---

## 3. Architecture

```
                    ┌────────────────────────────┐
  Browser ────────► │ Firebase Hosting (React)   │
     │              └────────────────────────────┘
     │ Firebase ID token (Bearer)
     ▼
┌──────────────────────┐  internal HTTP   ┌────────────────────────┐
│ api (Node/Fastify)   │ ───────────────► │ insights (Go/Gin)      │
│ BFF: auth, RBAC,     │ ◄─── Pub/Sub ─── │ GitHub webhooks,       │
│ backlog, sprints,    │ ───── Pub/Sub ─► │ burndown, velocity,    │
│ standups, AI proxy   │                  │ cycle time             │
└───┬──────────┬───────┘                  └──────────┬─────────────┘
    │          │ internal HTTP                       │ webhook (PR opened)
    │          ▼                                     ▼
    │   ┌──────────────────────┐   HTTP     ┌────────────────────┐
    │   │ agents (Python ADK)  │ ◄───────── │ n8n workflows      │ ──► Email / Slack / GitHub / Google Docs
    │   │ Gemini multi-agent   │            │ (cron + webhooks)  │
    │   └──────────────────────┘            └────────────────────┘
    ▼
 PostgreSQL (schemas: public → api, insights → Go)
```

**Rules of the architecture**
- The **browser talks only to `api`** (BFF = Backend-for-Frontend). `insights` and `agents` are internal.
- Each service **owns its own tables**. Go never writes `public` tables; Node never writes `insights` tables. They share data via **events** and **internal HTTP**.
- Internal calls carry an `X-Internal-Key` header locally; in GCP they use **Cloud Run IAM** (Google-signed ID tokens).

### Events (Pub/Sub topics)
| Topic | Publisher | Consumer | Payload |
|---|---|---|---|
| `issue-events` | api | insights | `issue.created`, `issue.status_changed`, `issue.points_changed` (issueId, workspaceId, sprintId, from, to, points, at) |
| `sprint-events` | api | insights | `sprint.started`, `sprint.completed` |
| `github-events` | insights | api | `pr.opened`, `pr.merged`, `pr.closed` (repo, number, title, url, issueKeys[]) |

Delivery is **at-least-once** → every consumer is **idempotent** (store processed message IDs).

---

## 4. Repository structure

```
sprintpilot/
├── apps/
│   ├── web/                    # React + Vite                 (port 5173)
│   └── api/                    # Node + Fastify + Prisma      (port 4000)
├── packages/
│   └── shared/                 # Zod schemas + TS types shared by web and api
├── services/
│   ├── insights/               # Go + Gin                     (port 8081)
│   │   ├── cmd/server/main.go
│   │   ├── internal/{config,http,github,metrics,events,store,auth}
│   │   ├── db/{migrations,queries}   # golang-migrate + sqlc
│   │   └── sqlc.yaml
│   └── agents/                 # Python + Google ADK          (port 8000)
│       ├── sprintpilot_agents/
│       │   ├── story_writer/   # one folder per agent (agent.py, prompts.py, schemas.py)
│       │   ├── sprint_planner/
│       │   ├── standup_summarizer/
│       │   ├── retro_writer/
│       │   ├── pr_reviewer/
│       │   ├── scrum_assistant/  # coordinator with sub-agents
│       │   ├── tools/          # functions agents can call (api client)
│       │   └── server.py       # FastAPI app exposing the agents
│       ├── evals/              # ADK eval sets per agent
│       └── tests/
├── n8n/
│   └── workflows/              # exported workflow JSON files
├── infra/
│   └── terraform/              # GCP infrastructure
├── docs/
│   ├── LEARNING.md             # written by the human
│   ├── TECH_STACK.md
│   ├── architecture.md
│   └── sprints/                # sprint-N-review.md and sprint-N-retro.md
├── .github/
│   ├── workflows/              # ci.yml, deploy.yml, agents-eval.yml
│   ├── ISSUE_TEMPLATE/user-story.yml
│   └── pull_request_template.md
├── docker-compose.yml
├── Makefile                    # one entry point for all languages
├── lefthook.yml
├── .env.example
└── AGENTS.md
```

---

## 5. Local services and ports

| Service | Port | Notes |
|---|---|---|
| web | 5173 | |
| api | 4000 | Swagger at `/docs` |
| insights (Go) | 8081 | internal |
| agents (ADK) | 8000 | internal; `adk web` dev UI on 8001 |
| postgres | 5432 | one DB, schemas `public` and `insights`; separate DB `n8n` for n8n |
| pubsub-emulator | 8085 | |
| firebase-auth-emulator | 9099 | emulator UI on 4400 |
| n8n | 5678 | |
| mailpit | 1025 / 8025 | 8025 = inbox UI |

---

## 6. Commands (Makefile is the single entry point)

```bash
make setup        # install all deps: pnpm install, go mod download, uv sync
make infra        # docker compose up -d (postgres, pubsub, firebase emulator, n8n, mailpit)
make dev          # run web + api + insights + agents with hot reload
make migrate      # prisma migrate + golang-migrate
make seed         # demo workspace, users, sprints, issues, standups
make lint         # eslint + golangci-lint + ruff
make test         # vitest + go test ./... + pytest
make e2e          # Playwright
make eval         # ADK agent evaluations (needs Gemini key)
make sqlc         # regenerate Go DB code
make up           # run the whole system in Docker
```

Keep these working. If you add one, add it here and to the README.

---

## 7. Data model

### `public` schema (owned by api, Prisma)
All tables: `id` (uuid), `created_at`, `updated_at`.
- **users**: firebase_uid (unique), email, name, avatar_url
- **workspaces**: name, key (2–5 uppercase letters, e.g. `SP`), issue_counter (int)
- **memberships**: user_id, workspace_id, role (`OWNER`|`ADMIN`|`MEMBER`) — unique (user_id, workspace_id)
- **invitations**: workspace_id, email, role, token_hash, expires_at, accepted_at
- **epics**: workspace_id, title, description, color
- **sprints**: workspace_id, name, goal, start_date, end_date, status (`PLANNED`|`ACTIVE`|`COMPLETED`) — max one ACTIVE per workspace
- **issues**: workspace_id, number (int, per workspace → key `SP-12`), type (`STORY`|`TASK`|`BUG`), title, description, acceptance_criteria (jsonb array of `{given, when, then}`), status (`BACKLOG`|`TODO`|`IN_PROGRESS`|`IN_REVIEW`|`DONE`), priority (`LOW`|`MEDIUM`|`HIGH`|`CRITICAL`), story_points (nullable int), assignee_id, reporter_id, epic_id, sprint_id, position (for ordering), source (`MANUAL`|`AI`) — unique (workspace_id, number)
- **comments**: issue_id, author_id, body
- **activity**: workspace_id, issue_id, actor_id (nullable = system), type, data (jsonb)
- **standups**: workspace_id, user_id, date, yesterday, today, blockers — unique (user_id, workspace_id, date)
- **ai_runs**: workspace_id, user_id, agent (`STORY_WRITER`|…), status, input (jsonb), output (jsonb), model, input_tokens, output_tokens, latency_ms, error
- **github_repos**: workspace_id, full_name (e.g. `udara/sprintpilot`), webhook_secret_ref (Secret Manager name / env key)
- **processed_messages**: message_id (unique), topic — idempotency

### `insights` schema (owned by Go, golang-migrate + sqlc)
- **issue_events**: message_id (unique), workspace_id, issue_id, sprint_id, type, from_status, to_status, points, occurred_at
- **sprint_windows**: sprint_id, workspace_id, start_date, end_date, completed_at
- **pull_requests**: repo, number, title, url, author, state (`OPEN`|`MERGED`|`CLOSED`), issue_keys (text[]), opened_at, merged_at — unique (repo, number)
- **webhook_deliveries**: delivery_id (unique), event, received_at — idempotency for GitHub

Every query on workspace data **must** filter by `workspace_id` after a membership check.

---

## 8. Coding rules (always follow)

### General
1. Small, focused changes. One task = one user story. Don't rewrite unrelated code.
2. Validate every external input: Zod (TS), struct validation (Go), Pydantic (Python). That includes env vars, request bodies, webhooks, Pub/Sub messages and **LLM output**.
3. No secrets in code. Env vars locally, **Secret Manager** in GCP. Add every new var to `.env.example` with a comment.
4. Fail fast at startup if config is missing or invalid.
5. Structured JSON logs everywhere with `requestId` / trace ID, `workspaceId`, `userId` when known. Never log tokens or secrets.
6. Add a short comment explaining **why** for any non-obvious decision (the human is learning).
7. Errors returned to clients use one shape: `{ "error": { "code": "ISSUE_NOT_FOUND", "message": "..." } }`.

### React (apps/web)
- Function components + hooks only. Components `PascalCase.tsx`, hooks `useSomething.ts`.
- Server data **only** through TanStack Query hooks in `src/features/<feature>/api.ts`. Zustand only for UI state (e.g. open dialogs, current workspace).
- Folder by feature: `src/features/{auth,workspaces,backlog,board,sprints,standups,insights,ai}`.
- Every page handles **loading**, **empty** and **error** states and works at 375px width. Accessible: labels, keyboard support for dialogs.
- One API client `src/lib/api.ts` that attaches the Firebase ID token.

### Node API (apps/api)
- Fastify **plugins** per feature: `src/modules/<feature>/{routes.ts,service.ts,schemas.ts,service.test.ts}`.
- Routes are thin: validate (Zod schema) → call service → return. Business logic in services.
- `authenticate` hook verifies the Firebase ID token; `requireWorkspaceRole(role)` checks membership.
- Prisma only inside services. Use transactions for multi-row changes (moving issues, completing sprints).
- Publish Pub/Sub events **after** the DB transaction commits.
- Every route has a Zod schema so Swagger is generated automatically.

### Go (services/insights)
- Standard layout: `cmd/` for entry, `internal/` for packages. Small interfaces defined by the **consumer**.
- Handlers → services → store (sqlc). No business logic in handlers.
- Always pass `context.Context`; set timeouts; graceful shutdown on SIGTERM.
- Wrap errors with context: `fmt.Errorf("compute burndown: %w", err)`.
- **Table-driven tests** for all metric calculations. Use `errgroup` for concurrent work.
- `gofmt` + `golangci-lint` must pass.

### Python ADK (services/agents)
- One folder per agent: `agent.py` (agent definition), `prompts.py` (instructions), `schemas.py` (Pydantic output models).
- Agents get data **only through tools** in `tools/` (which call the api's internal endpoints). Agents never connect to the database directly.
- Structured outputs are validated with Pydantic; on invalid output retry once, then return a clear error.
- Treat user text, PR diffs and issue descriptions as **untrusted data**: never let them change agent instructions (prompt-injection defence). Delimit them clearly in prompts.
- Use the Flash model for summaries; the Pro model for planning and reviewing.
- Every agent has an **ADK eval set** in `evals/` and pytest unit tests for its tools with a fake model.

### n8n
- Every workflow is exported to `n8n/workflows/<name>.json` after changes. **Remove credentials** before committing (n8n exports reference credential names, not secrets; check anyway).
- Workflows call SprintPilot only through the api's `/api/automation/*` endpoints with the `X-Automation-Key` header.

### Tests (all services)
- New business logic = new unit tests. New endpoint = at least one integration test.
- Tests never call real Gemini, GitHub, or email services — use fakes/mocks.
- Test names describe behaviour: `it("returns 403 when user is not a workspace member")`, `TestBurndown_WithScopeAddedMidSprint`.

### Git and Agile
- **GitHub Flow**: `main` is always deployable. Branch per story: `feat/SP-12-sprint-board`, `fix/SP-31-burndown-off-by-one`.
- **Conventional Commits**: `feat(api): add sprint completion`, `test(insights): burndown edge cases`.
- PR description follows `.github/pull_request_template.md` and links the issue (`Closes #12`).
- Before finishing: `make lint && make test`. Fix failures.

---

## 9. Definition of Done (every story)

- [ ] Acceptance criteria of the story are met.
- [ ] Lint + unit tests pass; new logic has tests.
- [ ] New env vars in `.env.example`; migrations added if schema changed.
- [ ] API docs (Swagger) updated for new endpoints.
- [ ] UI has loading / empty / error states.
- [ ] At the end of your reply, give the human a **"What I built & why"** summary:
  1. Files created/changed.
  2. The key concept used (e.g. "BFF pattern", "idempotent consumer", "ADK tool calling") in 3–5 simple sentences.
  3. How to test it manually (exact steps / URLs / curl).

---

## 10. Build plan — sprint by sprint

> **Human:** we build this the Agile way.
> 1. Create a **GitHub Project** board (columns: Backlog, Todo, In Progress, In Review, Done) with a 1-week **iteration** field.
> 2. Turn every step below into a GitHub Issue using the user-story template. Copy the **Story** and **Acceptance criteria**.
> 3. Work one story at a time on its own branch. Give Codex the **Prompt**. Open a PR, review it yourself, merge.
> 4. At the end of each sprint, write `docs/sprints/sprint-N-review.md` (what was demoed) and `sprint-N-retro.md` (what went well / badly / to improve).
> 5. After each story, answer the **Learn** questions in `docs/LEARNING.md`.

### Sprint 0 — Prepare (human, no AI)

- Install: Git, Node.js LTS, pnpm, Go, Python 3.12, `uv`, Docker Desktop, VS Code, Codex, Firebase CLI, Google Cloud CLI (`gcloud`), Terraform.
- Accounts: GitHub; Google Cloud (new accounts usually get free trial credit — check the current offer); a Firebase project linked to the GCP project; a Gemini API key from Google AI Studio for local development.
- Create the repo `sprintpilot`, add this `AGENTS.md`, commit to `main`, enable branch protection (PR required, CI must pass).

---

### Sprint 1 — Foundation (week 1)

#### 1.1 Repo skeleton
**Story:** As a developer, I want a monorepo with all services scaffolded so that I can run everything with one command.
**Prompt:**
> Read AGENTS.md. Create the structure from section 4: pnpm workspace with `apps/web` (React + Vite + TS strict), `apps/api` (Fastify + TS), `packages/shared` (Zod + one sample schema); `services/insights` as a Go module with a Gin hello-world `/health`; `services/agents` as a uv project with a FastAPI `/health`. Add the Makefile targets from section 6 (stubs where needed), ESLint/Prettier, golangci-lint config, Ruff config, `lefthook.yml` (lint staged files + Conventional Commit check), `.editorconfig`, `.gitignore`, `.env.example`, GitHub `ISSUE_TEMPLATE/user-story.yml` (story, acceptance criteria, points) and `pull_request_template.md` (what/why/how to test/checklist).

**Acceptance criteria:** `make setup` and `make dev` start all four apps; each `/health` returns 200; `make lint` passes; a bad commit message is rejected.
**Learn:** What is a monorepo? Why one Makefile for many languages? What do Git hooks do?

#### 1.2 Local infrastructure
**Story:** As a developer, I want all databases and emulators in Docker so that my laptop setup is one command.
**Prompt:**
> Create `docker-compose.yml` with: postgres 16 (volume, healthcheck, init script creating schema `insights` and database `n8n`), Google Cloud Pub/Sub emulator, Firebase Auth emulator (Node image with firebase-tools), n8n (using the `n8n` Postgres database, timezone Asia/Colombo, basic auth from env), mailpit. Add an init container/script that creates the Pub/Sub topics and subscriptions from AGENTS.md section 3. Ports from section 5. Comment every service.

**Acceptance criteria:** `make infra` → all containers healthy; n8n UI on :5678; Firebase emulator UI on :4400; topics exist.
**Learn:** Container vs image? What is an emulator and why use one? What is a volume?

#### 1.3 API skeleton
**Story:** As a developer, I want a production-style API skeleton so that every feature follows the same patterns.
**Prompt:**
> In `apps/api`: Zod-validated config; pino logging with request IDs; Zod type provider; global error handler with the error shape from section 8; `@fastify/helmet`, `@fastify/cors` (web origin only), `@fastify/rate-limit`; Swagger UI at `/docs`; `GET /health` checking Postgres. Add a tiny Pub/Sub publisher wrapper and an internal HTTP client for insights/agents with `X-Internal-Key`. Vitest test for `/health` using `app.inject`.

**Acceptance criteria:** `/health` OK; `/docs` loads; tests pass.
**Learn:** What is a Fastify plugin? What is middleware/hooks? What is CORS?

#### 1.4 Database schema
**Story:** As a developer, I want the database schema and demo data so that I can build features on real-looking data.
**Prompt:**
> Add Prisma with the `public` schema model from section 7 (indexes on foreign keys and `(workspace_id, sprint_id, status, position)` on issues). Create the first migration. `make seed`: workspace "SprintPilot Demo" key `SP`, 4 users (matching Firebase emulator accounts created by the seed script), 2 epics, 1 completed sprint, 1 active sprint, 25 issues with points and acceptance criteria, a week of standups.

**Acceptance criteria:** `make migrate && make seed` works on an empty DB; data visible in Prisma Studio.
**Learn:** What is a migration? What is a foreign key? Why index?

#### 1.5 Authentication and roles
**Story:** As a user, I want to sign in with Google or email so that only my team can see our workspace.
**Prompt:**
> API: `authenticate` hook verifying Firebase ID tokens with `firebase-admin` (pointing at the emulator in dev), upserting the user on first login; `requireWorkspaceRole` hook; endpoints: `GET /api/me`, `POST /api/workspaces`, `GET /api/workspaces`, `POST /api/workspaces/:id/invitations`, `POST /api/invitations/:token/accept`, `GET /api/workspaces/:id/members`. Invitation email sent via SMTP (Mailpit). Tests: no token → 401; non-member → 403; member → 200.

**Acceptance criteria:** the three test cases pass; an invite email appears in Mailpit and accepting it adds the member.
**Learn:** Authentication vs authorization? What is an ID token and how is it verified? What is RBAC?

#### 1.6 Frontend shell
**Story:** As a user, I want to sign in and move between my workspaces so that I can start working.
**Prompt:**
> In `apps/web`: Tailwind + shadcn/ui, React Router, TanStack Query, Firebase JS SDK (emulator in dev). Pages: landing, `/login` (Google + email, "Try demo" signs in a seeded user), `/w/:workspaceId` layout with sidebar (Backlog, Board, Standups, Insights, AI Assistant, Settings) and workspace switcher, create-workspace dialog, members/invite page. Protected routes redirect to login. MSW handlers + RTL tests for the login page and the protected route.

**Acceptance criteria:** login → workspace page; logout → login; demo button works; tests pass.
**Learn:** What does a React component re-render on? What does TanStack Query cache? SPA routing vs server routing?

#### 1.7 CI pipeline v1
**Story:** As a team, we want every PR checked automatically so that `main` never breaks.
**Prompt:**
> `.github/workflows/ci.yml` on pull_request and push to main: three jobs in parallel — **web/api** (pnpm cache, lint, typecheck, test), **insights** (setup-go with cache, golangci-lint, `go test -race ./...`), **agents** (uv, ruff, pytest). Only run jobs whose folders changed (paths filter), but always run on main. Add the status badge to README.

**Acceptance criteria:** a PR shows three green checks; a failing test blocks merge.
**Learn:** What is CI? Why run tests with `-race` in Go?

---

### Sprint 2 — Agile core (week 2)

#### 2.1 Backlog and issues
**Story:** As a product owner, I want to create and prioritise issues so that the team knows what to build next.
**Prompt:**
> Issues module: CRUD, auto key `SP-<n>` using the workspace counter inside a transaction, filters (type, status, epic, assignee, text search), ordering by `position`, epics CRUD. Activity log on every change. Web: `/backlog` with epic sidebar, drag to reorder, quick-add row, issue detail drawer (description markdown, acceptance criteria editor with Given/When/Then rows, points, assignee, comments). Tests for key generation under concurrent creates.

**Acceptance criteria:** creating issues in parallel never produces duplicate keys; reorder persists.
**Learn:** Why use a transaction for the counter? What is a race condition?

#### 2.2 Sprints and the sprint board
**Story:** As a Scrum team, we want to plan and run sprints on a board so that we can see our progress.
**Prompt:**
> Sprints module: create, add/remove issues, start (only one ACTIVE), complete (unfinished issues go back to backlog or next sprint — user chooses). `PATCH /issues/:id/move` (status + position, transaction). After commit, publish `issue.*` and `sprint.*` events to Pub/Sub. Web: sprint planning view (backlog ↔ sprint drag), `/board` Kanban with `@dnd-kit` (optimistic update, rollback on error), sprint header with goal, dates, points done/total.

**Acceptance criteria:** drag on board persists after refresh; events visible in the emulator (log subscriber script).
**Learn:** What is an optimistic update? Why publish events after commit, not before?

#### 2.3 Async standups
**Story:** As a team member, I want to post my standup in 1 minute so that we don't need a long meeting.
**Prompt:**
> Standups module: upsert today's standup, list by date for the workspace, "who hasn't posted". Web: `/standups` with today's form (yesterday/today/blockers), team cards for the selected date, blocker badges. Automation endpoint `GET /api/automation/workspaces/:id/standups?date=` protected by `X-Automation-Key` (for n8n later).

**Acceptance criteria:** one standup per user per day (second save updates); missing members listed.

---

### Sprint 3 — Go insights service (week 3)

#### 3.1 Go service foundation
**Story:** As a developer, I want a solid Go service skeleton so that insights code is reliable and testable.
**Prompt:**
> In `services/insights`: config from env (validated), `slog` JSON logging, Gin with request-ID + recovery middleware, internal-key auth middleware, `/health` checking Postgres, graceful shutdown, golang-migrate migrations for the `insights` schema (section 7), sqlc config + queries, multi-stage Dockerfile ending in a distroless non-root image. Tests for middleware.

**Acceptance criteria:** service starts, migrates, health OK; image < 30 MB.
**Learn:** Go packages and `internal/`. What does sqlc generate and why not an ORM? What is graceful shutdown?

#### 3.2 Consume issue and sprint events
**Story:** As the insights service, I want to record every issue change so that I can compute metrics later.
**Prompt:**
> Pub/Sub **push** endpoint `POST /pubsub/issue-events` and `/pubsub/sprint-events` (decode the push envelope, validate payload, insert into `issue_events` / `sprint_windows`; duplicate `message_id` → return 200 without inserting). Return non-2xx only for retryable errors. Configure emulator push subscriptions to these URLs. testcontainers-go integration test for idempotency.

**Acceptance criteria:** moving a card on the board creates exactly one `issue_events` row even if the message is delivered twice.
**Learn:** Push vs pull subscriptions? What is an idempotent consumer?

#### 3.3 Metrics (TDD)
**Story:** As a Scrum Master, I want burndown, velocity and cycle time so that the team can improve.
**Prompt:**
> Write the **tests first** (table-driven) in `internal/metrics`, then implement: `Burndown(window, events) []Point` (ideal line + remaining points per day, handles scope added mid-sprint, weekends included), `Velocity(lastN sprints)` (completed points per sprint + average), `CycleTime(events)` (IN_PROGRESS → DONE, median and p85). Endpoint `GET /workspaces/:id/insights?sprintId=` computes the three concurrently with `errgroup`. API (Node) proxies it at `/api/workspaces/:id/insights` after the membership check.

**Acceptance criteria:** all table tests pass, including edge cases (no events, issue reopened, points changed); proxy returns 403 for non-members.
**Learn:** What is TDD (red → green → refactor)? What is a goroutine and `errgroup`? What is the BFF pattern?

#### 3.4 GitHub integration
**Story:** As a developer, I want my PRs to update issues automatically so that the board is always accurate.
**Prompt:**
> Insights: `POST /webhooks/github` (public route) — verify `X-Hub-Signature-256` HMAC with constant-time compare, dedupe by `X-GitHub-Delivery`, handle `pull_request` events (opened/closed/merged), extract keys matching `[A-Z]{2,5}-\d+` from title and branch, upsert `pull_requests`, publish `github-events`; on `opened` also POST to the n8n webhook URL (if configured). API: consume `github-events` (push endpoint, idempotent) → move issues to IN_REVIEW on open, DONE on merge, add activity "PR #12 merged". Web: settings page to connect a repo (shows webhook URL + secret to paste in GitHub), PR links on the issue drawer.

**Acceptance criteria:** with a tunnel (e.g. `cloudflared`/ngrok) and a real test repo, opening a PR titled "SP-5 add login" moves SP-5 to In Review; merge → Done. Wrong signature → 401.
**Learn:** What is a webhook? Why verify HMAC signatures? Why constant-time comparison?

#### 3.5 Insights dashboard
**Story:** As a team, we want charts of our sprint so that we can see if we're on track.
**Prompt:**
> Web `/insights`: sprint selector, burndown line chart (ideal vs actual), velocity bar chart (last 6 sprints + average line), cycle time stat cards, recent PRs list. Skeleton loaders and empty state ("Complete a sprint to see velocity").

**Acceptance criteria:** charts match seed data; empty states shown for a new workspace.

---

### Sprint 4 — AI agents with Google ADK + Gemini (week 4)

#### 4.1 Agents service foundation
**Story:** As a developer, I want an ADK service skeleton so that adding agents is easy and safe.
**Prompt:**
> In `services/agents`: add `google-adk`; config via pydantic-settings (Gemini via AI Studio key locally, Vertex AI in GCP — switch by env; model names from `GEMINI_PRO_MODEL` / `GEMINI_FLASH_MODEL`). `tools/api_client.py` calling the Node API internal endpoints (`/internal/workspaces/:id/backlog`, `/internal/.../velocity`, `/internal/.../sprint/:id/summary`, `/internal/issues/:key`). FastAPI `server.py` with internal-key auth exposing `POST /agents/{name}/run` (runs an ADK `Runner` with an in-memory session; returns validated JSON) and `POST /agents/scrum-assistant/stream` (SSE). Make `adk web` work for local experimentation. Fake-model fixtures for pytest.

**Acceptance criteria:** a "hello" agent runs via `adk web` and via the HTTP endpoint; tests pass without network.
**Learn:** What is an AI agent vs a single LLM call? What are ADK's Agent, Runner, Session and Tool?

#### 4.2 Story Writer agent
**Story:** As a product owner, I want to turn a rough idea into good user stories so that backlog refinement is faster.
**Prompt:**
> `story_writer` agent (Pro model): input = idea text + epic; tool `get_backlog_titles` to avoid duplicates; output schema = list of stories `{title, as_a, i_want, so_that, acceptance_criteria[{given,when,then}], estimate_points (1,2,3,5,8), type}`, max 8. API `POST /api/workspaces/:id/ai/stories` → calls agent, stores `ai_runs` (tokens, latency, model) and returns a **draft** (nothing saved to backlog yet). Web: "Write stories with AI" dialog → editable preview → select → "Add to backlog" (source = AI). Usage limit: 30 AI runs/day per workspace.

**Acceptance criteria:** "users can reset their password by email" produces 2–5 sensible stories with Given/When/Then; duplicates of existing titles are avoided; nothing is saved until the user accepts.
**Learn:** What is structured output? Why keep a human in the loop?

#### 4.3 Sprint Planner agent
**Story:** As a Scrum Master, I want a suggested sprint scope so that planning meetings are shorter.
**Prompt:**
> `sprint_planner` agent (Pro): tools `get_velocity`, `get_backlog` (prioritised, with points), `get_team_capacity` (members count, optional days off). Output: selected issue keys, total points, reasoning, risks (e.g. unestimated stories). Validate: total points ≤ 110% of average velocity, keys exist. Web: "Suggest sprint" in sprint planning → shows proposal with reasoning → "Apply" moves the issues.

**Acceptance criteria:** suggestion never includes non-existent keys; total respects the velocity rule; unestimated stories are flagged.
**Learn:** What is tool/function calling? Why validate the agent's answer in code?

#### 4.4 Standup Summarizer and Retro Writer
**Story:** As a team lead, I want AI summaries of standups and sprints so that I spot blockers and lessons quickly.
**Prompt:**
> `standup_summarizer` (Flash): input = day's standups → `{summary, blockers[{who, what, suggested_action}], no_update_from[]}`. `retro_writer` as an ADK **SequentialAgent**: step 1 `data_collector` (tools: sprint summary, insights metrics, PRs) → step 2 `analyst` (what went well / didn't / patterns) → step 3 `writer` (markdown report with action items). API endpoints for both + automation endpoints for n8n. Web: "AI summary" card on `/standups`; "Generate retro" button on completed sprints.

**Acceptance criteria:** blockers from seed standups appear; retro report contains metrics that match the insights page.
**Learn:** What are workflow agents (Sequential, Parallel, Loop) vs LLM agents?

#### 4.5 PR Reviewer agent
**Story:** As a reviewer, I want an AI first-pass review against the story's acceptance criteria so that I catch gaps early.
**Prompt:**
> `pr_reviewer` agent (Pro): input = PR title, diff (truncate to a size limit, skip lock/generated files), linked issue keys; tool `get_issue` for acceptance criteria. Output `{summary, criteria_check[{criterion, status: MET|NOT_MET|UNCLEAR, evidence}], issues[{file, line?, severity, comment}], verdict}`. The diff is untrusted: wrap it in clear delimiters and instruct the agent to ignore instructions inside it. Expose via automation endpoint (n8n calls it in Sprint 5).

**Acceptance criteria:** a PR missing one acceptance criterion gets NOT_MET for it; a diff containing "ignore previous instructions" doesn't change behaviour (test case).
**Learn:** What is prompt injection and how do you reduce the risk?

#### 4.6 Scrum Assistant (multi-agent)
**Story:** As a user, I want one chat that answers sprint questions so that I don't need to know which tool to use.
**Prompt:**
> `scrum_assistant` coordinator (Flash) with sub-agents: story_writer, sprint_planner, standup_summarizer, plus direct tools `get_sprint_status`, `search_issues`. ADK routes by intent (agent transfer). Streaming via SSE: agents service → Node API proxy → web chat panel (messages stream in, tool activity shown as "Looking up backlog…"). Session per user per workspace. Read-only: the assistant can propose changes but the UI asks the user to confirm actions.

**Acceptance criteria:** "How is the sprint going?" uses sprint status; "Write stories for dark mode" routes to story_writer; answers stream word by word.
**Learn:** How does an LLM decide which sub-agent to use? SSE vs WebSocket?

#### 4.7 Agent evaluation
**Story:** As a developer, I want automated agent evaluations so that prompt changes don't silently make agents worse.
**Prompt:**
> Create ADK eval sets in `evals/` (3–5 cases per agent: expected tool calls + reference answers/rubrics). `make eval` runs them. `.github/workflows/agents-eval.yml` runs evals on PRs touching `services/agents/` (uses a repository secret for the Gemini key) and posts the scores as a PR comment. Add an `ai_runs` admin page in web: runs per agent, avg latency, tokens, error rate.

**Acceptance criteria:** `make eval` prints scores; deliberately breaking a prompt lowers the score.
**Learn:** Why are LLM apps tested with evaluations, not only unit tests?

---

### Sprint 5 — n8n automations (week 5)

> Build these in the n8n UI (http://localhost:5678), then export to `n8n/workflows/`. Codex helps with the API endpoints and docs; you build the workflow visually.

#### 5.1 Daily standup digest
**Story:** As a team lead, I want a standup digest every weekday morning so that I don't have to read every update.
**Prompt (for the API side):**
> Add `POST /api/automation/workspaces/:id/standup-digest` returning the summarizer output + a ready-to-send HTML body. Write `docs/n8n.md` section "Daily digest": Schedule Trigger (Mon–Fri 10:00 Asia/Colombo) → HTTP Request (digest endpoint, header credential) → IF has blockers → Send Email (SMTP → Mailpit locally) and optional Slack node.

**Acceptance criteria:** triggering the workflow manually sends the digest to Mailpit.
**Learn:** What is a cron schedule? When is a no-code workflow tool better than writing code?

#### 5.2 AI PR review comment
**Story:** As a developer, I want an automatic AI review comment on my PR so that I get feedback in minutes.
**Prompt (for the API side):**
> Add `POST /api/automation/pr-review` (input: repo, PR number, diff, keys → runs pr_reviewer → returns markdown comment). Document the workflow: Webhook Trigger (called by insights on PR opened) → GitHub node "Get PR files/diff" → HTTP Request to pr-review → GitHub node "Create comment" on the PR. Add an "AI review by SprintPilot" footer.

**Acceptance criteria:** opening a PR on the test repo produces an AI comment within a minute.

#### 5.3 Sprint retro to Google Docs
**Story:** As a team, we want the retro report saved automatically so that we keep a history.
**Prompt (for the API side):**
> When a sprint completes, api calls the n8n webhook `sprint-completed` (async, retry 3x). Add `POST /api/automation/sprints/:id/retro`. Document the workflow: Webhook → HTTP Request (retro) → Google Docs node (create doc from markdown in a "SprintPilot Retros" folder) → Email the team the doc link → HTTP Request back to api to save `retro_doc_url` on the sprint (add migration).

**Acceptance criteria:** completing a sprint creates a Google Doc and the link appears on the sprint page.
**Learn:** What is OAuth for Google APIs in n8n? Why make the webhook call async with retries?

---

### Sprint 6 — Quality and deploy to GCP (week 6)

#### 6.1 Testing pass
**Story:** As a team, we want strong tests so that we can change code with confidence.
**Prompt:**
> Raise coverage: web (components + hooks with MSW), api (each module's service + routes), insights (≥ 80% on `internal/metrics`), agents (tools + output validation). Add Playwright E2E: demo login → create story with AI (mocked agent) → plan sprint → drag card to Done → see burndown update. Add coverage reports to CI artifacts.

**Acceptance criteria:** `make test && make e2e` green; coverage reports uploaded in CI.
**Learn:** Unit vs integration vs E2E — what does each catch? What is mocking?

#### 6.2 Observability
**Story:** As an operator, I want to trace a request across services so that I can debug production quickly.
**Prompt:**
> Add OpenTelemetry to api (Node), insights (Go) and agents (Python): propagate trace context over HTTP and in Pub/Sub message attributes; export to Cloud Trace in GCP and to the console locally. Logs include trace IDs in the format Cloud Logging uses to correlate logs with traces.

**Acceptance criteria:** one "Suggest sprint" click shows a single trace across api → agents → api internal endpoints.

#### 6.3 GCP infrastructure with Terraform
**Story:** As a team, we want our cloud setup as code so that it's reproducible and reviewable.
**Prompt:**
> `infra/terraform`: enable APIs; Artifact Registry repo; service accounts per service with least-privilege roles; Cloud SQL Postgres (smallest tier, private or Cloud SQL connector); Secret Manager secrets; Pub/Sub topics + **push subscriptions with OIDC auth** to Cloud Run; Cloud Run services `api` (public), `insights` (public only for `/webhooks/github`, everything else checks IAM/internal auth), `agents` (private, invoker = api SA only); Cloud Run **job** for migrations; Firebase Hosting site with rewrite `/api/**` → api; a small Compute Engine VM running n8n in Docker with Caddy for HTTPS; Workload Identity Federation pool for GitHub Actions. Remote state in a GCS bucket. README with a cost warning and `terraform destroy` instructions.

**Acceptance criteria:** `terraform plan` is clean; `apply` creates everything; services reach each other only as allowed.
**Learn:** What is serverless (Cloud Run scales to zero)? What is least privilege? Why Workload Identity Federation instead of JSON keys?

#### 6.4 Continuous deployment
**Story:** As a team, we want every merge to `main` deployed automatically so that we ship small and often.
**Prompt:**
> `.github/workflows/deploy.yml` on push to main (after CI passes): authenticate via WIF, build and push images (tag = commit SHA) to Artifact Registry, run the migration job, deploy Cloud Run revisions, smoke-test `/health`, then build and deploy web to Firebase Hosting. On PRs, deploy web to a Firebase **preview channel** and comment the URL. Document rollback (route traffic to the previous Cloud Run revision).

**Acceptance criteria:** merging a PR updates the live site; a PR gets a preview URL comment.
**Learn:** What is CD? What is a Cloud Run revision and how do you roll back?

#### 6.5 Portfolio polish
**Story:** As a job candidate, I want a great README and demo so that recruiters understand the project in 2 minutes.
**Prompt:**
> README: one-line pitch, live demo link + demo login, 90-second demo video/GIF placeholder, Mermaid architecture diagram, tech stack table with "why", features, AI agents section (diagram of the multi-agent setup), n8n workflows screenshots placeholders, how to run locally (`make setup && make infra && make dev`), testing, deployment, **"How we worked (Agile)"** linking the GitHub Project board and `docs/sprints/`. `docs/architecture.md` with sequence diagrams: login, PR merged → issue Done, AI sprint suggestion, daily digest.

**Acceptance criteria:** someone new can run it from the README alone.

---

## 11. How the human works with you (Codex)

- One story at a time. If a story is big, split it (e.g. "3.4 part A: webhook verification only").
- After each story the human may ask *"Explain this like I'm new to it"* — answer simply, with an analogy and a tiny example.
- If something is unclear or conflicts with this file, **ask before guessing**.
- If you change an architectural decision, update this file in the same PR.
