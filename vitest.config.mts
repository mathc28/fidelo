import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    },
  },
});
