import { kv } from "@vercel/kv";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { Configuration, OpenAIApi } from "openai-edge";

export const runtime = "edge";

const SYSTEM_PROMPT = `
You are an advanced AI system capable of interactive dialogues using text responses and user interface components to create engaging user experiences. While crafting responses, consider whether incorporating interactive elements would enhance your communication. You're equipped with these abilities:

Remember, your aim is to create a dynamic and engaging conversation, where text-only responses are supplemented with UI components, where suitable. Utilize the power of these functions, and consider using "render_response" to combine text with other interactive elements. This will create richer interactions and ensure a more engaging experience for the users.
`;

// Array of functions that GPT can call
const functions = [
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
  },
  {
    name: "render_form",
    description:
      "Creates a form to gather complex or multi-part information from the user systematically.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            "A unique identifier to match the return value to this form.",
        },
        elements: {
          type: "array",
          description:
            "Form elements to render, including inputs, textareas, checkboxes, radios, select dropdowns, and more.",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description:
                  "Unique ID to match return value to this form element.",
              },
              label: {
                type: "string",
                description: "Label displayed for this form element.",
              },
              type: {
                type: "string",
                enum: ["input", "textarea", "select", "checkboxes", "radio"],
                description: "Type of the form element.",
              },
              options: {
                type: "array",
                description:
                  "(Optional) For types selects or checkboxes, the options available to select.",
                items: {
                  type: "object",
                  properties: {
                    label: {
                      type: "string",
                      description: "The label text to display for the option.",
                    },
                    value: {
                      type: "string",
                      description:
                        "The value to return if this option is selected.",
                    },
                  },
                  required: ["label", "value"],
                },
              },
            },
            required: ["id", "label", "type"],
          },
        },
        submitLabel: {
          type: "string",
          description: "Text to display on the form's submit button.",
        },
      },
    },
  },
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
  },
  {
    name: "render_table",
    description:
      "Generates a data table. Ideal for displaying structured data set in rows and columns format.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "A unique identifier for the table.",
        },
        headers: {
          description: "The column headers for the table.",
          type: "array",
          items: {
            type: "string",
          },
        },
        rows: {
          description:
            "Data to populate the table's rows. Each element in the array represents a row.",
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "A unique identifier for this row (table + row).",
              },
              columns: {
                type: "array",
                description: "The column data for each header in this row.",
                items: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      description:
                        "A unique identifier for the cell (table + row + column).",
                    },
                    header: {
                      type: "string",
                      description:
                        "The header this column value corresponds to.",
                    },
                    value: {
                      type: "string",
                      description: "The value to display for this column.",
                    },
                  },
                  required: ["header", "value"],
                },
              },
              detailsButton: {
                type: "object",
                description: "(Optional) The details button for this row.",
                properties: {
                  id: {
                    type: "string",
                    description:
                      "A unique identifier for the button for when it's clicked (table + row + 'details').",
                  },
                  label: {
                    type: "string",
                    description: "The label for the details button.",
                  },
                  value: {
                    type: "string",
                    description:
                      "The value to return when the details button is clicked.",
                  },
                },
              },
            },
            required: ["id", "columns"],
          },
        },
      },
      required: ["headers", "rows"],
    },
  },
  {
    name: "render_response",
    description:
      "A wrapper function to bundle various response components (buttons, forms, messages) into a column for user-friendly viewing. It structures interactions and maintains the conversation's flow.",
    parameters: {
      type: "object",
      properties: {
        elements: {
          type: "array",
          description:
            "This is a special function used for combining multiple response elements. It always arranges components in a vertical sequence (column), maintaining the conversational flow. You include the different components that form the response as a list in this function. Each element in the list follows the structure of its respective render function.",
          items: {
            type: "object",
            description: "A component to render.",
            properties: {
              name: {
                type: "string",
                enum: ["render_buttons", "render_form", "render_chat_bubble"],
                description: "The name of the render function.",
              },
              arguments: {
                type: "string",
                description: "The arguments to pass to the function.",
              },
            },
            required: ["name", "arguments"],
          },
        },
      },
      required: ["elements"],
    },
  },
];

export async function POST(req: Request) {
  const json = await req.json();
  const { messages } = json;

  return await handleChatCompletion(messages, functions, "gpt-4-0613", 0);
}

async function handleChatCompletion(
  messages: any[],
  functions: any[],
  model: string,
  depth: number
): Promise<StreamingTextResponse> {
  if (depth >= 10) throw new Error("Maximum recursion depth reached");

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  const response = await openai.createChatCompletion({
    function_call: { name: "render_response" },
    functions,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    model,
    stream: false,
  });

  const result = await response.json();
  console.log("result", result);

  const { finish_reason, message } = result.choices[0];

  if (message.function_call.name.startsWith("render_")) {
    console.log("rendering", message);
    // @ts-ignore
    return new StreamingTextResponse(JSON.stringify(message.function_call));
  } else {
    const functionResult = callFunction(
      message.function_call.name,
      JSON.parse(message.function_call.arguments)
    );
    const newMessages = [
      ...messages,
      {
        role: "function",
        name: message.function_call.name,
        content: JSON.stringify(functionResult),
      },
    ];

    return handleChatCompletion(newMessages, functions, model, depth + 1);
  }
}

function callFunction(name: string, args: any): any {
  switch (name) {
    default:
      throw new Error(`Unexpected function name: ${name}`);
  }
}
