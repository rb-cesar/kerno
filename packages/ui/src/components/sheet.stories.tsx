import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Field, FieldControl, FieldLabel } from "./field";
import { Input } from "./input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

const meta: Meta<typeof Sheet> = {
  title: "Overlays/Sheet",
  component: Sheet,
};
export default meta;

type Story = StoryObj<typeof Sheet>;

export const Right: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Abrir tarefa</Button>
      </SheetTrigger>
      <SheetContent className="p-6">
        <SheetHeader>
          <SheetTitle>KERN-123</SheetTitle>
          <SheetDescription>Painel lateral de detalhe da tarefa.</SheetDescription>
        </SheetHeader>
        <Field>
          <FieldLabel>Título</FieldLabel>
          <FieldControl>
            <Input defaultValue="Implementar login" />
          </FieldControl>
        </Field>
      </SheetContent>
    </Sheet>
  ),
};
