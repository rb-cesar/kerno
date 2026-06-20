/**
 * Catálogo de temas do Kerno.
 *
 * A definição real das cores vive em `app/globals.css` (um bloco de CSS
 * variables por tema, sob a classe `.<id>`). Aqui ficam apenas os metadados
 * usados pela UI do seletor (rótulo, grupo e as cores do mini-preview).
 *
 * Cada tema controla, além das superfícies base, duas superfícies de "chrome"
 * próprias — a barra de hubs (`--sidebar-*`) e o header (`--header-*`) — no
 * modelo em camadas do Discord (a barra costuma ser a superfície mais distinta).
 *
 * Para adicionar um tema novo: criar o bloco `.<id> { ... }` no globals.css,
 * adicionar a entrada aqui — e pronto. O `ThemeProvider` deriva a lista de
 * temas válidos de `THEME_IDS`, e o `tailwind.config` usa isso no safelist.
 */

export type ThemeGroup = "Claro" | "Escuro";

export type ThemeMeta = {
  /** id = classe aplicada no <html> e chave persistida no localStorage. */
  id: string;
  label: string;
  description: string;
  group: ThemeGroup;
  /**
   * Cores do mini-preview no seletor (não afetam o tema aplicado).
   * Refletem as superfícies reais: fundo, barra de hubs, header, acento e texto.
   */
  swatch: {
    bg: string;
    sidebar: string;
    header: string;
    accent: string;
    fg: string;
  };
};

