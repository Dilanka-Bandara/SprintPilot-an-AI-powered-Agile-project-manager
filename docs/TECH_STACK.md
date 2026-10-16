# Stack

| Layer              | Current foundation                                  | Why                                                        |
| ------------------ | --------------------------------------------------- | ---------------------------------------------------------- |
| Web                | React, Vite, strict TypeScript, React Router        | Component UI and fast development                          |
| Server state       | TanStack Query                                      | Cache, request lifecycle, mutation invalidation            |
| UI                 | Tailwind CSS, custom CSS, Lucide, dnd-kit, Recharts | Responsive workspace, accessible drag handles, real counts |
| API                | Fastify, Zod, Swagger                               | Shared runtime validation and documented contracts         |
| Demo storage       | Local JSON, explicitly development-only             | Run and inspect the first milestone without cloud setup    |
| Production storage | Prisma 7 + PostgreSQL 16                            | Transactions, relations, workspace isolation               |
| Insights           | Go + Gin foundation                                 | Typed, independently owned metrics service                 |
| AI                 | Python 3.12 + FastAPI + Google ADK dependency       | Foundation for tool-using Gemini agents                    |
| Tests              | Vitest, Playwright, Go testing, pytest              | API, browser, service checks without paid providers        |

Zustand, React Hook Form, shadcn/ui, sqlc, Pub/Sub, n8n, and Terraform remain in the target stack. They are not installed merely to imply their features are implemented. Current form input is validated by shared Zod on the client and API. Dependency lockfiles record the resolved versions.

TypeScript is pinned to the latest compatible 6.0.x release because the current typescript-eslint release does not support TypeScript 7. Dependency peer checks pass without overrides.
