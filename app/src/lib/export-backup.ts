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

/** Sheet "Penguji": Kode Login | Nama | Cabang | Materi (nama, bukan ID). */
export function pengujiSheet(
  penguji: DbRow[],
  cabangNama: Map<string, string>,
  materiNama: Map<string, string>,
): BackupSheet {
  const cell = (row: DbRow, key: string): string => String(row[key] ?? "");
  const rows = [...penguji]
    .sort((a, b) => cell(a, "kode").localeCompare(cell(b, "kode"), "id"))
    .map((p) => [
      cell(p, "kode"),
      cell(p, "nama"),
      cabangNama.get(cell(p, "cabang_id")) ?? cell(p, "cabang_id"),
      materiNama.get(cell(p, "materi_id")) ?? cell(p, "materi_id"),
    ]);
  return {
    name: "Penguji",
    header: ["Kode Login", "Nama", "Cabang", "Materi"],
    rows,
  };
}

/** Sheet "Panitia": Kode Login | Nama | Tugas (tanpa password/kredensial). */
export function panitiaSheet(users: DbRow[]): BackupSheet {
  const rows = users
    .filter((u) => String(u.role ?? "") === "panitia")
    .sort((a, b) =>
      String(a.kode ?? "").localeCompare(String(b.kode ?? ""), "id"),
    )
    .map((u) => [
      String(u.kode ?? ""),
      String(u.nama ?? ""),
      String(u.tugas ?? ""),
    ]);
  return {
    name: "Panitia",
    header: ["Kode Login", "Nama", "Tugas"],
    rows,
  };
}

/** Workbook XLSX → data URL unduhan (dipakai ekspor personil + backup). */
export async function sheetsToXlsxDataUrl(
  sheets: BackupSheet[],
): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([[...sheet.header], ...sheet.rows]),
      sheet.name,
    );
  }
  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
  return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
}
