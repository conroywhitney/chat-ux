"use client";

type FormElement =
  | {
      id: string;
      label: string;
      type: "input" | "textarea" | "checkbox" | "radio" | "button";
    }
  | {
      id: string;
      label: string;
      type: "select";
      options: { label: string; value: string }[];
    };

type FormProps = {
  elements: FormElement[];
  submitLabel: string;
  onSubmit: (value: any) => void;
};

/*
This component is called by the GPT model to render a Form component with one or more inputs. It is defined by this JSON structure:
{
  name: "render_form",
  description: "Render a ReactJS/Tailwind/DaisyUI Form component to get one or more pieces of information from a user.",
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "A unique identifier that will let you match a return value back to this exact rendering."
      },
      elements: {
        type: "array",
        description: "The list of child form elements to render.",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "A unique identifier that will let you match a return value back to this specific form element.",
            },
            label: {
              type: "string",
              description: "The label text to display for the form element.",
            },
            options: {
              type: "array",
              description: "The list of options to display for a select element.",
              items: {
                type: "object",
                properties: {
                  label: {
                    type: "string",
                    description: "The label text to display for the option.",
                  },
                  value: {
                    type: "string",
                    description: "The value to return if this option is selected.",
                  },
                },
                required: ["label", "value"],
              },
            },
            type: {
              type: "string",
              enum: ["input", "textarea", "select", "checkbox", "radio", "button"],
              description: "The type of form element to render.",
            }
          },
          required: ["id", "label", "type"],
        },
      },
      submitLabel: {
        type: "string",
        description: "The text for the form's submit button."
      },
    }
  }
}
*/
export default function Form({
  elements,
  submitLabel,
  onSubmit
}: FormProps): JSX.Element {
  return (
    <form onSubmit={onSubmit}>
      {elements.map(element => {
        switch (element.type) {
          case "input":
            return (
              <div key={element.id}>
                <label htmlFor={element.id}>{element.label}</label>
                <input
                  type="text"
                  id={element.id}
                  name={element.id}
                />
              </div>
            );
          case "textarea":
            return (
              <div key={element.id}>
                <label htmlFor={element.id}>{element.label}</label>
                <textarea
                  id={element.id}
                  name={element.id}
                />
              </div>
            );
          case "select":
            return (
              <div key={element.id}>
                <label htmlFor={element.id}>{element.label}</label>
                <select
                  id={element.id}
                  name={element.id}
                >
                  <option value="">Select an option</option>
                  {element.options.map(option => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          case "checkbox":
            return (
              <div key={element.id}>
                <input
                  type="checkbox"
                  id={element.id}
                  name={element.id}
                />
                <label htmlFor={element.id}>{element.label}</label>
              </div>
            );
          case "radio":
            return (
              <div key={element.id}>
                <input
                  type="radio"
                  id={element.id}
                  name={element.id}
                />
                <label htmlFor={element.id}>{element.label}</label>
              </div>
            );
          default:
            return null;
        }
      })}
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
