"use client";

import { Button as DaisyButton, Table as DaisyTable } from "react-daisyui";

/*
This component is called by the GPT model to render a table with headers and one or more rows. It is defined by this JSON structure:
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
              description: "A unique identifier for the row.",
            },
            columns: {
              type: "array",
              description: "The column data for each header in this row.",
              items: {
                type: "object",
                properties: {
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
          },
          required: ["id", "columns"],
        },
      },
    },
    required: ["headers", "rows"],
  },
}
*/
interface ColumnArgs {
  header: string;
  value: string;
}

interface RowArgs {
  id: string;
  columns: ColumnArgs[];
  headers: string[];
  onClick: ({ id, value }: { id: string; value: string }) => void;
}

interface TableArgs {
  headers: string[];
  id: string;
  rows: RowArgs[];
  onClick: ({ id, value }: { id: string; value: string }) => void;
}

const renderHeader = (header: string) => <span key={header}>{header}</span>;

const renderRow = (args: RowArgs): JSX.Element => {
  const { id, columns, headers } = args;

  return (
    <DaisyTable.Row>
      {headers.map((header: string) => (
        <div key={id}>
          {columns.find(column => column.header == header)?.value}
        </div>
      ))}
    </DaisyTable.Row>
  );
};

const renderTable = (args: TableArgs) => {
  const { id, headers, rows, onClick } = args;

  return (
    <div className="overflow-x-auto">
      <DaisyTable
        id={id}
        className="rounded-box"
      >
        <DaisyTable.Head>{headers.map(renderHeader)}</DaisyTable.Head>
        <DaisyTable.Body>
          {rows.map((row: RowArgs) => renderRow({ ...row, headers, onClick }))}
        </DaisyTable.Body>
      </DaisyTable>
    </div>
  );
};

export default function Table(args: TableArgs): JSX.Element {
  const { headers, id, rows, onClick } = args;

  return (
    <div className="flex w-full flex-row items-start justify-start space-x-4 py-4">
      {renderTable({ headers, id, rows, onClick })}
    </div>
  );
}
