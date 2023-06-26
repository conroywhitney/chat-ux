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
  arguments: args,
  handleClick,
  handleSubmit,
}: {
  name: string;
  arguments: string;
  handleClick: ({ id, value }: { id: string; value: string }) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) => {
  try {
    if (name == "render_response") {
      const { elements } = JSON.parse(args);

      return (
        <div className="me-2 flex w-3/4 flex-col items-start justify-start space-y-4 py-4">
          {elements.map((element: any) =>
            renderComponent({ ...element, handleClick, handleSubmit })
          )}
        </div>
      );
    } else {
      const componentName = name.replace("render_", "");
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
  message: Message,
  handleClick: ({ id, value }: { id: string; value: string }) => void,
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void
) => {
  const { content, role } = message;
  const isComponent = content.includes("render_");

  return (
    <div
      key={message.id}
      className="py-4"
    >
      {isComponent &&
        renderComponent({ ...JSON.parse(content), handleClick, handleSubmit })}
      {!isComponent && (
        <ChatBubble
          value={content}
          user={role == "user"}
        />
      )}
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
          content: JSON.stringify({ id, value }),
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
