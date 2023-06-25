"use client";

import { ChatBubble } from "react-daisyui";

/*
This component is called by the GPT model to render a PlainText chat bubble component. It is defined by this JSON structure:
{
  name: "render_plain_text",
  description: "Render a ReactJS/Tailwind/DaisyUI PlainText chat bubble component",
  parameters: {
    type: "object",
    properties: {
      value: {
        type: "string",
        description: "The content of the plaintext chat message."
      }
    }
  }
}
*/
interface PlainTextArgs {
  value: string;
  user?: boolean;
}

export default function PlainText(args: PlainTextArgs): JSX.Element {
  const { value, user } = args;

  return (
    <ChatBubble end={user}>
      <ChatBubble.Message>
        {value}
      </ChatBubble.Message>
    </ChatBubble>
  );
}
