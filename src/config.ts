// Temporary ngrok demo setup: prefer relative /graphql so UI + API can share one ngrok URL.
// Remove once MVP is deployed with stable hosts.
const envGraphql = import.meta.env.VITE_GRAPHQL_URL?.trim();
export const graphqlEndpoint = envGraphql || "/graphql";

// Keep REST base for legacy calls (rules upsert) — falls back to VITE_API_URL, otherwise current origin or localhost.
// Temporary while rules upsert is REST; remove once everything moves to GraphQL.
const envApi = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const originApi = typeof window !== "undefined" ? window.location.origin : undefined;
export const apiBaseUrl = envApi || originApi || "http://localhost:8080";
