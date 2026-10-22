import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@repo": path.resolve(import.meta.dirname, "../../packages"),
      // The admin client is server-only; tests run outside React's server.
      "server-only": path.resolve(import.meta.dirname, "./scripts/empty.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
