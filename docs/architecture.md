# Architecture and boundaries

The browser uses one API client and TanStack Query for server data. Fastify validates external inputs against shared Zod contracts and delegates to a service. Swagger describes the same contracts used at runtime.

The demo is deliberately isolated at `/api/demo`. It has one fixed identity and no authorization claims. The development server listens on loopback and rejects production mode. The future `/api/workspaces/:id` routes must verify Firebase tokens and workspace membership before any data access.

`DemoService` serializes mutations and persists a complete snapshot to a temporary file before renaming it. This avoids duplicate issue keys and partially written JSON in a single process. If persistence fails, in-memory state is not changed. Corrupt saved data fails startup instead of silently discarding it. This is a development store, not a multi-process database or an event log.

The Go service currently exposes liveness only. It will own the `insights` schema and consume at-least-once Pub/Sub events idempotently. The Python service currently exposes liveness only; Google ADK is installed but no model calls or tools are exposed. The UI does not present fake AI output or historical metrics.

Future production changes should replace the demo module with Prisma-backed feature modules, preserve the BFF boundary, use an outbox for durable event publication, and authenticate internal service requests. Full deployment must wait for identity, authorization, and durable storage tests.
