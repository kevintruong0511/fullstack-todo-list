COMPOSE = docker compose -f infrastructure/docker-compose.yml

.PHONY: help up up-d down down-v build rebuild restart logs logs-be logs-fe logs-db ps shell-be shell-fe shell-db clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Start all services (foreground, with build)
	$(COMPOSE) up --build

up-d: ## Start all services (detached)
	$(COMPOSE) up --build -d

down: ## Stop all services (keep data)
	$(COMPOSE) down

down-v: ## Stop all services AND wipe postgres data
	$(COMPOSE) down -v

build: ## Build images without starting
	$(COMPOSE) build

rebuild: ## Rebuild images from scratch (no cache)
	$(COMPOSE) build --no-cache

restart: ## Restart all services
	$(COMPOSE) restart

logs: ## Tail logs from all services
	$(COMPOSE) logs -f

logs-be: ## Tail backend logs
	$(COMPOSE) logs -f be

logs-fe: ## Tail frontend logs
	$(COMPOSE) logs -f fe

logs-db: ## Tail postgres logs
	$(COMPOSE) logs -f postgres

ps: ## List running services
	$(COMPOSE) ps

shell-be: ## Open shell in backend container
	$(COMPOSE) exec be sh

shell-fe: ## Open shell in frontend container
	$(COMPOSE) exec fe sh

shell-db: ## Open psql in postgres container
	$(COMPOSE) exec postgres psql -U postgres -d todo_db

clean: ## Stop, remove volumes and prune dangling images
	$(COMPOSE) down -v
	docker image prune -f
