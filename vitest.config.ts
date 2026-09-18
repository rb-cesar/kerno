import { fileURLToPath } from "node:url";
import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
