import "server-only";

export type CsvColumn<T> = { label: string; value: (row: T) => string | number | null | undefined };

function escapeCsvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvField(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvField(c.value(row))).join(",")
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}
