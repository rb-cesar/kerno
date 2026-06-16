// Junta os fragmentos de schema espalhados pelos módulos numa pasta única
// (prisma/schema/), porque o Prisma gera UM client a partir de UMA pasta.
//
// Fontes da verdade:
//   - core/db/prisma/models/*.prisma          (núcleo: base + events)
//   - packages/modules/<m>/prisma/*.prisma    (cada módulo é dono dos seus models)
//
// Saída: prisma/schema/ (gerada, gitignorada). Rode via `pnpm db:gather`
// (já encadeado em generate/migrate/push/studio/build).

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

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const gathered = [...copyPrismaFrom(coreModels)];
for (const mod of readdirSync(modulesDir)) {
  gathered.push(...copyPrismaFrom(join(modulesDir, mod, "prisma")));
}

console.log(`▸ schema reunido (${gathered.length} arquivos): ${gathered.join(", ")}`);
