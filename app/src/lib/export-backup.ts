import type { PengujiStat } from "./admin";
import { DB_TABLES, type DbRow, type DbTable } from "./db-schema";
import { wibDateTime } from "./waktu";

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
  return sheetToCsv({
    name: table,
    header: columns,
    rows: rows.map((row) => columns.map((column) => String(row[column] ?? ""))),
  });
}

export interface BackupSheet {
  name: string;
  header: readonly string[];
  rows: string[][];
}

/** CSV dari satu sheet (grid header + rows). */
export function sheetToCsv(sheet: BackupSheet): string {
  const lines = [sheet.header.join(",")];
  for (const row of sheet.rows) lines.push(row.map(csvCell).join(","));
  return `${lines.join("\n")}\n`;
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

/** Sheet "Penguji": Kode Login | Nama | Cabang | Materi | Ruang | Sesi. */
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
      cell(p, "ruang"),
      cell(p, "sesi"),
    ]);
  return {
    name: "Penguji",
    header: ["Kode Login", "Nama", "Cabang", "Materi", "Ruang", "Sesi"],
    rows,
  };
}

/** Sheet "Panitia": Kode Login | Nama | Tugas | Ruang | Sesi (tanpa password). */
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
      String(u.ruang ?? ""),
      String(u.sesi ?? ""),
    ]);
  return {
    name: "Panitia",
    header: ["Kode Login", "Nama", "Tugas", "Ruang", "Sesi"],
    rows,
  };
}

/** Sheet kedatangan satu tipe (siswa/penguji), diurut waktu. Murni. */
export function kehadiranSheet(
  rows: DbRow[],
  tipe: "siswa" | "penguji",
  namaByKode: Map<string, string>,
): BackupSheet {
  const list = rows
    .filter((r) => String(r.tipe ?? "") === tipe)
    .map((r) => ({ r, ts: Date.parse(String(r.waktu ?? "")) }))
    .filter((x) => !Number.isNaN(x.ts))
    .sort((a, b) => a.ts - b.ts);
  return {
    name: `Kedatangan-${tipe}`,
    header: ["Kode", "Nama", "Waktu (WIB)", "Dicatat oleh"],
    rows: list.map(({ r, ts }) => {
      const kode = String(r.kode_terdata ?? "");
      const oleh = String(r.oleh ?? "");
      return [
        kode,
        namaByKode.get(kode) ?? "",
        wibDateTime(ts),
        namaByKode.get(oleh) ?? oleh,
      ];
    }),
  };
}

/** Kolom nilai (prefix nilai_) dari skema siswa — daftar mengikuti skema. */
const NILAI_COLS = DB_TABLES.siswa.filter((c) => c.startsWith("nilai_"));

/** Sheet penilaian satu jenjang: identitas + semua kolom nilai. Murni. */
export function nilaiSheet(
  jenjang: string,
  siswa: DbRow[],
  cabangNama: Map<string, string>,
): BackupSheet {
  const rows = siswa
    .filter(
      (s) =>
        String(s.jenjang ?? "")
          .trim()
          .toUpperCase() === jenjang,
    )
    .sort((a, b) =>
      String(a.kode ?? "").localeCompare(String(b.kode ?? ""), "id", {
        numeric: true,
      }),
    )
    .map((s) => [
      String(s.kode ?? ""),
      String(s.nama ?? ""),
      cabangNama.get(String(s.cabang_id ?? "")) ?? String(s.cabang_id ?? ""),
      String(s.kelas_tujuan ?? ""),
      ...NILAI_COLS.map((c) => String(s[c] ?? "")),
    ]);
  return {
    name: jenjang,
    header: ["Kode", "Nama", "Cabang", "Kelas", ...NILAI_COLS],
    rows,
  };
}

const STAT_KOSONG: PengujiStat = {
  diujiPerMateri: {},
  totalDiuji: 0,
  interviewOrtu: 0,
  cabang: {},
};

const kodeAsc = (a: DbRow, b: DbRow): number =>
  String(a.kode ?? "").localeCompare(String(b.kode ?? ""), "id");

/** Sheet "Kegiatan": satu baris per penguji + rekap siswa diuji per cabang. Murni. */
export function kegiatanPengujiSheet(
  penguji: DbRow[],
  statByKode: Map<string, PengujiStat>,
  cabangNama: Map<string, string>,
  materiNama: Map<string, string>,
  materiDiuji: readonly string[],
  cabangIds: readonly string[],
): BackupSheet {
  const cell = (row: DbRow, key: string): string => String(row[key] ?? "");
  const rows = [...penguji].sort(kodeAsc).map((p) => {
    const stat = statByKode.get(cell(p, "kode")) ?? STAT_KOSONG;
    return [
      cell(p, "kode"),
      cell(p, "nama"),
      cabangNama.get(cell(p, "cabang_id")) ?? cell(p, "cabang_id"),
      materiNama.get(cell(p, "materi_id")) ?? cell(p, "materi_id"),
      cell(p, "ruang"),
      cell(p, "sesi"),
      ...cabangIds.map((c) => String(stat.cabang[c] ?? 0)),
      String(stat.totalDiuji),
      String(stat.interviewOrtu),
      ...materiDiuji.map((m) => String(stat.diujiPerMateri[m] ?? 0)),
    ];
  });
  return {
    name: "Kegiatan",
    header: [
      "Kode Login",
      "Nama",
      "Cabang",
      "Materi",
      "Ruang",
      "Sesi",
      ...cabangIds,
      "Total Diuji",
      "Interview Orangtua",
      ...materiDiuji.map((m) => `Diuji ${materiNama.get(m) ?? m}`),
    ],
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
