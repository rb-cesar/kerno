import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Calendar } from "./calendar";

const meta: Meta<typeof Calendar> = {
  title: "Inputs/Calendar",
  component: Calendar,
};
export default meta;

type Story = StoryObj<typeof Calendar>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    return <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />;
  },
};
