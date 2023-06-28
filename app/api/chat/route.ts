import { kv } from "@vercel/kv";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { Configuration, OpenAIApi } from "openai-edge";

export const runtime = "edge";

const SYSTEM_PROMPT = `
You are an advance AI system capable of interactive dialogues using text responses and user interface components to create engaging user experiences. While crafting responses, consider whether incorporating interactive elements would enhance your communication. You're equipped with these abilities:

1. "render_chat_bubble" - Use this function to generate a textual message. This is ideal for direct responses, instructions, or information sharing that require no user interaction.
2. "render_buttons" - This function allows you to present multiple pre-defined options to the user. Consider utilizing this when users need to make straightforward decisions or select from several options.
3. "render_form" - Use this ability to collect more complex or multiple pieces of information from the user. This arranges questions in a structured manner and collects user input systematically. Especially useful for gathering filters or parameters before performing a fetch_* call.
4. "render_table" - This function allows you to present tabular data to the user. This is ideal for displaying information in a structured manner, such as a list of products, or a list of options to choose from.
5. "render_response" - This is a special function used for combining multiple response elements. It always arranges components in a vertical sequence (column), maintaining the conversational flow. You include the different components that form the response as a list in this function. Each element in the list follows the structure of its respective render function ("render_buttons", "render_form", and "render_chat_bubble").

Remember, your aim is to create a dynamic and engaging conversation, where text-only responses are supplemented with UI components, where suitable. Utilize the power of these functions, and consider using "render_response" to combine text with other interactive elements. This will create richer interactions and ensure a more engaging experience for the users.

IMPORTANT: Due to technology limitations, once you call a "render_" function, that's the end of your "turn", and have to wait for a user response. If you need to "fetch_" data, do so before any "render_"ings.
`;

interface ProductFilters {
  category: string;
  color: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  color: string;
}

function fetch_products(filters: ProductFilters): Product[] {
  const { category, color } = filters;
  console.log("fetch_products", category, color);

  const products = [
    {
      id: "1",
      name: "Product 1",
      description: "This product is great!",
      price: 100,
      category: "Category 1",
      color: "red",
    },
    {
      id: "2",
      name: "Product 2",
      description: "This product is also great!",
      price: 200,
      category: "Category 2",
      color: "blue",
    },
    {
      id: "3",
      name: "Product 3",
      description: "This product is better than the others!",
      price: 300,
      category: "Category 3",
      color: "green",
    },
    {
      id: "4",
      name: "Product 4",
      description: "This product is better yet!",
      price: 400,
      category: "Category 1",
      color: "blue",
    },
    {
      id: "5",
      name: "Product 5",
      description: "This product is the absolute best!",
      price: 500,
      category: "Category 2",
      color: "red",
    },
  ];

  return products.filter(
    (product) => ((!category || product.category === category) && (!color || product.color === color))
  );
}

// placeholder function for a future API call to get the weather
function fetch_current_weather(args: { location: string; format: string }) {
  const { location, format } = args;
  console.log("fetch_current_weather", location, format);

  return {
    location,
    temperature: "72",
    format: "farenheit",
    forecast: ["sunny", "windy"],
  };
}

function fetch_precipitation_percentage(args: { location: string }) {
  const { location } = args;
  console.log("fetch_precipitation_percentage", location);

  return {
    location,
    hourlyPercentages: [
      0, 0, 0, 0, 0.1, 0.15, 0.25, 0.75, 0.9, 0.95, 0.95, 0.95, 0.95, 0.9, 0.75,
      0.5, 0.25, 0.1, 0, 0, 0, 0, 0, 0,
    ],
  };
}

function fetch_n_day_weather_forecast(args: {
  location: string;
  format: string;
  num_days: number;
}) {
  const { location, format, num_days } = args;
  console.log("fetch_n_day_weather_forecast", location, format, num_days);

  return [
    {
      date: "2021-06-13",
      location,
      temperature: "80",
      format: "farenheit",
      forecast: ["sunny", "windy"],
    },
    {
      date: "2021-06-14",
      location,
      temperature: "65",
      format: "farenheit",
      forecast: ["cloudy"],
    },
    {
      date: "2021-06-15",
      location,
      temperature: "70",
      format: "farenheit",
      forecast: ["thunderstorms"],
    },
  ];
}

