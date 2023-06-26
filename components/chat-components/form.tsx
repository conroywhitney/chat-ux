"use client";

type FormElement =
  | {
      id: string;
      label: string;
      type: "input" | "textarea";
    }
  | {
      id: string;
      label: string;
      type: "select" | "checkbox" | "radio";
      options: { label: string; value: string }[];
    };

type FormProps = {
  id: string;
  elements: FormElement[];
  submitLabel: string;
  onSubmit: (value: any) => void;
};

/*
This component is called by the GPT model to render a Form component with one or more inputs. It is defined by this JSON structure:
{
  name: "render_form",
  description:
    "Creates a form to gather information from the user systematically. Use this when multiple or complex information needs to be obtained.",
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
              enum: ["input", "textarea", "select", "checkbox", "radio"],
              description: "Type of the form element.",
            },
            options: {
              type: "array",
              description:
                "(Optional) For types select or checkbox, the options available to select.",
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
}
*/
export default function Form({
  id,
  elements,
  submitLabel,
  onSubmit,
}: FormProps): JSX.Element {
  return (
    <form onSubmit={onSubmit}>
      <input
        type="hidden"
        name="id"
        value={id}
      />
      {elements.map(element => {
        switch (element.type) {
          case "input":
            return (
              <div
                key={element.id}
                className="form-control w-full max-w-xs"
              >
                <label
                  htmlFor={element.id}
                  className="label"
                >
                  <span className="label-text">{element.label}</span>
                </label>
                <input
                  type="text"
                  id={element.id}
                  name={element.id}
                  className="input-bordered input w-full max-w-xs"
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
              <div
                key={element.id}
                className="form-control w-full max-w-xs"
              >
                <label
                  className="label"
                  htmlFor={element.id}
                >
                  <span className="label-text">{element.label}</span>
                </label>
                <select
                  id={element.id}
                  name={element.id}
                  className="select-bordered select"
                >
                  <option
                    disabled
                    selected
                  >
                    Pick one
                  </option>
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
              <div
                key={element.id}
                className="form-control"
              >
                {element.options.map(option => {
                  const elementId = [element.id, option.value].join("-");

                  return (
                    <label
                      htmlFor={elementId}
                      key={elementId}
                      className="label flex w-full cursor-pointer"
                    >
                      <input
                        className="checkbox flex-none"
                        id={elementId}
                        name={elementId}
                        type="checkbox"
                        value={option.label}
                      />
                      <span className="label-text ml-4 flex-1">
                        {option.label}
                      </span>
                    </label>
                  );
                })}
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
      <button
        type="submit"
        className="btn-primary btn mt-2"
      >
        {submitLabel}
      </button>
    </form>
  );
}
