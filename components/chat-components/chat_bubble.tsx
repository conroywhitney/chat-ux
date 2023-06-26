"use client";

import { nanoid } from "@/lib/utils";
import { ChatBubble as DaisyChatBubble } from "react-daisyui";

/*
This component is called by the GPT model to render a ChatBubble chat bubble component. It is defined by this JSON structure:
{
  name: "render_chat_bubble",
  description:
    "Displays a textual message. Use for providing information, instructions, or responses that don't require user interaction.",
  parameters: {
    type: "object",
    properties: {
      value: {
        type: "string",
        description: "The content of the plaintext message.",
      },
    },
    required: ["value"],
  },
}
*/
interface ChatBubbleArgs {
  value: string;
  user?: boolean;
}

export default function ChatBubble(args: ChatBubbleArgs): JSX.Element {
  const { value, user } = args;

  return (
    <DaisyChatBubble key={nanoid()} end={user}>
      <DaisyChatBubble.Message>{value}</DaisyChatBubble.Message>
    </DaisyChatBubble>
  );
}
