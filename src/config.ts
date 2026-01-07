// Temporary ngrok demo setup: prefer relative /graphql so UI + API can share one ngrok URL.
// Remove once MVP is deployed with stable hosts.
const envGraphql = import.meta.env.VITE_GRAPHQL_URL?.trim();
export const graphqlEndpoint = envGraphql || "/graphql";

// Keep REST base for legacy calls (rules upsert/update/delete) — prefer VITE_API_URL.
// In prod, fall back to current origin; in dev, default to localhost backend.
// Temporary while rules upsert/update/delete are REST; remove once everything moves to GraphQL.
const envApi = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const originApi = typeof window !== "undefined" ? window.location.origin : undefined;
const isLocalUi = typeof window !== "undefined" && window.location.hostname === "localhost";
export const apiBaseUrl = envApi || (!isLocalUi && originApi) || "http://localhost:8080";
