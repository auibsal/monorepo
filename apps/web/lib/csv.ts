/**
 * A CSV file as rows of named fields (RFC 4180: quoted fields may hold
 * commas, line breaks and doubled quotes). The first row names the columns;
 * empty lines are skipped. Read in the browser, so a file of personal data
 * goes straight from the officer's computer to the database.
 */
const BOM = /^﻿/;

/** A quoted field from its opening quote: its text and where it ends. */
const quotedField = (text: string, open: number): [string, number] => {
  let value = "";
  let at = open + 1;
  while (at < text.length) {
    if (text[at] === '"' && text[at + 1] === '"') {
      value += '"';
      at += 2;
    } else if (text[at] === '"') {
      return [value, at + 1];
    } else {
      value += text[at];
      at += 1;
    }
  }
  return [value, at];
};

/** The file's cells, row by row. */
const cellsOf = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  const endRow = () => {
    row.push(value);
    rows.push(row);
    row = [];
    value = "";
  };
  let at = 0;
  while (at < text.length) {
    const char = text[at];
    if (char === '"') {
      const [quoted, next] = quotedField(text, at);
      value += quoted;
      at = next;
      continue;
    }
    if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      endRow();
    } else if (char !== "\r") {
      value += char;
    }
    at += 1;
  }
  if (value !== "" || row.length > 0) {
    endRow();
  }
  return rows;
};

export const parseCsv = (source: string): Record<string, string>[] => {
  const [header = [], ...body] = cellsOf(source.replace(BOM, "")).filter((r) =>
    r.some((cell) => cell.trim() !== "")
  );
  const names = header.map((name) => name.trim());
  return body.map((cells) =>
    Object.fromEntries(names.map((name, i) => [name, cells[i] ?? ""]))
  );
};
