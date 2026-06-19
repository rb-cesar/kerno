import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Combobox, type ComboboxOption } from "./combobox";

const members: ComboboxOption[] = [
  { value: "ana", label: "Ana Souza" },
  { value: "bruno", label: "Bruno Lima" },
  { value: "carla", label: "Carla Dias" },
  { value: "diego", label: "Diego Alves" },
  { value: "elisa", label: "Elisa Martins" },
];

const meta: Meta<typeof Combobox> = {
  title: "Inputs/Combobox",
  component: Combobox,
};
export default meta;

type Story = StoryObj<typeof Combobox>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = React.useState("");
    return (
      <div className="w-64">
        <Combobox
          options={members}
          value={value}
          onChange={setValue}
          placeholder="Sem responsável"
          searchPlaceholder="Buscar pessoa…"
        />
      </div>
    );
  },
};

export const Preenchido: Story = {
  render: () => {
    const [value, setValue] = React.useState("bruno");
    return (
      <div className="w-64">
        <Combobox options={members} value={value} onChange={setValue} />
      </div>
    );
  },
};
