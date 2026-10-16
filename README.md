# SprintPilot

**A calmer way to plan, build, and ship together.** An Agile project manager with a working local demo and a roadmap toward a Gemini-powered Scrum assistant.

![SprintPilot local sprint board](docs/images/board.png)

## What works today

- Responsive React workspace: sprint board, backlog, standups, insights, settings.
- Create, edit, delete, search, filter, and assign issues with story points and priorities.
- Drag issues across the board, or change status in the keyboard-accessible issue dialog.
- Fastify API with validated requests, Swagger, rate limits, consistent errors, and durable local demo storage.
- One daily standup per demo user, using the Asia/Colombo calendar date.
- Insights calculated from actual demo issues; no fabricated historical metrics.
- Go/Gin and Python/FastAPI service health endpoints; Google ADK dependency installed for the next AI milestone.
- Unit/API tests, Playwright desktop/mobile journeys, and three CI jobs.

**Milestone 2 now adds Firebase sign-in and PostgreSQL workspaces.** Email/Google login, password reset, workspace creation, membership checks, member listing, and persistent workspace issues are available. Follow [authentication setup](docs/AUTH_SETUP.md), then open `/login`. Real workspaces start empty and are separate from the demo.

The six-sprint product is still in progress. Invitations, role administration, team assignment, real sprint lifecycle, workspace standups, AI, GitHub webhooks, Pub/Sub, n8n, and deployment are not implemented yet. The API binds to `127.0.0.1` and refuses production mode because the unauthenticated demo still exists.

## Run the working demo

Install Node.js 22.20+ and pnpm 11.19.0, then:

```sh
pnpm install
pnpm --filter @sprintpilot/api db:generate
pnpm dev
```

Open **http://127.0.0.1:5173**. API docs: **http://127.0.0.1:4000/docs**.

No credentials or Docker required for the demo. Demo issues seed automatically. Changes persist in `.data/demo.json` and are excluded from Git. Stop the API before deleting that file to reset the demo. Do not run multiple API processes against the same data file.

Try it:

1. Click **Create issue**, enter a title, and save.
2. Drag the new card by its grip to **Done**. Refresh to check persistence.
3. Open **Backlog**, search for the title, and open it to edit or delete.
4. Open **Standups**, post an update, then update it again: it remains one entry.
5. Open **Insights** to see current counts. The AI page explains what is still planned.

## Run all four service foundations

Also install Go 1.27+, Python 3.12, and uv. GNU Make is optional on Windows; equivalent commands are provided.

```sh
make setup    # pnpm run setup
make dev      # pnpm dev:all
```

Web: 5173 · API: 4000 · Insights: 8081 · Agents: 8000.
Each backend exposes `/health`. Web `/health` proxies the API health check. Only web/API and Python currently hot reload; rerun Go after edits.

```sh
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:8081/health
curl http://127.0.0.1:8000/health
```

The health checks are liveness checks. Go metrics and AI agent execution explicitly report disabled, and no database readiness is implied.

## Verify

```sh
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm e2e
go -C services/insights test ./...
go -C services/insights vet ./...
uv run --project services/agents ruff check services/agents
uv run --project services/agents ruff format --check services/agents
uv run --project services/agents pytest services/agents/tests
```

`make lint` and `make test` combine the language checks. CI additionally runs Go's race detector. E2E tests use isolated ports (5183/4100) and a fresh `.data/e2e-<timestamp>.json` file for each run, preserving your demo data.

## Optional local infrastructure

Copy `.env.example` to `.env`, change the local PostgreSQL password in both `POSTGRES_PASSWORD` and `DATABASE_URL`, and run `make infra` (`docker compose up -d`). PostgreSQL 16 is used by authenticated workspaces when `WORKSPACES_ENABLED=true`; the demo still uses JSON. Its default host port is 55432. Mailpit is reserved for future invitations; its inbox is http://127.0.0.1:8025. Stop with `docker compose down` (database volume retained).

`make migrate` applies the checked-in Prisma migrations. `make up`, `make seed`, `make sqlc`, and `make eval` still fail with an explanatory message until implemented.

## Architecture

```mermaid
flowchart LR
  Browser[React workspace] --> API[Fastify BFF]
  API --> Demo[Local demo JSON]
  API --> DB[(PostgreSQL / Prisma workspaces)]
  API -. planned .-> Go[Go / Gin insights]
  API -. planned .-> ADK[Python / Google ADK / Gemini]
  API -. planned .-> Events[Pub/Sub]
  Events -. planned .-> Go
  N8N[n8n automations] -. planned .-> API
```

The browser calls the BFF for application data and Firebase directly for authentication. The demo module is separate from the authenticated workspace API and its Prisma-backed storage.

See [architecture](docs/architecture.md), [stack choices](docs/TECH_STACK.md), [roadmap](docs/ROADMAP.md), and the [original project brief](docs/project-brief.md). The supplied document is preserved as a reference; its embedded example prompts are not automatically executed instructions or claims of completed work. Learning reflections remain for the human to write.

## How we work

Small, testable increments, Conventional Commits, feature branches, and reviewed pull requests. Run `pnpm exec lefthook install` to enable commit checks. Use the user-story and PR templates in `.github`. The [first milestone review](docs/sprints/sprint-1-review.md) records delivered work and limitations. A GitHub Project board and cloud resources have not been provisioned.
