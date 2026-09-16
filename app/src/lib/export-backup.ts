import { DB_TABLES, type DbRow, type DbTable } from "./db-schema";

const csvCell = (value: DbRow[string]): string => {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV satu tabel — untuk backup per tabel. */
export function tableToCsv(table: DbTable, rows: DbRow[]): string {
  const columns = DB_TABLES[table];
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export interface BackupSheet {
  name: string;
  header: readonly string[];
  rows: string[][];
}

/** Grid semua tabel — untuk workbook XLSX satu file. */
export function backupSheets(
  rowsByTable: Record<DbTable, DbRow[]>,
): BackupSheet[] {
  return (Object.keys(DB_TABLES) as DbTable[]).map((table) => ({
    name: table,
    header: DB_TABLES[table],
    rows: rowsByTable[table].map((row) =>
      DB_TABLES[table].map((column) => String(row[column] ?? "")),
    ),
  }));
}
