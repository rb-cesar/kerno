// Junta os fragmentos de schema espalhados pelos módulos numa pasta única
// (prisma/schema/), porque o Prisma gera UM client a partir de UMA pasta.
//
// Fontes da verdade:
//   - core/db/prisma/models/*.prisma          (núcleo: base + events)
//   - packages/modules/<m>/prisma/*.prisma    (cada módulo é dono dos seus models)
//
// Saída: prisma/schema/*.prisma (gerados, gitignorados). A subpasta
// prisma/schema/migrations/ é versionada e preservada entre execuções.
// Rode via `pnpm db:gather` (já encadeado em generate/migrate/push/studio/build).

import { mkdirSync, rmSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)); // packages/db/prisma
const out = join(here, "schema");
const coreModels = join(here, "models");
const modulesDir = join(here, "../../modules"); // packages/modules

function copyPrismaFrom(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".prisma"))
    .map((f) => {
      copyFileSync(join(dir, f), join(out, f));
      return f;
    });
}

// Limpa só os fragmentos .prisma; PRESERVA migrations/ — com schema multi-arquivo
// o Prisma procura as migrations DENTRO da pasta de schema (prisma/schema/migrations),
// e elas são versionadas (ver .gitignore). Apagar a pasta inteira aqui orfanava o
// histórico de migrations.
mkdirSync(out, { recursive: true });
for (const entry of readdirSync(out)) {
  if (entry.endsWith(".prisma")) rmSync(join(out, entry));
}

const gathered = [...copyPrismaFrom(coreModels)];
for (const mod of readdirSync(modulesDir)) {
  gathered.push(...copyPrismaFrom(join(modulesDir, mod, "prisma")));
}

console.log(`▸ schema reunido (${gathered.length} arquivos): ${gathered.join(", ")}`);
