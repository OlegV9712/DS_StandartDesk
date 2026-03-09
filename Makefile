.PHONY: help build up down restart logs clean build-backend build-frontend ps env

help:
	@echo "StandartDesk Docker Commands"
	@echo "============================"
	@echo ""
	@echo "make build              - Build Docker images"
	@echo "make up                 - Start all services"
	@echo "make down               - Stop all services"
	@echo "make restart            - Restart all services"
	@echo "make logs               - View all service logs"
	@echo "make logs-backend       - View backend logs"
	@echo "make logs-frontend      - View frontend logs"
	@echo "make logs-db            - View database logs"
	@echo "make ps                 - Show running containers"
	@echo "make clean              - Remove containers and volumes"
	@echo "make build-backend      - Build backend image only"
	@echo "make build-frontend     - Build frontend image only"
	@echo "make shell-backend      - Open shell in backend container"
	@echo "make shell-postgres     - Open postgres shell in DB container"
	@echo "make test               - Run tests in backend"
	@echo "make env                - Create .env file from .env.example"
	@echo ""

# Setup
env:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ Created .env file (configure it before running)"; \
	else \
		echo "⚠️  .env file already exists"; \
	fi

# Build
build: env
	@echo "🔨 Building Docker images..."
	docker compose build

build-backend:
	@echo "🔨 Building backend image..."
	docker compose build backend

build-frontend:
	@echo "🔨 Building frontend image..."
	docker compose build frontend

# Container management
up: env
	@echo "🚀 Starting StandartDesk..."
	docker compose up -d
	@echo ""
	@echo "✅ Services started:"
	@echo "   Frontend:  http://localhost:3000"
	@echo "   Backend:   http://localhost:5000"
	@echo "   Database:  localhost:5432"
	@echo ""

down:
	@echo "⛔ Stopping StandartDesk..."
	docker compose down

restart:
	@echo "🔄 Restarting services..."
	docker compose restart

ps:
	@echo "📊 Running containers:"
	docker compose ps

# Logs
logs:
	@docker compose logs -f

logs-backend:
	@docker compose logs -f backend

logs-frontend:
	@docker compose logs -f frontend

logs-db:
	@docker compose logs -f postgres

# Shell access
shell-backend:
	@echo "Opening shell in backend container..."
	docker compose exec backend /bin/sh

shell-postgres:
	@echo "Opening postgres shell..."
	docker compose exec postgres psql -U postgres -d standart_desk

# Testing
test:
	@echo "🧪 Running tests in backend..."
	docker compose exec backend dotnet test

# Cleanup
clean:
	@echo "🧹 Cleaning up Docker resources..."
	docker compose down -v
	@echo "✅ Cleaned up containers and volumes"

# Health check
status:
	@echo "🏥 Service health status:"
	@docker compose ps --format "table {{.Names}}\t{{.Status}}"

# Production build
build-prod: clean build
	@echo "✅ Production build complete"

# Full reset
reset: down
	@echo "🔄 Resetting project..."
	docker compose down -v
	docker system prune -f
	@echo "✅ Project reset complete"

# Development setup
dev-setup: env build up logs-backend
	@echo "✅ Development environment ready"
