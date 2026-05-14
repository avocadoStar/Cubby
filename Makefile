.PHONY: dev dev-backend dev-frontend build build-backend build-frontend run clean

dev-backend:
	cd backend && go run ./cmd/server

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "Run 'make dev-backend' and 'make dev-frontend' in separate terminals"

build-backend:
	cd backend && go build -o ../cubby-server ./cmd/server

build-frontend:
	cd frontend && npm run build

build: build-backend build-frontend
	@echo "Build complete: ./cubby-server"

run: build
	./cubby-server

clean:
	rm -rf cubby-server frontend/dist
