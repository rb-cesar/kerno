import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta: Meta<typeof Select> = {
  title: "Inputs/Select",
  component: Select,
};
export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <div className="w-64">
      <Select defaultValue="medium">
        <SelectTrigger>
          <SelectValue placeholder="Selecionar prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="urgent">Urgente</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="medium">Média</SelectItem>
          <SelectItem value="low">Baixa</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <div className="w-64">
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Selecionar responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Time</SelectLabel>
            <SelectItem value="ana">Ana Souza</SelectItem>
            <SelectItem value="bruno">Bruno Lima</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="none">Sem responsável</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-64">
      <Select disabled defaultValue="medium">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="medium">Média</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
