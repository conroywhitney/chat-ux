"use client";

import { Button as DaisyButton, Table as DaisyTable } from "react-daisyui";
import React from "react";

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
  id: string;
  value: string;
}

interface HeaderArgs {
  header: string;
  tableId: string;
}

interface RowArgs {
  columns: ColumnArgs[];
  detailsButton?: {
    id: string;
    label: string;
    value: string;
  };
  headers: string[];
  id: string;
  tableId: string;
  onClick: ({ id, value }: { id: string; value: string }) => void;
}

interface TableArgs {
  headers: string[];
  id: string;
  rows: RowArgs[];
  onClick: ({ id, value }: { id: string; value: string }) => void;
}

const renderHeader = (args: HeaderArgs) => {
  const { header, tableId } = args;
  const headerId = `${tableId}-header-${header}`;

  return (
    <span
      id={headerId}
      key={headerId}
    >
      {header}
    </span>
  );
};

const renderRow = (args: RowArgs) => {
  const { columns, detailsButton, headers, id, tableId, onClick } = args;
  const columnMap = new Map(
    columns.map(column => [
      column.header,
      { id: column.id, value: column.value },
    ])
  );
  const rowId = `${tableId}-row-${id}`;

  const elements = headers.map((header: string) => {
    const column = columnMap.get(header);

    if (!column) return <></>;

    const colId = `${rowId}-col-${column.id}`;

    return (
      <div
        id={colId}
        key={colId}
      >
        {column.value}
      </div>
    );
  });

  if (detailsButton) {
    const detailsId = `${rowId}-details-${detailsButton.id}`;

    elements.push(
      <DaisyButton
        id={detailsId}
        key={detailsId}
        onClick={() => onClick?.({ id: detailsId, value: detailsButton.value })}
      >
        {detailsButton.label}
      </DaisyButton>
    );
  }

  return elements;
};

const renderRows = (args: RowArgs): JSX.Element => {
  const { id, columns, detailsButton, headers, tableId, onClick } = args;
  const rowId = `${tableId}-row-${id}`;

  return (
    <DaisyTable.Row
      id={rowId}
      key={rowId}
    >
      {renderRow({ columns, detailsButton, headers, id, tableId, onClick })}
    </DaisyTable.Row>
  );
};

const renderTable = (args: TableArgs) => {
  const { id, headers, rows, onClick } = args;
  const tableId = `table-${id}`;

  return (
    <div className="overflow-x-auto">
      <DaisyTable
        id={tableId}
        key={tableId}
        className="rounded-box"
      >
        <DaisyTable.Head>
          {headers.map(header => renderHeader({ header, tableId }))}
        </DaisyTable.Head>
        <DaisyTable.Body>
          {rows.map((row: RowArgs) =>
            renderRows({ ...row, headers, tableId, onClick })
          )}
        </DaisyTable.Body>
      </DaisyTable>
    </div>
  );
};

export default function Table(args: TableArgs): JSX.Element {
  console.log("Table", args);
  const { headers, id, rows, onClick } = args;

  return (
    <div className="flex w-full flex-row items-start justify-start space-x-4 py-4">
      {renderTable({ headers, id, rows, onClick })}
    </div>
  );
}
