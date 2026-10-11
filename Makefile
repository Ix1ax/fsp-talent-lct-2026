SHELL := /bin/sh
.PHONY: setup infra up down logs api web migrate test check fmt smoke integration auth-smoke keycloak-theme
setup:
	@test -f .env || cp .env.example .env
	@test -f apps/api/.env || cp apps/api/.env.example apps/api/.env
	@test -f apps/web/.env || cp apps/web/.env.example apps/web/.env
	npm ci
	cd apps/api && go mod download
infra:
	docker compose up -d postgres redis s3 keycloak-db mailpit keycloak
	sh scripts/keycloak-theme.sh
up:
	docker compose --profile app up -d --build --wait --wait-timeout 360
	sh scripts/keycloak-theme.sh
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
	sh scripts/check-openapi.sh
	cd apps/api && test -z "$$(gofmt -l .)" && go vet ./... && go test -race ./...
	npm run test
	npm run typecheck
	npm run lint
	npm run build
fmt:
	cd apps/api && gofmt -w .
smoke:
	sh scripts/smoke.sh
integration:
	cd apps/api && set -a && . ./.env && set +a && \
		TEST_DATABASE_URL="$${TEST_DATABASE_URL:-$$DATABASE_URL}" \
		TEST_S3_ENDPOINT="$${TEST_S3_ENDPOINT:-$$S3_ENDPOINT}" \
		TEST_S3_BUCKET="$${TEST_S3_BUCKET:-$$S3_BUCKET}" \
		TEST_S3_ACCESS_KEY="$${TEST_S3_ACCESS_KEY:-$$S3_ACCESS_KEY}" \
		TEST_S3_SECRET_KEY="$${TEST_S3_SECRET_KEY:-$$S3_SECRET_KEY}" \
		go test -race -tags=integration ./internal/platform ./tests/integration
auth-smoke:
	sh scripts/keycloak-smoke.sh
keycloak-theme:
	docker compose up -d --wait --wait-timeout 360 keycloak
	docker compose restart keycloak
	docker compose up -d --wait --wait-timeout 360 keycloak
	sh scripts/keycloak-theme.sh

.PHONY: matching-evaluation
matching-evaluation:
	sh scripts/evaluate-matching.sh
