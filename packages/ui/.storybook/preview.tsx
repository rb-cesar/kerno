import * as React from "react";
import type { Preview } from "@storybook/react-vite";
import "./preview.css";

/**
 * Toggle de tema (claro/escuro) na toolbar — aplica a classe `.dark` no wrapper,
 * como o app faz, validando os componentes nos dois temas.
 */
const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  globalTypes: {
    theme: {
      description: "Tema",
      defaultValue: "light",
      toolbar: {
        title: "Tema",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Claro" },
          { value: "dark", title: "Escuro" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as string;
      return (
        <div className={theme === "dark" ? "dark" : ""}>
          <div className="bg-background text-foreground p-8">
            <Story />
          </div>
        </div>
      );
    },
  ],
};

export default preview;
