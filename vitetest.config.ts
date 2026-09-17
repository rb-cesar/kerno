import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    globalSetup: ["./test/setup.ts"],
    testTimeout: 20_000,
  },
});
