import { auth } from "@/auth";

const API_URL = process.env.API_URL ?? "http://localhost:3333/api";

/**
 * A API respondeu 401: a sessão não tem um token válido (expirado, ou anterior a
 * uma mudança/reset que invalidou o usuário). Quem chama pode tratar para pedir
 * novo login em vez de mostrar um erro genérico.
 */
export class SessionExpiredError extends Error {
  constructor() {
    super("Sessão expirada");
    this.name = "SessionExpiredError";
  }
}

/**
 * Chama a API (NestJS) a partir do servidor do web (BFF). Anexa o JWT da sessão
 * NextAuth como Bearer. Lança em falha de conexão ou resposta não-2xx — quem
 * chama decide o fallback. A causa real é logada no terminal do web.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await auth();
  const token = session?.apiToken;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (cause) {
    console.error(
      `[api-client] Não consegui conectar em ${API_URL}${path}. A API (NestJS, :3333) está rodando? Use "pnpm dev" na raiz para subir web + api juntos.`,
      cause,
    );
    throw new Error("API inacessível");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) {
      console.error(
        `[api-client] 401 em ${path}. Sessão sem token válido da API — faça logout e login de novo (a sessão pode ser anterior a uma mudança/reset de auth).`,
      );
      throw new SessionExpiredError();
    }
    console.error(`[api-client] API respondeu ${res.status} em ${path}: ${body}`);
    throw new Error(`API ${res.status}`);
  }

  return (await res.json()) as T;
}
