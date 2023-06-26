"use client";

import { Button as DaisyButton } from "react-daisyui";

/*
This component is called by the GPT model to render one or more Button components. It is defined by this JSON structure:
{
  name: "render_buttons",
  description:
    "Create a row of one or more interactive buttons. Essentially useful for responses requiring user's choice among multiple options.",
  parameters: {
    type: "object",
    properties: {
      elements: {
        description: "One or more button(s) to render.",
        type: "array",
        items: {
          type: "object",
          description: "A button to render.",
          properties: {
            id: {
              type: "string",
              description:
                "A unique identifier per button; matches the return value when this button is clicked.",
            },
            label: {
              type: "string",
              description: "The display text on the button.",
            },
            value: {
              type: "string",
              description:
                "The return value when the corresponding button is clicked.",
            },
            colorTheme: {
              type: "string",
              enum: [
                "default",
                "primary",
                "secondary",
                "accent",
                "error",
                "info",
                "success",
                "warning",
              ],
              description: "The theme color of the button.",
            },
          },
          required: ["id", "label", "value", "colorTheme"],
        },
      },
    },
    required: ["elements"],
  },
}
*/
interface ButtonsArgs {
  elements: ButtonArgs[];
  onClick: ({ id, value }: { id: string; value: string }) => void;
}

interface ButtonArgs {
  colorTheme:
    | "primary"
    | "secondary"
    | "accent"
    | "info"
    | "success"
    | "warning"
    | "error";
  id: string;
  label: string;
  value: string;
  onClick: ({ id, value }: { id: string; value: string }) => void;
}

const renderButton = (args: ButtonArgs) => {
  const { colorTheme, id, label, value, onClick } = args;

  return (
    <DaisyButton
      color={colorTheme}
      key={id}
      onClick={() => onClick({ id, value })}
    >
      {label}
    </DaisyButton>
  );
};

export default function Buttons(args: ButtonsArgs): JSX.Element {
  const { elements, onClick } = args;

  return (
    <div className="flex w-full flex-row items-start justify-start space-x-4 py-4">
      {elements.map(element => renderButton({ ...element, onClick }))}
    </div>
  );
}
