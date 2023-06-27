import { kv } from "@vercel/kv";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { Configuration, OpenAIApi } from "openai-edge";

export const runtime = "edge";

const SYSTEM_PROMPT = `
Enhance user engagement by creatively using text and UI elements in your responses.
Deploy the abilities from the "functions" section to provide richer interactions.
Use "render_response" to amalgamate text and UI elements.
Maintain flow and dynamism in the dialogue.
`;

const functions = [
  {
    name: "render_buttons",
    description:
      "Display a row of interactive buttons; useful for user's choice from multiple options",
    parameters: {
      type: "object",
      properties: {
        elements: {
          description:
            "Array of button(s) to render, with descriptive ID, label, value, and color",
          type: "array",
          items: {
            type: "object",
            description: "A button to render",
            properties: {
              id: {
                type: "string",
                description:
                  "Sensible identifier per button; maps to return value when clicked",
              },
              label: {
                type: "string",
                description: "Display text on the button",
              },
              value: {
                type: "string",
                description: "Return value when the button is clicked",
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
                description: "Theme color of the button",
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
    name: "render_chat_bubble",
    description:
      "Show a text message for non-interactive information, instructions, or responses",
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "string",
          description: "Content of the text message",
        },
      },
      required: ["value"],
    },
  },

  {
    name: "render_form",
    description:
      "Create a form for systematic collection of complex user data",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Descriptive identifier of the form",
        },
        elements: {
          type: "array",
          description: "Array of form elements with descriptive ID",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Descriptive identifier for this form element",
              },
              label: {
                type: "string",
                description: "Displayed label for this form element",
              },
              type: {
                type: "string",
                enum: ["checkboxes", "input", "radio", "select", "textarea"],
                description: "Type of the form element",
              },
              options: {
                type: "array",
                description:
                  "(Optional) Available options for select or checkboxes type form elements",
                items: {
                  type: "object",
                  properties: {
                    label: {
                      type: "string",
                      description: "Displayed label for the option",
                    },
                    value: {
                      type: "string",
                      description: "Return value if this option is selected",
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
          description: "Form's submit button text",
        },
      },
    },
  },

  {
    name: "render_response",
    description:
      "Bundle multiple response components into a columnar format for user-friendly viewing",
    parameters: {
      type: "object",
      properties: {
        elements: {
          type: "array",
          description: "Aggregate multiple response elements",
          items: {
            type: "object",
            description: "A component to render",
            properties: {
              name: {
                type: "string",
                enum: ["render_buttons", "render_chat_bubble", "render_form", "render_table"],
                description: "Name of the render function",
              },
              arguments: {
                type: "string",
                description: "Arguments for the function",
              },
            },
            required: ["name", "arguments"],
          },
        },
      },
      required: ["elements"],
    },
  },

  {
    name: "render_table",
    description:
      "Generate a table for displaying structured data in rows and columns",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Descriptive identifier for the table",
        },
        headers: {
          description: "Column headers",
          type: "array",
          items: {
            type: "string",
          },
        },
        rows: {
          description: "Table data",
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Descriptive identifier for this row",
              },
              columns: {
                type: "array",
                description: "Column data for each header in this row",
                items: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      description: "Descriptive identifier for this cell",
                    },
                    header: {
                      type: "string",
                      description:
                        "Corresponding header for this column value",
                    },
                    value: {
                      type: "string",
                      description: "Display value for this column",
                    },
                  },
                  required: ["header", "value"],
                },
              },
              detailsButton: {
                type: "object",
                description: "(Optional) Details button for this row",
                properties: {
                  id: {
                    type: "string",
                    description: "Descriptive identifier for details button",
                  },
                  label: {
                    type: "string",
                    description: "Label for details button",
                  },
                  value: {
                    type: "string",
                    description: "Return value when details button is clicked",
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
