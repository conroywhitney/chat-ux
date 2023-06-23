import { kv } from '@vercel/kv'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge'

export const runtime = 'edge'

const SYSTEM_PROMPT = `
The following is a conversation with an AI assistant.
The assistant has four types of functions it can call:
 * "fetch_" functions will load external data
 * "fetch_" functions will prompt the user for additional information
 * "render_" functions will output a UI component tailored to a specific information view
 * "set_" functions will update the state of the assistant and/or the system
When rational, call one of the functions. Otherwise, reply with a normal message.
`

// placeholder function for a future API call to get the weather
function fetch_current_weather(args: { location: string; format: string }) {
  const { location, format } = args;
  console.log("fetch_current_weather", location, format);

  return {
    location,
    temperature: '72',
    format: 'farenheit',
    forecast: ['sunny', 'windy'],
  };
}

function fetch_precipitation_percentage(args: { location: string }) {
  const { location } = args;
  console.log("fetch_precipitation_percentage", location);

  return {
    location,
    hourlyPercentages: [0, 0, 0, 0, 0.1, 0.15, 0.25, 0.75, 0.9, 0.95, 0.95, 0.95, 0.95, 0.9, 0.75, 0.5, 0.25, 0.1, 0, 0, 0, 0, 0, 0]
  };
}

function fetch_n_day_weather_forecast(args: { location: string; format: string, num_days: number }) {
  const { location, format, num_days } = args;
  console.log("fetch_n_day_weather_forecast", location, format, num_days);

  return [
    {
      date: "2021-06-13",
      location,
      temperature: '80',
      format: 'farenheit',
      forecast: ['sunny', 'windy'],
    },
    {
      date: "2021-06-14",
      location,
      temperature: '65',
      format: 'farenheit',
      forecast: ['cloudy'],
    },
    {
      date: "2021-06-15",
      location,
      temperature: '70',
      format: 'farenheit',
      forecast: ['thunderstorms'],
    }
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
      "name": "fetch_current_weather",
      "description": "Fetch the current weather",
      "parameters": {
          "type": "object",
          "properties": {
              "location": {
                  "type": "string",
                  "description": "The city and state, e.g. San Francisco, CA",
              },
              "format": {
                  "type": "string",
                  "enum": ["celsius", "fahrenheit"],
                  "description": "The temperature unit to use. Infer this from the users location.",
              },
          },
          "required": ["location", "format"],
      },
  },
  {
      "name": "fetch_n_day_weather_forecast",
      "description": "Fetch an N-day weather forecast",
      "parameters": {
          "type": "object",
          "properties": {
              "location": {
                  "type": "string",
                  "description": "The city and state, e.g. San Francisco, CA",
              },
              "format": {
                  "type": "string",
                  "enum": ["celsius", "fahrenheit"],
                  "description": "The temperature unit to use. Infer this from the users location.",
              },
              "num_days": {
                  "type": "integer",
                  "description": "The number of days to forecast",
              }
          },
          "required": ["location", "format", "num_days"]
      },
  },
  {
    "name": "fetch_precipitation_percentage",
    "description": "Fetch the next 24 hours of precipitation percentages",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "The city and state, e.g. San Francisco, CA",
            }
        },
        "required": ["location"]
    },
  },
  {
    "name": "render_weather",
    "description": "Show rather than tell. Render weather-related information, including current weather, 5 day forecast, and precipitation using a client-side React component",
    "parameters": {
      "type": "object",
      "properties": {
        "location": {
          "type": "string",
          "description": "The city and state, e.g. San Francisco, CA"
        },
        "current": {
          "type": "object",
          "properties": {
            "temperature": {
              "type": "string",
              "description": "The current temperature"
            },
            "format": {
              "type": "string",
              "enum": ["celsius", "fahrenheit"],
              "description": "The temperature unit to use."
            },
            "forecast": {
              "type": "string",
              "description": "The forecast for the rest of the day"
            }
          }
        },
        "forecast": {
          "type": "array",
          "description": "The forecast for the next n days",
          "items": {
            "type": "object",
            "properties": {
              "date": {
                "type": "string",
                "description": "The date of the forecast"
              },
              "temperature": {
                "type": "string",
                "description": "The temperature"
              },
              "format": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "description": "The temperature unit to use"
              },
              "forecast": {
                "type": "string",
                "description": "The forecast for the day"
              }
            }
          }
        },
        "precipitation": {
          "type": "array",
          "description": "The precipitation percentages for the next 24 hours",
          "items": {
            "type": "number",
            "description": "The precipitation percentage"
          }
        }
      },
      "required": ["location"]
    }
  }
]

export async function POST(req: Request) {
  const json = await req.json();
  const { messages } = json;

  return await handleChatCompletion(messages, functions, 'gpt-3.5-turbo-0613', 0);
}

async function handleChatCompletion(messages: any[], functions: any[], model: string, depth: number): Promise<StreamingTextResponse> {
  if (depth >= 10) throw new Error('Maximum recursion depth reached');

  const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY })
  const openai = new OpenAIApi(configuration)

  const response = await openai.createChatCompletion({
    function_call: "auto",
    functions,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ],
    model,
    stream: false,
  });

  const result = await response.json();
  console.log("result", result)

  const { finish_reason, message } = result.choices[0];

  if (finish_reason === 'stop') {
    return new StreamingTextResponse(message.content);
  } else if (finish_reason === 'function_call') {
    if (message.function_call.name.startsWith('render_')) {
      console.log("rendering", message);
      return new StreamingTextResponse(JSON.stringify(message.function_call));
    } else {
      const functionResult = callFunction(message.function_call.name, JSON.parse(message.function_call.arguments));
      const newMessages = [
        ...messages,
        {
          role: 'function',
          name: message.function_call.name,
          content: JSON.stringify(functionResult),
        },
      ];

      return handleChatCompletion(newMessages, functions, model, depth + 1);
    }
  } else {
    throw new Error(`Unexpected finish_reason: ${finish_reason}`);
  }
}

function callFunction(name: string, args: any): any {
  switch(name) {
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