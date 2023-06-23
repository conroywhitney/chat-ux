import { kv } from '@vercel/kv'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge'

export const runtime = 'edge'

// placeholder function for a future API call to get the weather
function get_current_weather(args: { location: string; format: string }) {
  const { location, format } = args;
  console.log("get_current_weather", location, format);

  const currentWeather = {
    location,
    temperature: '72',
    format: 'farenheit',
    forecast: ['sunny', 'windy'],
  };

  return JSON.stringify({ currentWeather });
}

function get_precipitation_percentage(args: { location: string }) {
  const { location } = args;
  console.log("get_precipitation_percentage", location);

  const precipitationPercentage = {
    location,
    hourlyPercentages: [0, 0, 0, 0, 0.1, 0.15, 0.25, 0.75, 0.9, 0.95, 0.95, 0.95, 0.95, 0.9, 0.75, 0.5, 0.25, 0.1, 0, 0, 0, 0, 0, 0]
  };

  return JSON.stringify({ precipitationPercentage });
}

function get_n_day_weather_forecast(args: { location: string; format: string, num_days: number }) {
  const { location, format, num_days } = args;
  console.log("get_n_day_weather_forecast", location, format, num_days);

  const weatherForecast = [
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

  return JSON.stringify({ weatherForecast });
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
				name: 'get_current_weather',
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
      "name": "get_current_weather",
      "description": "Get the current weather",
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
      "name": "get_n_day_weather_forecast",
      "description": "Get an N-day weather forecast",
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
    "name": "get_precipitation_percentage",
    "description": "Get the next 24 hours of precipitation percentages",
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
]

export async function POST(req: Request) {
  const json = await req.json()
  const { messages, previewToken } = json

  const configuration = new Configuration({
    apiKey: previewToken || process.env.OPENAI_API_KEY
  })

  const openai = new OpenAIApi(configuration)

  const response = await openai.createChatCompletion({
    function_call: 'auto', // allow GPT to choose whether to call a function or reply with a typical message
    functions,
    messages,
    model: 'gpt-3.5-turbo-0613',
    stream: false, // don't stream because this edge function isn't configured for it yet
  });

  const result = await response.json(); // since we're not streaming, get the full JSON response
  console.log("result", result)

  const { finish_reason, message } = result.choices[0];

  if (finish_reason == "function_call") {
    // GPT called a function, so we need to handle it, and give the result back to GPT
    const { name, arguments: args } = message.function_call;

    if (["get_current_weather", "get_n_day_weather_forecast", "get_precipitation_percentage"].includes(name)) {
      let weatherResponse = null;
      switch(name) {
        case "get_current_weather":
          weatherResponse = get_current_weather(JSON.parse(args));
          break;
        case "get_n_day_weather_forecast":
          weatherResponse = get_n_day_weather_forecast(JSON.parse(args));
          break;
        case "get_precipitation_percentage":
          weatherResponse = get_precipitation_percentage(JSON.parse(args));
          break;
      }

      const secondResponse = await openai.createChatCompletion({
        function_call: "none", // don't call a function, just reply with a typical message
        functions,
        messages: [
          ...messages, // the list of messages from the first call
          {
            role: 'function',
            name,
            content: weatherResponse,
          },
        ],
        model: 'gpt-3.5-turbo-0613',
        stream: false, // don't stream because this edge function isn't configured for it yet
      });

      const secondResult = await secondResponse.json(); // since we're not streaming, get the full JSON response 
      console.log("secondResult", secondResult);

      // GPT returned a typical response
      return new StreamingTextResponse(secondResult.choices[0].message.content);
    } else {
      // GPT called a function that we don't have a handler for
      console.log(`Function ${message.function_call.name} not implemented`);
    }
  } else {
    // GPT returned a typical response
    return new StreamingTextResponse(message.content);
  }  
}
