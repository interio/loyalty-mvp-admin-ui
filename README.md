# Loyalty MVP Admin UI

React admin panel for the loyalty platform. This repo is scaffold-ready; place it alongside `loyalty-mvp-backend` and `loyalty-mvp-infra`.

## Local development (once scaffolded)
- Install deps: `npm install`.
- Run dev server: `VITE_API_URL=http://localhost:8080 npm run dev -- --host --port 3000`.
- Build: `npm run build`.
- Preview built app: `npm run preview`.

The infra repo contains Docker Compose to run the UI alongside the backend and Postgres.

## Stack
- React + TypeScript + Vite + React Router.
- MUI with Heineken-inspired palette.
- Apollo Client pre-wired to `VITE_API_URL`/`/graphql`.
- Dummy SSO (replaceable with Entra later), protected routes, persistent layout with nav.

## Docker
```
docker build -t loyalty-admin-ui .
docker run -p 3000:3000 -e VITE_API_URL=http://backend:8080 loyalty-admin-ui
```
