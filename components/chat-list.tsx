"use client";

import { useCallback } from "react";
import { type Message } from "ai";
import { nanoid } from "@/lib/utils";

import ChatBubble from "@/components/chat-components/chat_bubble";

interface ComponentArgs {
  [key: string]: any;
  onSubmit: (value: any) => void;
}

export interface ChatList {
  append?: (message: Message) => void;
  messages: Message[];
}

const renderComponent = ({
  name,
  args,
  handleClick,
  handleSubmit,
}: {
  name: string;
  args: string;
  handleClick: ({ id, value }: { id: string; value: string }) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) => {
  try {
    if (name == "fetch_and_render") {
      const { elements } = JSON.parse(args);

      return (
        <div className="me-2 flex w-3/4 flex-col items-start justify-start space-y-4 py-4">
          {elements.map((element: any) =>
            renderComponent({ ...element, handleClick, handleSubmit })
          )}
        </div>
      );
    } else {
      const componentName = name
        .replace("functions.render_", "")
        .replace("render_", "");
      const Component =
        require(`@/components/chat-components/${componentName}`).default;
      const componentArgs: ComponentArgs = JSON.parse(args);

      return (
        <Component
          {...componentArgs}
          onClick={handleClick}
          onSubmit={handleSubmit}
        />
      );
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

const renderMessage = (
  message: any,
  handleClick: ({ id, value }: { id: string; value: string }) => void,
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void
) => {
  let parsedMessage = message;
  try {
    parsedMessage = JSON.parse(message.content);
  } catch (error) {}

  console.log("renderMessage 1", parsedMessage);

  if (parsedMessage.content?.includes("function_call")) {
    parsedMessage = parsedMessage.content;
    try {
      parsedMessage = JSON.parse(message.content);
    } catch (error) {
      console.log("renderMessage error", error);
    }

    console.log("renderMessage 2", parsedMessage);
  }

  const { content, role, function_call } = parsedMessage;
  const { name, arguments: args } = function_call || {};
  const isComponent = name?.includes("render_") || false;

  console.log("renderMessage 3", parsedMessage, isComponent);

  return (
    <div
      key={parsedMessage.id}
      className="py-4"
    >
      {content && (
        <ChatBubble
          value={content}
          user={role == "user"}
        />
      )}
      {isComponent &&
        renderComponent({ name, args, handleClick, handleSubmit })}
    </div>
  );
};

export function ChatList({ append, messages }: ChatList) {
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault(); // prevent default form submission behavior
      const formData = new FormData(event.target as HTMLFormElement); // create a new FormData object from the form element
      const values = Object.fromEntries(formData.entries()); // convert the FormData object to a plain object
      console.log(values); // log the values of the input elements
      if (append) {
        append({
          id: nanoid(),
          content: JSON.stringify(values),
          role: "user",
        });
      }
    },
    [append]
  );

  const handleClick = useCallback(
    ({ id, value }: { id: string; value: string }) => {
      console.log("handleClick", id, value);
      if (append) {
        append({
          id: nanoid(),
          content: JSON.stringify({ button: id }),
          role: "user",
        });
      }
    },
    [append]
  );

  if (!messages.length) return null;

  return (
    <div className="relative mx-auto max-w-2xl px-4">
      {messages.map(message =>
        renderMessage(message, handleClick, handleSubmit)
      )}
    </div>
  );
}
