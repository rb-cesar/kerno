import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Abre N janelas de navegador isoladas pra simular outros participantes numa
 * chamada — sem segunda pessoa, segundo computador ou webcam.
 *
 * Cada janela usa um `--user-data-dir` próprio (cookie jar separado = sessão
 * separada, dá pra logar com contas diferentes) e câmera/microfone sintéticos
 * do Chrome, o que evita eco entre as janelas e dispensa hardware real.
 *
 * O perfil fica no temp e sobrevive entre execuções — loga uma vez, reusa depois.
 */

const url = process.env.PEER_URL ?? "http://localhost:3000";
const count = Math.max(1, Number.parseInt(process.argv[2] ?? "1", 10) || 1);

const SEED_ACCOUNTS = ["bruno@kerno.dev", "carla@kerno.dev", "diego@kerno.dev", "elena@kerno.dev", "felipe@kerno.dev"];

const BROWSERS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe` : undefined,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((p): p is string => Boolean(p));

const browser = BROWSERS.find((p) => existsSync(p));

if (!browser) {
  console.error("Não achei o Chrome nem o Edge. Rode com CHROME_PATH=/caminho/para/chrome pnpm dev:peer");
  process.exit(1);
}

for (let i = 0; i < count; i++) {
  const profile = join(tmpdir(), `kerno-peer-${i + 1}`);
  spawn(
    browser,
    [
      `--user-data-dir=${profile}`,
      // Câmera/mic sintéticos (padrão colorido + bipe) com permissão automática:
      // sem webcam real, sem eco entre janelas, sem pop-up de permissão.
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--no-first-run",
      "--no-default-browser-check",
      "--new-window",
      url,
    ],
    { detached: true, stdio: "ignore" },
  ).unref();

  console.log(`▸ janela ${i + 1} → logue como ${SEED_ACCOUNTS[i] ?? "outra conta do seed"} / password123`);
}

console.log(`\n${count} janela(s) em ${url}, cada uma com sessão própria (${browser.split(/[/\\]/).pop()}).`);
