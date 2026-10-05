SHELL := /bin/sh
.PHONY: setup infra up down logs api web migrate test check fmt smoke integration
setup:
	@test -f .env || cp .env.example .env
	@test -f apps/api/.env || cp apps/api/.env.example apps/api/.env
	npm ci
	cd apps/api && go mod download
infra:
	docker compose up -d postgres redis s3
up:
	docker compose --profile app up -d --build --wait
down:
	docker compose --profile app down
logs:
	docker compose --profile app logs -f --tail=100
api:
	cd apps/api && set -a && . ./.env && set +a && go run ./cmd/api
web:
	npm run dev
migrate:
	cd apps/api && set -a && . ./.env && set +a && go run ./cmd/migrate up
test:
	cd apps/api && go test -race ./...
check:
	cd apps/api && test -z "$$(gofmt -l .)" && go vet ./... && go test -race ./...
	npm run lint
	npm run build
fmt:
	cd apps/api && gofmt -w .
smoke:
	sh scripts/smoke.sh
integration:
	cd apps/api && set -a && . ./.env && set +a && go test -race -tags=integration ./internal/platform
