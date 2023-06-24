/*
This component is called by the GPT model to render a weather forecast. It is defined by this JSON structure:
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
*/
interface WeatherArgs {
  location: string
  current?: {
    temperature: number
    format: string
    forecast: string
  }
  forecast?: {
    date: string
    temperature: number
    format: string
    forecast: string
  }[]
  precipitation?: number[]
}

export default function Weather(args: WeatherArgs): JSX.Element {
  const { location, current, forecast, precipitation } = args

  return (
    <>
      <div className="flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold">{location}</h1>
          {current && (
            <>
              <h2 className="text-xl font-semibold">
                {current.temperature} {current.format}
              </h2>
              <h3 className="text-lg font-semibold">{current.forecast}</h3>
            </>
          )}
        </div>
        {forecast && (
          <div className="flex flex-row items-center justify-center">
            {forecast.map(
              (
                day: {
                  date: string
                  temperature: number
                  format: string
                  forecast: string
                },
                index: number
              ) => (
                <div
                  key={`forecast-${index}`}
                  className="flex flex-col items-center justify-center"
                >
                  <h3 className="text-lg font-semibold">{day.date}</h3>
                  <h3 className="text-lg font-semibold">
                    {day.temperature} {day.format}
                  </h3>
                  <h3 className="text-lg font-semibold">{day.forecast}</h3>
                </div>
              )
            )}
          </div>
        )}
        {precipitation && (
          <div className="flex flex-row items-center justify-center">
            {precipitation.map((percent: number, index: number) => (
              <div
                key={`percent-${index}`}
                className="flex flex-col items-center justify-center"
              >
                <h3 className="text-lg font-semibold">{percent}%</h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
