import { kv } from "@vercel/kv";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { Configuration, OpenAIApi } from "openai-edge";

export const runtime = "edge";

const SYSTEM_PROMPT = `
You are an advanced AI system capable of interactive dialogues using text responses and user interface components to create engaging user experiences. While crafting responses, consider whether incorporating interactive elements would enhance your communication.

You're equipped with these abilities:
1. "render_chat_bubble" - Use this function to generate a textual message. This is ideal for direct responses, instructions, or information sharing that require no user interaction.
2. "render_buttons" - This function allows you to present multiple pre-defined options to the user. Consider utilizing this when users need to make straightforward decisions or select from several options.
3. "render_form" - Use this ability to collect more complex or multiple pieces of information from the user. This arranges questions in a structured manner and collects user input systematically.
4. "render_table" - This function allows you to display structured data in rows and columns. This is useful for presenting information in a tabular format. It includes a "details" button that can be used for user interaction with a particular row.
5. "render_response" - This is a special function used for combining multiple response elements. It always arranges components in a vertical sequence (column), maintaining the conversational flow. You include the different components that form the response as a list in this function. Each element in the list follows the structure of its respective render function ("render_buttons", "render_chat_bubble", "render_form", and "render_table").

Remember, your aim is to create a dynamic and engaging conversation, where text-only responses are supplemented with UI components, where suitable. Utilize the power of these functions, and consider using "render_response" to combine text with other interactive elements. This will create richer interactions and ensure a more engaging experience for the users.
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
      "Displays a textual message. Use for providing information, instructions, or responses that don't require user interaction",
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
    description: "Creates a form to gather information from the user systematically. Use this when multiple or complex information needs to be obtained",
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
                  "(Optional) Available options for checkboxes, radio lists, or select dropdowns. Does not apply to text input",
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
      "A special function (only called once) for combining multiple response elements into a columnar format, maintaining the structure and flow of the conversation",
    parameters: {
      type: "object",
      properties: {
        elements: {
          type: "array",
          description: "Aggregate multiple response elements. Each element in the list follows the structure of its respective render function",
          items: {
            type: "object",
            description: "A component to render",
            properties: {
              name: {
                type: "string",
                enum: [
                  "render_buttons",
                  "render_chat_bubble",
                  "render_form",
                  "render_table",
                ],
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
                      description: "Corresponding header for this column value",
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
