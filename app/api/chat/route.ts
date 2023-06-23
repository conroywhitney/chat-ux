import { kv } from '@vercel/kv'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge'

export const runtime = 'edge'

// placeholder function for a future API call to get the weather
function get_current_weather(args: { location: string; unit: string }) {
  const weather_info = {
    location: args.location,
    temperature: '72',
    unit: args?.unit || 'fahrenheit',
    forecast: ['sunny', 'windy'],
  };
  return JSON.stringify(weather_info);
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
    'name': 'get_current_weather',
    'description': 'Get the current weather',
    'parameters': {
      'type': 'object',
      'properties': {
        'location': {
          'type': 'string',
          'description': 'The city and state, e.g. San Francisco, CA'
        },
        'format': {
          'type': 'string',
          'enum': ['celsius', 'fahrenheit'],
          'description': 'The temperature unit to use. Infer this from the users location.'
        }
      },
      'required': ['location', 'format']
    }
  }
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

    if (name == "get_current_weather") {
      const weatherResponse = get_current_weather(JSON.parse(args));

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
