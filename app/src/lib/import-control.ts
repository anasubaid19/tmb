import { ticketKode } from "./kode";
import { normalizePhone } from "./phone";

export interface ControlSiswa {
  cabang_id: string;
  nama: string;
  email: string;
  no_hp_wali: string;
  jenis_kelamin: string;
  jenjang: string;
  program: string;
  kelas_tujuan: string;
  peminatan: string;
  program_jurusan: string;
}

export interface ControlCabang {
  id: string;
  nama: string;
  portal: boolean;
  alamat: string;
  program: string;
  landing: boolean;
}

export interface ControlIssue {
  sheet: string;
  row: number | null;
  message: string;
}

export interface ControlData {
  cabang: ControlCabang[];
  siswa: ControlSiswa[];
  issues: ControlIssue[];
}

const PORTAL_BRANCH = "AW3";

// ponytail: nama resmi cabang, kapital semua (cermin scripts/import_siswa.py).
// Hanya AW4 yang angkanya sebelum "ISLAMIC SCHOOL".
const CABANG_KOTA: Record<string, string> = {
  AW1: "GADING SERPONG",
  AW3: "BSD CITY",
  AW4: "JAKARTA",
  AW5: "JAKARTA",
};

function cabangNama(id: string): string {
  const num = id.replace(/\D/g, "");
  const ekor = CABANG_KOTA[id] ? ` ${CABANG_KOTA[id]}` : "";
  return (
    id === "AW4"
      ? `AL-WILDAN ${num} ISLAMIC SCHOOL${ekor}`
      : `AL-WILDAN ISLAMIC SCHOOL ${num}${ekor}`
  ).trim();
}

const SEKOLAH_UTAMA: Record<string, { nama: string; program: string }> = {
  AW1: {
    nama: cabangNama("AW1"),
    program: "SD (Ikhwan/Akhwat) · SMP (Akhwat) · SMA (Akhwat)",
  },
  AW3: {
    nama: cabangNama("AW3"),
    program: "SMP (Ikhwan) · SMA (Ikhwan)",
  },
  AW4: {
    nama: cabangNama("AW4"),
    program: "SD (Ikhwan/Akhwat) · SMP (Ikhwan/Akhwat) · SMA (Ikhwan/Akhwat)",
  },
};

const cellString = (value: unknown): string => String(value ?? "").trim();

const normKelas = (value: unknown): string => {
  if (typeof value === "number" && Number.isInteger(value))
    return String(value);
  const s = cellString(value);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
};

const normProgram = (value: unknown): string => {
  const s = cellString(value).toUpperCase();
  if (s === "FULLDAY" || s === "FULDAY") return "FULLDAY";
  return s;
};

const normJk = (value: unknown): string => {
  const s = cellString(value).toUpperCase();
  if (s.startsWith("LAKI")) return "LAKI-LAKI";
  if (s.startsWith("PEREMPUAN")) return "PEREMPUAN";
  return s;
};

const normPeminatan = (value: unknown): string => {
  const s = cellString(value)
    .toUpperCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (s === "INTERNATIONAL") return "INTER";
  if (s === "AMERICA EUROPE") return "AE";
  return s;
};

const validEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function cabangRow(id: string): ControlCabang {
  const utama = SEKOLAH_UTAMA[id];
  return {
    id,
    nama: utama?.nama ?? cabangNama(id),
    portal: id === PORTAL_BRANCH,
    alamat: "",
    program: utama?.program ?? "",
    landing: utama !== undefined,
  };
}

export interface ControlSheet {
  name: string;
  /** Grid baris xlsx (header di baris pertama). */
  grid: unknown[][];
}

/**
 * Baca struktur F_DATA CONTROL langsung: sheet per cabang (REKAP dilewati,
 * sheet polos yang punya kembaran "_" dilewati), kolom posisi tetap
 * B..J seperti template internal.
 */
export function parseControlSheets(sheets: ControlSheet[]): ControlData {
  const issues: ControlIssue[] = [];
  const cabang: ControlCabang[] = [];
  const siswa: ControlSiswa[] = [];
  const names = sheets.map((sheet) => sheet.name);
  const twins = new Set(names.filter((name) => name.endsWith("_")));

  for (const { name: sheetName, grid } of sheets) {
    if (sheetName === "REKAP") continue;
    if (!sheetName.endsWith("_") && twins.has(`${sheetName}_`)) continue;
    const id = sheetName.replace(/_+$/, "").trim().toUpperCase();
    if (!/^AW\d+$/.test(id)) {
      issues.push({
        sheet: sheetName,
        row: null,
        message: "Nama sheet cabang tidak dikenal.",
      });
      continue;
    }
    if (!grid || grid.length === 0) {
      issues.push({ sheet: sheetName, row: null, message: "Sheet kosong." });
      continue;
    }
    const head = grid[0].map(cellString).map((h) => h.toUpperCase());
    if (
      !head[1]?.includes("NAMA") ||
      !head[5]?.includes("JENJANG") ||
      !head[7]?.includes("KELAS")
    ) {
      issues.push({
        sheet: sheetName,
        row: 1,
        message: "Header tidak cocok dengan template F_DATA CONTROL.",
      });
      continue;
    }
    cabang.push(cabangRow(id));
    for (let i = 1; i < grid.length; i += 1) {
      const row = grid[i];
      const nama = cellString(row[1]);
      if (!nama) continue;
      const email = cellString(row[2]);
      const program = normProgram(row[6]);
      const peminatan = normPeminatan(row[9]);
      if (email && !validEmail(email)) {
        issues.push({
          sheet: sheetName,
          row: i + 1,
          message: `Email tidak valid: ${email}.`,
        });
      }
      siswa.push({
        cabang_id: id,
        nama,
        email,
        no_hp_wali: normalizePhone(cellString(row[3])),
        jenis_kelamin: normJk(row[4]),
        jenjang: cellString(row[5]).toUpperCase(),
        program,
        kelas_tujuan: normKelas(row[7]),
        peminatan,
        program_jurusan: [program, peminatan].filter(Boolean).join(" · "),
      });
    }
  }

  if (cabang.length === 0) {
    throw new Error("File bukan F_DATA CONTROL: tidak ada sheet cabang valid.");
  }
  return { cabang, siswa, issues };
}

/** Kode berikutnya untuk cabang+jenjang (dipakai hanya untuk siswa baru). */
export function nextControlKode(
  cabangId: string,
  jenjang: string,
  used: Map<string, number>,
): string {
  const key = `${cabangId}|${jenjang}`;
  const seq = (used.get(key) ?? 0) + 1;
  used.set(key, seq);
  return ticketKode(cabangId, jenjang, seq);
}
