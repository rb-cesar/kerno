import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Button } from "./button";
import { DatePicker } from "./date-picker";
import { Combobox, type ComboboxOption } from "./combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Field, FieldControl, FieldLabel } from "./field";

const members: ComboboxOption[] = [
  { value: "ana", label: "Ana Souza" },
  { value: "bruno", label: "Bruno Lima" },
  { value: "carla", label: "Carla Dias" },
];

const meta: Meta = {
  title: "Forms/DialogInputs",
};
export default meta;

type Story = StoryObj;

/** Reproduz inputs com Popover (DatePicker/Combobox) dentro de um Dialog modal. */
export const Default: Story = {
  render: () => {
    const [date, setDate] = React.useState("");
    const [who, setWho] = React.useState("");
    const [prio, setPrio] = React.useState("medium");
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button data-testid="open">Abrir card</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Card</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel>Prioridade</FieldLabel>
            <Select value={prio} onValueChange={setPrio}>
              <FieldControl>
                <SelectTrigger data-testid="prio-trigger">
                  <SelectValue />
                </SelectTrigger>
              </FieldControl>
              <SelectContent>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Prazo</FieldLabel>
            <FieldControl>
              <DatePicker value={date} onChange={setDate} />
            </FieldControl>
          </Field>
          <Field>
            <FieldLabel>Responsável</FieldLabel>
            <FieldControl>
              <Combobox value={who} onChange={setWho} options={members} placeholder="Sem responsável" />
            </FieldControl>
          </Field>
          <p data-testid="state">date={date || "—"} who={who || "—"} prio={prio}</p>
        </DialogContent>
      </Dialog>
    );
  },
};
