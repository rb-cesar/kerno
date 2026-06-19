import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field, FieldControl, FieldError, FieldHint, FieldLabel } from "./field";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const meta: Meta<typeof Field> = {
  title: "Forms/Field",
  component: Field,
};
export default meta;

type Story = StoryObj<typeof Field>;

export const ComInput: Story = {
  render: () => (
    <div className="w-72">
      <Field>
        <FieldLabel>Nome do projeto</FieldLabel>
        <FieldControl>
          <Input placeholder="Ex.: Kerno" />
        </FieldControl>
        <FieldHint>Aparece na barra lateral.</FieldHint>
      </Field>
    </div>
  ),
};

export const ComErro: Story = {
  render: () => (
    <div className="w-72">
      <Field invalid>
        <FieldLabel>E-mail</FieldLabel>
        <FieldControl>
          <Input type="email" defaultValue="invalido" />
        </FieldControl>
        <FieldError>Informe um e-mail válido.</FieldError>
      </Field>
    </div>
  ),
};

// Controle customizado (Select) recebendo o wiring via useField + FieldControl no gatilho.
export const ComSelect: Story = {
  render: () => (
    <div className="w-72">
      <Field>
        <FieldLabel>Prioridade</FieldLabel>
        <Select defaultValue="medium">
          <FieldControl>
            <SelectTrigger>
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
    </div>
  ),
};
