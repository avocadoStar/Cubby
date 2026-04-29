.PHONY: dev dev-frontend dev-backend build build-frontend build-backend clean

dev:
	@echo "Run 'make dev-backend' and 'make dev-frontend' in separate terminals."

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && go run ./cmd/server

build-frontend:
	cd frontend && npm run build

build-backend:
	cd backend && go build -o ../cubby ./cmd/server

build: build-frontend build-backend

clean:
	rm -rf cubby backend/cubby frontend/dist backend/cmd/server/static/assets backend/cmd/server/static/index.html
