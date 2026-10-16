.PHONY: setup dev demo lint test build e2e infra up migrate seed sqlc eval
setup:
	pnpm run setup
dev:
	pnpm dev:all
demo:
	pnpm dev
build:
	pnpm build
lint:
	pnpm lint
	go -C services/insights vet ./...
	uv run --project services/agents ruff check services/agents
	uv run --project services/agents ruff format --check services/agents
test:
	pnpm test
	go -C services/insights test ./...
	uv run --project services/agents pytest services/agents/tests
e2e:
	pnpm e2e
infra:
	docker compose up -d
up:
	@echo "Full-system containers are planned. Use make infra and make dev for this milestone."
	@exit 1
migrate seed sqlc eval:
	@echo "This target belongs to a later milestone. See docs/ROADMAP.md. Demo data seeds automatically."
	@exit 1
