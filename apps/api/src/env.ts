// Carrega o .env da raiz do monorepo ANTES de qualquer módulo que leia env
// (JwtModule lê AUTH_SECRET no carregamento). Importado como 1ª linha do main.
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../../../.env") });