export const THEMES: ThemeMeta[] = [
  // ----------------------------- Escuros -----------------------------
  {
    id: "dark",
    label: "Escuro",
    description: "Cinza grafite neutro. O padrão do Kerno.",
    group: "Escuro",
    swatch: {
      bg: "hsl(0 0% 3.9%)",
      sidebar: "hsl(0 0% 9%)",
      header: "hsl(0 0% 5.5%)",
      accent: "hsl(0 0% 98%)",
      fg: "hsl(0 0% 63.9%)",
    },
  },
  {
    id: "onyx",
    label: "Ônix",
    description: "Preto puro, ideal para telas OLED.",
    group: "Escuro",
    swatch: {
      bg: "hsl(0 0% 0%)",
      sidebar: "hsl(0 0% 4%)",
      header: "hsl(0 0% 4%)",
      accent: "hsl(0 0% 98%)",
      fg: "hsl(0 0% 60%)",
    },
  },
  {
    id: "slate",
    label: "Ardósia",
    description: "Cinza-azulado quase monocromático. Minimalista.",
    group: "Escuro",
    swatch: {
      bg: "hsl(215 25% 11%)",
      sidebar: "hsl(215 28% 8%)",
      header: "hsl(215 25% 10%)",
      accent: "hsl(215 15% 88%)",
      fg: "hsl(215 12% 60%)",
    },
  },
  {
    id: "ash",
    label: "Cinza",
    description: "Cinza médio, contraste suave.",
    group: "Escuro",
    swatch: {
      bg: "hsl(220 8% 18%)",
      sidebar: "hsl(220 9% 13%)",
      header: "hsl(220 8% 21%)",
      accent: "hsl(220 14% 96%)",
      fg: "hsl(220 9% 70%)",
    },
  },
  {
    id: "midnight",
    label: "Meia-noite",
    description: "Azul-marinho com barra de hubs blurple.",
    group: "Escuro",
    swatch: {
      bg: "hsl(230 25% 9%)",
      sidebar: "hsl(235 35% 12%)",
      header: "hsl(230 24% 12%)",
      accent: "hsl(235 86% 65%)",
      fg: "hsl(225 15% 68%)",
    },
  },
  {
    id: "tokyo",
    label: "Tokyo Night",
    description: "Neon de Tóquio: azul e roxo sobre azul profundo.",
    group: "Escuro",
    swatch: {
      bg: "hsl(235 19% 13%)",
      sidebar: "hsl(240 14% 10%)",
      header: "hsl(235 18% 11%)",
      accent: "hsl(221 89% 72%)",
      fg: "hsl(229 35% 70%)",
    },
  },
  {
    id: "dracula",
    label: "Drácula",
    description: "Roxo e rosa sobre fundo violeta-escuro.",
    group: "Escuro",
    swatch: {
      bg: "hsl(231 15% 18%)",
      sidebar: "hsl(232 16% 12%)",
      header: "hsl(232 14% 22%)",
      accent: "hsl(265 89% 78%)",
      fg: "hsl(326 100% 74%)",
    },
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
    description: "Pastel aconchegante com acento malva.",
    group: "Escuro",
    swatch: {
      bg: "hsl(240 21% 15%)",
      sidebar: "hsl(240 23% 9%)",
      header: "hsl(240 21% 12%)",
      accent: "hsl(267 84% 81%)",
      fg: "hsl(228 24% 72%)",
    },
  },
  {
    id: "rosepine",
    label: "Rosé Pine",
    description: "Rosé e ouro suaves sobre fundo violeta.",
    group: "Escuro",
    swatch: {
      bg: "hsl(249 22% 12%)",
      sidebar: "hsl(249 24% 9%)",
      header: "hsl(248 24% 13%)",
      accent: "hsl(267 57% 78%)",
      fg: "hsl(248 15% 61%)",
    },
  },
  {
    id: "nord",
    label: "Nord",
    description: "Azul-acinzentado frio, paleta ártica.",
    group: "Escuro",
    swatch: {
      bg: "hsl(220 16% 22%)",
      sidebar: "hsl(220 18% 16%)",
      header: "hsl(222 16% 26%)",
      accent: "hsl(193 43% 67%)",
      fg: "hsl(213 32% 52%)",
    },
  },
  {
    id: "forest",
    label: "Floresta",
    description: "Verde esmeralda com barra de hubs profunda.",
    group: "Escuro",
    swatch: {
      bg: "hsl(150 15% 8%)",
      sidebar: "hsl(150 22% 5%)",
      header: "hsl(150 14% 11%)",
      accent: "hsl(142 65% 55%)",
      fg: "hsl(145 12% 65%)",
    },
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
    description: "Retrô e quente: creme, amarelo e laranja.",
    group: "Escuro",
    swatch: {
      bg: "hsl(24 7% 16%)",
      sidebar: "hsl(195 8% 12%)",
      header: "hsl(24 8% 13%)",
      accent: "hsl(43 95% 58%)",
      fg: "hsl(43 40% 70%)",
    },
  },
  {
    id: "synthwave",
    label: "Synthwave",
    description: "Neon vibrante: rosa e ciano, barra de hubs roxa.",
    group: "Escuro",
    swatch: {
      bg: "hsl(252 44% 12%)",
      sidebar: "hsl(280 55% 18%)",
      header: "hsl(315 55% 16%)",
      accent: "hsl(330 100% 62%)",
      fg: "hsl(285 25% 75%)",
    },
  },
  {
    id: "onedark",
    label: "One Dark",
    description: "Slate-azulado com acentos multicoloridos suaves (Atom).",
    group: "Escuro",
    swatch: {
      bg: "hsl(220 13% 18%)",
      sidebar: "hsl(216 14% 14%)",
      header: "hsl(220 13% 16%)",
      accent: "hsl(207 82% 66%)",
      fg: "hsl(219 14% 71%)",
    },
  },
  {
    id: "palenight",
    label: "Palenight",
    description: "Índigo profundo com pastéis violeta e azul.",
    group: "Escuro",
    swatch: {
      bg: "hsl(229 20% 20%)",
      sidebar: "hsl(230 22% 14%)",
      header: "hsl(229 21% 17%)",
      accent: "hsl(276 68% 75%)",
      fg: "hsl(229 33% 73%)",
    },
  },
  {
    id: "kanagawa",
    label: "Kanagawa",
    description: "Tinta japonesa: base sumi com acentos dessaturados.",
    group: "Escuro",
    swatch: {
      bg: "hsl(240 13% 14%)",
      sidebar: "hsl(240 14% 10%)",
      header: "hsl(240 13% 12%)",
      accent: "hsl(220 50% 67%)",
      fg: "hsl(48 30% 79%)",
    },
  },
  {
    id: "amber-dark",
    label: "Âmbar",
    description: "Preto neutro com acento amarelo de alto contraste.",
    group: "Escuro",
    swatch: {
      bg: "hsl(0 0% 5%)",
      sidebar: "hsl(0 0% 8%)",
      header: "hsl(0 0% 7%)",
      accent: "hsl(48 96% 53%)",
      fg: "hsl(45 15% 65%)",
    },
  },
  {
    id: "crimson",
    label: "Carmim",
    description: "Preto e branco com acento vermelho intenso.",
    group: "Escuro",
    swatch: {
      bg: "hsl(0 0% 5%)",
      sidebar: "hsl(0 0% 8%)",
      header: "hsl(0 0% 7%)",
      accent: "hsl(0 84% 55%)",
      fg: "hsl(0 0% 80%)",
    },
  },
  {
    id: "lime-dark",
    label: "Lima",
    description: "Preto neutro com acento verde vivo.",
    group: "Escuro",
    swatch: {
      bg: "hsl(0 0% 5%)",
      sidebar: "hsl(0 0% 8%)",
      header: "hsl(0 0% 7%)",
      accent: "hsl(142 70% 48%)",
      fg: "hsl(140 10% 65%)",
    },
  },
  // ----------------------------- Claros -----------------------------
  {
    id: "light",
    label: "Claro",
    description: "Branco neutro, alto contraste.",
    group: "Claro",
    swatch: {
      bg: "hsl(0 0% 100%)",
      sidebar: "hsl(0 0% 96.5%)",
      header: "hsl(0 0% 100%)",
      accent: "hsl(0 0% 9%)",
      fg: "hsl(0 0% 45.1%)",
    },
  },
  {
    id: "dawn",
    label: "Aurora",
    description: "Tom creme quente com acento rosé.",
    group: "Claro",
    swatch: {
      bg: "hsl(30 40% 98%)",
      sidebar: "hsl(30 35% 93%)",
      header: "hsl(0 0% 100%)",
      accent: "hsl(346 77% 50%)",
      fg: "hsl(25 10% 45%)",
    },
  },
  {
    id: "solarized",
    label: "Solar",
    description: "Bege Solarized com acento azul.",
    group: "Claro",
    swatch: {
      bg: "hsl(44 87% 94%)",
      sidebar: "hsl(44 33% 86%)",
      header: "hsl(45 60% 97%)",
      accent: "hsl(205 69% 49%)",
      fg: "hsl(175 59% 40%)",
    },
  },
  {
    id: "coffee",
    label: "Café",
    description: "Creme claro com chrome marrom espresso.",
    group: "Claro",
    swatch: {
      bg: "hsl(35 40% 96%)",
      sidebar: "hsl(25 35% 16%)",
      header: "hsl(25 35% 20%)",
      accent: "hsl(25 65% 42%)",
      fg: "hsl(28 18% 42%)",
    },
  },
  {
    id: "amber-light",
    label: "Âmbar Claro",
    description: "Branco neutro com acento amarelo de alto contraste.",
    group: "Claro",
    swatch: {
      bg: "hsl(0 0% 100%)",
      sidebar: "hsl(0 0% 97%)",
      header: "hsl(0 0% 100%)",
      accent: "hsl(43 96% 45%)",
      fg: "hsl(0 0% 40%)",
    },
  },
  {
    id: "lime-light",
    label: "Lima Claro",
    description: "Branco neutro com acento verde vivo.",
    group: "Claro",
    swatch: {
      bg: "hsl(0 0% 100%)",
      sidebar: "hsl(0 0% 97%)",
      header: "hsl(0 0% 100%)",
      accent: "hsl(142 72% 34%)",
      fg: "hsl(0 0% 40%)",
    },
  },
  {
    id: "carmim-light",
    label: "Carmim Claro",
    description: "Branco neutro com acento vermelho intenso.",
    group: "Claro",
    swatch: {
      bg: "hsl(0 0% 100%)",
      sidebar: "hsl(0 0% 97%)",
      header: "hsl(0 0% 100%)",
      accent: "hsl(0 80% 50%)",
      fg: "hsl(0 0% 40%)",
    },
  },
  {
    id: "latte",
    label: "Latte",
    description: "Claro pastel multicolorido e suave (Catppuccin Latte).",
    group: "Claro",
    swatch: {
      bg: "hsl(220 23% 95%)",
      sidebar: "hsl(220 22% 92%)",
      header: "hsl(220 23% 97%)",
      accent: "hsl(266 85% 58%)",
      fg: "hsl(233 10% 47%)",
    },
  },
  {
    id: "tokyoday",
    label: "Tokyo Day",
    description: "Versão clara do Tokyo Night, azul vibrante.",
    group: "Claro",
    swatch: {
      bg: "hsl(225 12% 90%)",
      sidebar: "hsl(223 26% 85%)",
      header: "hsl(225 20% 95%)",
      accent: "hsl(214 82% 55%)",
      fg: "hsl(231 18% 50%)",
    },
  },
];

export const THEME_IDS = THEMES.map((t) => t.id);

export const DEFAULT_THEME = "dark";

/** Temas agrupados na ordem em que devem aparecer no seletor. */
export const THEME_GROUPS: { group: ThemeGroup; themes: ThemeMeta[] }[] = [
  { group: "Escuro", themes: THEMES.filter((t) => t.group === "Escuro") },
  { group: "Claro", themes: THEMES.filter((t) => t.group === "Claro") },
];
