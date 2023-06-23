import { kv } from '@vercel/kv'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge'

export const runtime = 'edge'

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
    model: 'gpt-3.5-turbo-0613',
    stream: false,
    messages,
    functions,
    function_call: 'auto'
  });

  const result = await response.json();
  const data = result.choices[0];
  const message = data.message;

  if (data.finish_reason == "function_call") {
    console.log("function all", message.function_call)
  } else {
    return new StreamingTextResponse(message.content);
  }  
}
