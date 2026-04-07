# Loyalty MVP Admin UI

React admin panel for the loyalty platform. Place it alongside `loyalty-mvp-backend` and `loyalty-mvp-infra`.

## Local development
- Install deps: `npm install`.
- Run dev server against Docker backend (`http://localhost:8080`): `VITE_API_URL=http://localhost:8080 npm run dev -- --host --port 3000`.
- Run dev server against local `dotnet run`/`dotnet watch` backend (launch profile default `http://localhost:5137`): `VITE_API_URL=http://localhost:5137 VITE_GRAPHQL_URL=http://localhost:5137/graphql npm run dev -- --host --port 3000`.
- Build: `npm run build`.
- Preview built app: `npm run preview`.

The infra repo contains Docker Compose to run the UI alongside the backend and Postgres.

## Container-first commands (recommended)
From this repo root (`loyalty-mvp-admin-ui`):
```
# Dev server against backend service in infra Docker network
docker run --rm -it \
  --network=loyalty-mvp-infra_loyalty \
  -e VITE_API_URL=http://backend:8080 \
  -v "$PWD":/src \
  -w /src \
  -p 3000:3000 \
  node:20-alpine \
  sh -lc "npm install && npm run dev -- --host --port 3000"

# Production build
docker run --rm \
  -v "$PWD":/src \
  -w /src \
  node:20-alpine \
  sh -lc "npm install && npm run build"
```
If your backend runs on host `localhost:5137` (outside Docker), use `host.docker.internal` from the container:
`VITE_API_URL=http://host.docker.internal:5137 VITE_GRAPHQL_URL=http://host.docker.internal:5137/graphql`.

## Stack
- React + TypeScript + Vite + React Router.
- MUI with Heineken-inspired palette.
- Apollo Client defaults to `/graphql` (same-origin/proxy friendly); optional override via `VITE_GRAPHQL_URL`.
- REST calls use `VITE_API_URL` (fallback: current origin in non-localhost, otherwise `http://localhost:8080`).
- Dummy SSO (replaceable with Entra later), protected routes, persistent layout with nav.
- List views use server-side pagination and search via GraphQL `page` + `pageSize` queries (optional `search`).

## Docker
```
docker build -t loyalty-admin-ui .
docker run -p 3000:3000 loyalty-admin-ui
```
The container serves static assets via Nginx and proxies `/graphql` and `/api/*` to `http://backend:8080` (see `nginx.conf`).
For local Docker usage, run it alongside the backend container named `backend` (recommended: `../loyalty-mvp-infra/dev.sh stack`), or update `nginx.conf` for a different upstream.
