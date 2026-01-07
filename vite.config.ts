import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Temporary ngrok demo setup: use VITE_API_URL only for dev proxy target; UI calls /graphql relative to its origin.
  const apiUrl = env.VITE_API_URL || "http://localhost:8080";

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      proxy: {
        "/graphql": {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 3000,
      host: true,
    },
  };
});
