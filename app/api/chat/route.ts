import { kv } from "@vercel/kv";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { Configuration, OpenAIApi } from "openai-edge";

export const runtime = "edge";

const SYSTEM_PROMPT = `
You're an advanced AI experience capable of interactive engagements using text responses, UI components, or ideally, a combination of both.

When responding to user inputs, consider if a dynamic interactive component would enhance your response. You have multiple rendering abilities at your disposal:

You can use "render_plain_text" to produce a straightforward text message - a clear and concise response to user queries, or to provide information or instructions.

"render_button" lets you create actionable buttons. This can be used for straightforward user decisions, where they can select from pre-defined options.

For times when multiple components need to be displayed simultaneously, the "render_flexbox" function is at your service. This can provide the user with a group of inline components, altogether creating complex and engaging responses.

With the introduction of "render_form", you have the ability to request one or more pieces of information from a user in a structured manner, which is ideal for more complex info-gathering tasks.

Remember, your goal is to create an engaging, dynamic conversation, and as such, don't restrict yourself to text-only responses. While responding, you can, and should, use "render_flexbox" to combine "render_plain_text" with other UI components. This brings the conversation to life by coupling your responses with appropriate interactive elements. 

Play to the strength of this interactive environment, using the rich array of UI components to create meaningful and engaging user experiences whenever possible.
`;

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

/*
Example response from the GPT API when calling a function:
{
	id: 'chatcmpl-7UQ1NoOnwUnylhvEMpi0JviQcJG23',
	object: 'chat.completion',
	created: 1687484221,
	model: 'gpt-3.5-turbo-0613',
	choices: [{
		index: 0,
		message: {
			role: 'assistant',
			content: null,
			function_call: {
				name: 'fetch_current_weather',
				arguments: '{\n  "location": "Pensacola, FL",\n  "format": "celsius"\n}'
			}
		},
		finish_reason: 'function_call'
	}],
	usage: {
		prompt_tokens: 89,
		completion_tokens: 29,
		total_tokens: 118
	}
}
*/

/* Example response from the GPT API when returning a regular message:
{
	id: 'chatcmpl-7UQsK6iBHrVAXOXmweDToW0ahv2yB',
	object: 'chat.completion',
	created: 1687487504,
	model: 'gpt-3.5-turbo-0613',
	choices: [{
		index: 0,
		message: {
			role: 'assistant',
			content: 'The current weather in Pensacola, FL is 72°F with sunny and windy conditions.'
		},
		finish_reason: 'stop'
	}],
	usage: {
		prompt_tokens: 127,
		completion_tokens: 19,
		total_tokens: 146
	}
}
*/

// Array of functions that GPT can call
const functions = [
  {
    name: "render_button",
    description: "Render a ReactJS/Tailwind/DaisyUI Button component",
    parameters: {
      type: "object",
      properties: {
        color: {
          type: "string",
          enum: [
            "default",
            "accent",
            "error",
            "ghost",
            "info",
            "primary",
            "secondary",
            "success",
            "warning",
          ],
          description:
            "The theme indicator to use based on usage and/or severity.",
        },
        key: {
          type: "string",
          description:
            "A unique identifier that will let you match a return value back to this exact rendering.",
        },
        label: {
          type: "string",
          description: "The text value to show on the Button.",
        },
        value: {
          type: "string",
          description:
            "What to return if/when the button is clicked. When paired with the id parameter.",
        },
      },
      required: ["color", "key", "label", "value"],
    },
  },
  {
    name: "render_flexbox",
    description:
      "Render multiple components at the same time using CSS flexbox, as defined in the other available render_* functions. Can also render child flexboxes.",
    parameters: {
      type: "object",
      properties: {
        alignItems: {
          type: "string",
          enum: [
            "items-start",
            "items-end",
            "items-center",
            "items-baseline",
            "items-stretch",
          ],
          description: "The CSS flexbox align-items to use.",
        },
        children: {
          type: "array",
          description: "The list of child components to render.",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                enum: [
                  "render_button",
                  "render_flexbox",
                  "render_form",
                  "render_plain_text",
                ],
                description: "The name of the function to call.",
              },
              arguments: {
                type: "string",
                description: "The arguments to pass to the function.",
              },
            },
            required: ["name", "arguments"],
          },
        },
        flexDirection: {
          type: "string",
          enum: ["flex-col", "flex-row"],
          description: "The CSS flexbox direction to use.",
        },
        justifyContent: {
          type: "string",
          enum: [
            "justify-normal",
            "justify-start",
            "justify-end",
            "justify-center",
            "justify-between",
            "justify-around",
            "justify-evenly",
            "justify-stretch",
          ],
          description: "The CSS flexbox justify-content to use.",
        },
      },
    },
    required: ["alignItems", "children", "flexDirection", "justifyContent"],
  },
  {
    name: "render_plain_text",
    description:
      "Render a ReactJS/Tailwind/DaisyUI PlainText chat bubble component",
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "string",
          description: "The content of the plaintext chat message.",
        },
      },
    },
  },
  {
    name: "render_form",
    description:
      "Render a ReactJS/Tailwind/DaisyUI Form component to get one or more pieces of information from a user.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            "A unique identifier that will let you match a return value back to this exact rendering.",
        },
        elements: {
          type: "array",
          description: "The list of child form elements to render.",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description:
                  "A unique identifier that will let you match a return value back to this specific form element.",
              },
              label: {
                type: "string",
                description: "The label text to display for the form element.",
              },
              options: {
                type: "array",
                description:
                  "The list of options to display for a select element.",
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
              type: {
                type: "string",
                enum: [
                  "input",
                  "textarea",
                  "select",
                  "checkbox",
                  "radio",
                  "button",
                ],
                description: "The type of form element to render.",
              },
            },
            required: ["id", "label", "type"],
          },
        },
        submitLabel: {
          type: "string",
          description: "The label text to display on the submit button.",
        },
      },
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
    function_call: { name: "render_flexbox" },
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