// Array of functions that GPT can call
const functions = [
  {
    name: "fetch_products",
    description:
      "Fetch a list of products based on the provided filters. The filters are optional, and if not provided, the function returns all products.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "The category of products to fetch.",
          enum: ["Category 1", "Category 2", "Category 3"]
        },
        color: {
          type: "string",
          description: "The color of products to fetch.",
          enum: ["red", "blue", "green"]
        }
      }
    },
    required: [],
    returns: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The unique identifier of the product.",
          },
          name: {
            type: "string",
            description: "The name of the product.",
          },
          price: {
            type: "number",
            description: "The price of the product.",
          },
          category: {
            type: "string",
            description: "The category of the product.",
          },
          color: {
            type: "string",
            description: "The color of the product.",
          },
        }
      }
    },
  },

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
      "Creates a form to gather information from the user systematically. Use this when multiple or complex information needs to be obtained. Especially useful for providing filter options before fetching data.",
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
    name: "render_and_fetch",
    description:
      "The function to bundle various fetch requests and/or rendering of components into a column for user-friendly viewing. It structures interactions and maintains the conversation's flow.",
    parameters: {
      type: "object",
      properties: {
        fetchFunctions: {
          type: "array",
          description: "(Optional) Array of the different fetch functions to call before rendering the output. Each item in the array follows the structure of its respective fetch function (fetch_products).",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                enum: ["fetch_products"],
                description: "The name of the fetch function to call.",
              },
              arguments: {
                type: "string",
                description: "The arguments to pass to the fetch function.",
              }
            },
            required: ["name", "arguments"],
          }
        },
        renderFunctions: {
          type: "array",
          description:
            "Array of the different components that form the response. Each element in the array follows the structure of its respective render function (render_buttons, render_chat_bubble, render_form, and/or render_table).",
          items: {
            type: "object",
            description: "A component to render.",
            properties: {
              name: {
                type: "string",
                enum: ["render_buttons", "render_chat_bubble", "render_form", "render_table"],
                description: "The name of the render function.",
              },
              arguments: {
                type: "string",
                description: "The arguments to pass to the function (per the function's definition).",
              },
            },
            required: ["name", "arguments"],
          },
        },
      },
      required: [],
    },
  },
];

export async function POST(req: Request): Promise<String> {
  const json = await req.json();
  const { messages } = json;

  return await handleChatCompletion(messages, functions, "gpt-4-0613", 0);
}

async function handleChatCompletion(
  messages: any[],
  functions: any[],
  model: string,
  depth: number
): Promise<String> {
  if (depth >= 3) throw new Error("Maximum recursion depth reached");

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  const response = await openai.createChatCompletion({
    function_call: "render_and_fetch",
    functions,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    model,
    stream: false,
  });

  const result = await response.json();
  const { message } = result.choices[0];
  const { function_call } = message;

  if (function_call && function_call.name == "fetch_and_render") {
    const fetchFunctions = function_call.arguments.fetchFunctions || [];
    const renderFunctions = function_call.arguments.renderFunctions || [];
    const newMessages = messages;

    if (renderFunctions.length > 0) {
      renderFunctions.each((renderFunction: any) => {
        newMessages.push(
          {
            role: "assistant",
            function_call: {
              name: renderFunction.name.replace("functions.", ""),
              arguments: renderFunction.arguments,
            }
          }
        )
      });
    };

    if (fetchFunctions.length > 0) {
      fetchFunctions.each(async (fetchFunction: any) => {
        newMessages.push(
          {
            role: "function",
            name: fetchFunction.name,
            content: await callFunction(
              fetchFunction.name.replace("functions.", ""),
              JSON.parse(fetchFunction.arguments)
            )
          }
        )
      });

      return await handleChatCompletion(newMessages, functions, model, depth + 1);
    } else {
      // No more fetch functions, so render the output
      return JSON.stringify({ messages: newMessages });
    }
  } else {
    console.log("handleChatCompletion", "error", "Should have called fetch_and_render", message);
    throw new Error("Should have called fetch_and_render");
  }
}

async function callFunction(name: string, args: any): any {
  switch (name) {
    case "fetch_products":
      return fetch_products(args);
    case "fetch_current_weather":
      return fetch_current_weather(args);
    case "fetch_n_day_weather_forecast":
      return fetch_n_day_weather_forecast(args);
    case "fetch_precipitation_percentage":
      return fetch_precipitation_percentage(args);
    default:
      throw new Error(`Unexpected function name: ${name}`);
  }
}
