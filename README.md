# Loyalty MVP Admin UI

React admin panel for the loyalty platform. This repo is scaffold-ready; place it alongside `loyalty-mvp-backend` and `loyalty-mvp-infra`.

## Local development (once scaffolded)
- Install deps: `npm install`.
- Run dev server: `VITE_GRAPHQL_URL=http://localhost:8080/graphql VITE_API_URL=http://localhost:8080 npm run dev -- --host --port 3000`.
- Build: `npm run build`.
- Preview built app: `npm run preview`.

The infra repo contains Docker Compose to run the UI alongside the backend and Postgres.

## Stack
- React + TypeScript + Vite + React Router.
- MUI with Heineken-inspired palette.
- Apollo Client pre-wired to `VITE_GRAPHQL_URL` (or `/graphql` when served behind a same-origin proxy).
- Dummy SSO (replaceable with Entra later), protected routes, persistent layout with nav.

## Docker
```
docker build -t loyalty-admin-ui .
docker run -p 3000:3000 loyalty-admin-ui
```
The container serves static assets via Nginx and proxies `/graphql` and `/api/*` to `http://backend:8080` (see `nginx.conf`). For local Docker usage, run it alongside the backend container named `backend` (or update `nginx.conf`).
