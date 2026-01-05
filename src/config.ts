export const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8080";
export const graphqlEndpoint = `${apiBaseUrl}/graphql`;
