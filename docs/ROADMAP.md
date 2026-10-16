# Delivery roadmap

The full scope is in [the supplied project brief](project-brief.md). Checkboxes below mean implemented, not merely scaffolded.

## Milestone 1 — Local working product

- [x] pnpm workspace with strict TypeScript, shared Zod schemas, React and Fastify.
- [x] API validation, Swagger, structured logs, rate limiting, localhost-only demo.
- [x] Persisted demo issues, unique keys under concurrency, status changes, filters, editor.
- [x] Responsive board, daily standups, current-work insights.
- [x] Go and Python service liveness endpoints, tests, CI configuration.
- [x] Optional PostgreSQL/Mailpit Compose services and developer documentation.

## Milestone 2 — Real team workspace

- [x] Initial Prisma schema, migrations, PostgreSQL workspace/issue persistence and transactional issue counters.
- [x] Firebase email/Google sign-in, password reset, verified tokens, membership authorization.
- [x] Workspace creation, owner membership, member list and workspace-scoped issue CRUD.
- [ ] Firebase emulators and authenticated browser tests.
- [ ] Invitations, role administration, team assignment, epics, comments, activity log.
- [ ] Sprint planning, ordering, one-active-sprint constraint, completion carryover.
- [ ] Transactional outbox and Pub/Sub emulator/event delivery.

## Milestone 3 — Insights and GitHub

- [ ] Go-owned insights schema, sqlc, idempotent consumers and workspace isolation.
- [ ] Tested burndown, velocity, cycle time including reopening and scope changes.
- [ ] Signed and deduplicated GitHub webhooks, PR-to-issue state transitions.

## Milestone 4 — AI

- [ ] ADK tools through the BFF, validated outputs, model names from environment.
- [ ] Story Writer, Sprint Planner, Standup Summarizer, Retro Writer, PR Reviewer.
- [ ] Streaming Scrum Assistant, human approval of proposed changes, limits and usage logs.
- [ ] Fake-model tests and real-model evaluation sets.

## Milestones 5–6 — Automate and deploy

- [ ] n8n digest, PR review and retro workflows, credentials configured by the owner.
- [ ] End-to-end authenticated flow, tracing, coverage gates.
- [ ] Terraform, Cloud Run/SQL, Firebase Hosting, WIF CI deployment.
- [ ] Live demo, portfolio screenshots, video and cost documentation.

No cloud services are provisioned by this milestone. Integration credentials are not required to run the local demo.
