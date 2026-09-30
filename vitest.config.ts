import { fileURLToPath } from "node:url";
import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // O tsconfig usa `jsx: "preserve"` (o Next é quem transforma o JSX); o Vitest precisa
  // transformar por conta própria para poder renderizar componentes nos testes.
  oxc: { jsx: { runtime: "automatic" } },
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
