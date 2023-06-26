"use client";

import { type Message } from "ai";

import PlainText from "@/components/chat-components/plain_text";

interface ComponentArgs {
  [key: string]: any;
}

export interface ChatList {
  messages: Message[];
}

const renderComponent = ({
  name,
  arguments: args,
}: {
  name: string;
  arguments: string;
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
          {children.map(renderComponent)}
        </div>
      );
    } else {
      const componentName = name.replace("render_", "");
      const Component =
        require(`@/components/chat-components/${componentName}`).default;
      const componentArgs: ComponentArgs = JSON.parse(args);

      return <Component {...componentArgs} />;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

const renderMessage = (message: Message, index: number) => {
  const { content, role } = message;
  const isComponent = content.includes("render_");

  return (
    <div
      key={index}
      className="py-4"
    >
      {isComponent && renderComponent(JSON.parse(content))}
      {!isComponent && (
        <PlainText
          value={content}
          user={role == "user"}
        />
      )}
    </div>
  );
};

export function ChatList({ messages }: ChatList) {
  if (!messages.length) return null;

  return (
    <div className="relative mx-auto max-w-2xl px-4">
      {messages.map(renderMessage)}
    </div>
  );
}
