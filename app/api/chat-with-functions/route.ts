import { Configuration, OpenAIApi } from 'openai-edge'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { ChatCompletionFunctions } from 'openai-edge/types/api'

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config)

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge'

const functions: ChatCompletionFunctions[] = [
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
    name: 'get_current_weather',
    description: 'Get the current weather',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city and state, e.g. San Francisco, CA'
        },
        format: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description:
            'The temperature unit to use. Infer this from the users location.'
        }
      },
      required: ['location', 'format']
    }
  },
  {
    name: 'get_current_time',
    description: 'Get the current time',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'eval_code_in_browser',
    description: 'Execute javascript code in the browser with eval().',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: `Javascript code that will be directly executed via eval(). Do not use backticks in your response.
           DO NOT include any newlines in your response, and be sure to provide only valid JSON when providing the arguments object.
           The output of the eval() will be returned directly by the function.`
        }
      },
      required: ['code']
    }
  },
  {
    name: 'get_username',
    description: 'Get the username of the user',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
]

export async function POST(req: Request) {
  const { messages, function_call } = await req.json()

  const response = await openai.createChatCompletion({
    model: 'gpt-4-0613',
    stream: true,
    messages,
    functions,
    function_call
  })

  const stream = OpenAIStream(response)
  return new StreamingTextResponse(stream)
}