"use client";

import { Button as DaisyButton } from "react-daisyui";

/*
This component is called by the GPT model to render a Button component. It is defined by this JSON structure:
{
  name: "render_button",
  description: "Render a ReactJS/Tailwind/DaisyUI Button component",
  parameters: {
    type: "object",
    properties: {
      color: {
        type: "string",
        enum: ["default", "accent", "error", "ghost", "info", "primary", "secondary", "success", "warning"],
        description: "The theme indicator to use based on usage and/or severity.",
      },
      id: {
        type: "string",
        description: "A unique identifier that will let you match a return value back to this exact rendering."
      },
      label: {
        type: "string",
        description: "The text value to show on the Button."
      },
      value: {
        type: "string",
        description: "What to return if/when the button is clicked. When paired with the id parameter."
      }
    }
  }
}
*/
interface ButtonArgs {
  color:
    | "primary"
    | "secondary"
    | "accent"
    | "ghost"
    | "info"
    | "success"
    | "warning"
    | "error"
    | undefined;
  key: string;
  label: string;
  value: string;
}

export default function Button(args: ButtonArgs): JSX.Element {
  const { color, key, label, value } = args;

  return (
    <DaisyButton
      color={color}
      key={key}
      onClick={() => console.log(value)}
    >
      {label}
    </DaisyButton>
  );
}
