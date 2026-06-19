import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DatePicker } from "./date-picker";

const meta: Meta<typeof DatePicker> = {
  title: "Inputs/DatePicker",
  component: DatePicker,
};
export default meta;

type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = React.useState("");
    return (
      <div className="w-64 space-y-2">
        <DatePicker value={value} onChange={setValue} />
        <p className="text-xs text-muted-foreground">Valor ISO: {value || "—"}</p>
      </div>
    );
  },
};

export const Preenchido: Story = {
  render: () => {
    const [value, setValue] = React.useState("2026-06-19");
    return (
      <div className="w-64">
        <DatePicker value={value} onChange={setValue} />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-64">
      <DatePicker disabled value="2026-06-19" />
    </div>
  ),
};
