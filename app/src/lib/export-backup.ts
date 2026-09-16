import { DB_TABLES, type DbRow, type DbTable } from "./db-schema";

const csvCell = (value: DbRow[string]): string => {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Kolom yang tidak boleh ikut ekspor. ponytail: akun admin hasil seed masih
 * menyimpan password PLAINTEXT ("admin123") sampai login pertama meng-hash-nya,
 * jadi mengekspor tabel `users` utuh = membocorkan kredensial ke berkas backup.
 */
const HIDDEN_COLUMNS: Partial<Record<DbTable, readonly string[]>> = {
  users: ["password"],
};

/** Kolom tabel untuk ekspor — tanpa kolom rahasia. */
export function exportColumns(table: DbTable): readonly string[] {
  const hidden = HIDDEN_COLUMNS[table];
  return hidden
    ? DB_TABLES[table].filter((column) => !hidden.includes(column))
    : DB_TABLES[table];
}

/** CSV satu tabel — untuk backup per tabel. */
export function tableToCsv(table: DbTable, rows: DbRow[]): string {
  const columns = exportColumns(table);
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
  return (Object.keys(DB_TABLES) as DbTable[]).map((table) => {
    const columns = exportColumns(table);
    return {
      name: table,
      header: columns,
      rows: rowsByTable[table].map((row) =>
        columns.map((column) => String(row[column] ?? "")),
      ),
    };
  });
}
