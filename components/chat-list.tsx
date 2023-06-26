"use client";

import { useCallback } from "react";
import { type Message } from "ai";
import { nanoid } from "@/lib/utils";

import PlainText from "@/components/chat-components/plain_text";

interface ComponentArgs {
  [key: string]: any;
  onSubmit: (value: any) => void;
}

export interface ChatList {
  append: (message: Message) => void;
  messages: Message[];
}

const renderComponent = ({
  name,
  arguments: args,
  handleSubmit
}: {
  name: string;
  arguments: string;
  handleSubmit: (value: any) => void;
}) => {
  try {
    if (name == "render_flexbox") {
      const { alignItems, children, flexDirection, justifyContent } =
        JSON.parse(args);

      return (
        <div
          className={`flex ${alignItems || "items-start"} ${
            flexDirection || "flex-col"
          } ${justifyContent || "justify-start"} me-2 w-3/4 py-4`}
        >
          {children.map((child: any) => renderComponent({ ...child, handleSubmit }))}
        </div>
      );
    } else {
      const componentName = name.replace("render_", "");
      const Component =
        require(`@/components/chat-components/${componentName}`).default;
      const componentArgs: ComponentArgs = JSON.parse(args);

      return <Component {...componentArgs} onSubmit={handleSubmit} />;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

const renderMessage = (message: Message, handleSubmit: (value: any) => void) => {
  const { content, role } = message;
  const isComponent = content.includes("render_");

  return (
    <div
      key={message.id}
      className="py-4"
    >
      {isComponent && renderComponent({ ...JSON.parse(content), handleSubmit })}
      {!isComponent && (
        <PlainText
          value={content}
          user={role == "user"}
        />
      )}
    </div>
  );
};

export function ChatList({ append, messages }: ChatList) {
  const handleSubmit = useCallback((value: any) => {
    console.log("value", value);
    append({
      id: nanoid(),
      content: JSON.stringify(value),
      role: "user"
    });
  }, [append]);

  if (!messages.length) return null;

  return (
    <div className="relative mx-auto max-w-2xl px-4">
      {messages.map(message => renderMessage(message, handleSubmit))}
    </div>
  );
}
