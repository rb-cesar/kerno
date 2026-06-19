import type { Meta, StoryObj } from "@storybook/react-vite";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Label } from "./label";

const meta: Meta<typeof RadioGroup> = {
  title: "Inputs/RadioGroup",
  component: RadioGroup,
};
export default meta;

type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="member">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="member" id="r-member" />
        <Label htmlFor="r-member">Membro</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="admin" id="r-admin" />
        <Label htmlFor="r-admin">Admin</Label>
      </div>
    </RadioGroup>
  ),
};
