import { ticketKode } from "./kode";
import { normalizePhone } from "./phone";

export interface ControlSiswa {
  /** Kode peserta. Kosong = generate otomatis; terisi (NEW-DATA) = dipertahankan. */
  kode: string;
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
  /** Arsip file pendaftaran — tanpa tampilan. */
  jenis_pendaftaran: string;
  /** Penugasan ruang per siswa (NEW-DATA pivot); kosong = belum ada. */
  ruang_tes: string;
  lantai_tes: string;
  ruang_ortu: string;
  lantai_ortu: string;
  sesi: string;
  pukul: string;
  tanggal: string;
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
        kode: "",
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
        jenis_pendaftaran: "",
        ruang_tes: "",
        lantai_tes: "",
        ruang_ortu: "",
        lantai_ortu: "",
        sesi: "",
        pukul: "",
        tanggal: "",
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

export interface ControlPenguji {
  kode: string;
  nama: string;
  cabang_id: string;
  materi_id: string;
  /** Plotting dari file: gabungan unik (", "-joined), mis. "IN-4, IN-6". */
  ruang: string;
  sesi: string;
}

export interface ControlPanitia {
  kode: string;
  nama: string;
  tugas: string;
  ruang: string;
  sesi: string;
}

export interface PersonilData<T> {
  rows: T[];
  issues: ControlIssue[];
}

/** Nama proper: campuran (M.Pd, Wulan, S.H) dibiarkan; sisanya dibetulkan
 *  per segmen titik — "ERNI"→Erni, "S.PD."→S.Pd., "puspitaningtyas"→Puspitaningtyas. */
export function properName(input: unknown): string {
  const properWord = (w: string): string => {
    if (/[A-Z]/.test(w) && /[a-z]/.test(w)) return w;
    const title = (s: string): string =>
      s.length <= 1 ? s : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return w.split(".").map(title).join(".");
  };
  return cellString(input)
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .split(" ")
    .map(properWord)
    .filter(Boolean)
    .join(" ");
}

// ponytail: template/file diisi manual — kolom dicari berdasar AWALAN header
// ("Nama Penguji", "Materi yang Diuji"…), bukan nama persis/posisi tetap.
function headerPrefix(head: string[], ...names: string[]): number {
  const up = head.map((h) => h.toUpperCase().trim());
  for (const n of names) {
    const i = up.findIndex((h) => h.startsWith(n));
    if (i >= 0) return i;
  }
  return -1;
}

// ponytail: nama materi file → id (M1 menampung Calistung SD + Math SMP/SMA,
// selaras deskripsi materi). Tak dikenal = skip + issue, jangan nebak.
const MATERI_NAMA: Record<string, string> = {
  CALISTUNG: "M1",
  "WRITTEN TEST MATH": "M1",
  MATH: "M1",
  ENGLISH: "M2",
  ARABIC: "M3",
  "AL-QUR'AN": "M4",
  ALQURAN: "M4",
  "INTERVIEW ORANG TUA": "M5",
  "INTERVIEW ORANGTUA": "M5",
};

function materiIdOf(value: unknown): string {
  const id = cellString(value).toUpperCase();
  if (/^M\d+$/.test(id)) return id;
  return (
    MATERI_NAMA[id.replace(/\s+/g, " ").trim()] ??
    MATERI_NAMA[id.replace(/[^A-Z]/g, "")] ??
    ""
  );
}

/** Gabung baris berkode sama (multi-ruang/sesi) — hanya untuk kode terisi;
 *  baris tanpa kode (backup) dibiarkan satu per satu untuk auto-kode. */
function gabungTugas<T extends { kode: string; ruang: string; sesi: string }>(
  rows: T[],
): T[] {
  const byKode = new Map<string, T>();
  const out: T[] = [];
  for (const r of rows) {
    const hit = r.kode ? byKode.get(r.kode.toUpperCase()) : undefined;
    if (!hit) {
      const copy = { ...r };
      if (r.kode) byKode.set(r.kode.toUpperCase(), copy);
      out.push(copy);
      continue;
    }
    for (const k of ["ruang", "sesi"] as const) {
      const gab = [
        ...new Set(
          [hit[k], r[k]]
            .flatMap((v) => String(v ?? "").split(","))
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ].join(", ");
      hit[k] = gab;
    }
  }
  return out;
}

/** Sheet personil yang relevan — REKAP/CATATAN selalu dilewati; BACKUP
 *  PENGUJI ikut (cadangan, dapat kode otomatis). */
function personilSheets(
  sheets: ControlSheet[],
  kind: "PENGUJI" | "PANITIA",
): ControlSheet[] {
  return sheets.filter((s) => {
    const name = s.name.toUpperCase();
    if (name.includes("REKAP") || name.includes("CATATAN")) return false;
    if (kind === "PENGUJI")
      return name.includes("PENGUJI") && !name.includes("PANITIA");
    return name.includes("PANITIA");
  });
}

/**
 * Baca data penguji (sheet PENGUJI + BACKUP PENGUJI): header di baris 2
 * (Kode, Nama Penguji, Materi yang Diuji, …). Kode apa adanya (P-001…);
 * kosong = otomatis. Materi nama→ID; cabang dikosongkan file (diisi "").
 */
export function parsePengujiSheets(
  sheets: ControlSheet[],
  cabangIds: Set<string>,
  materiIds: Set<string>,
): PersonilData<ControlPenguji> {
  const rows: ControlPenguji[] = [];
  const issues: ControlIssue[] = [];
  for (const { name: sheetName, grid } of personilSheets(sheets, "PENGUJI")) {
    if (!grid || grid.length < 2) continue;
    // ponytail: header di baris 1 (template) atau baris 2 (file panitia:
    // baris 1 = judul) — deteksi dari keberadaan NAMA.
    const headerRow =
      headerPrefix(grid[0].map(cellString), "NAMA") >= 0 ? 0 : 1;
    if (!grid[headerRow]) continue;
    const head = grid[headerRow].map(cellString);
    const iKode = headerPrefix(head, "KODE");
    const iNama = headerPrefix(head, "NAMA");
    const iCabang = headerPrefix(head, "CABANG");
    const iMateri = headerPrefix(head, "MATERI");
    const iRuang = headerPrefix(head, "RUANG");
    const iSesi = headerPrefix(head, "SESI");
    if (iNama < 0) {
      issues.push({
        sheet: sheetName,
        row: headerRow + 1,
        message: "Header NAMA tidak ditemukan.",
      });
      continue;
    }
    for (let i = headerRow + 1; i < grid.length; i += 1) {
      const row = grid[i];
      const nama = properName(row[iNama]);
      if (!nama || /^CONTOH\b/i.test(nama)) continue;
      const cabangId = cellString(row[iCabang]).toUpperCase();
      if (cabangId && !cabangIds.has(cabangId)) {
        issues.push({
          sheet: sheetName,
          row: i + 1,
          message: `Cabang tak dikenal: ${cabangId} — baris dilewati.`,
        });
        continue;
      }
      const materiId = iMateri >= 0 ? materiIdOf(row[iMateri]) : "";
      if (iMateri >= 0 && cellString(row[iMateri]) && !materiId) {
        issues.push({
          sheet: sheetName,
          row: i + 1,
          message: `Materi tak dikenal: ${cellString(row[iMateri])} — baris dilewati.`,
        });
        continue;
      }
      if (materiId && !materiIds.has(materiId)) {
        issues.push({
          sheet: sheetName,
          row: i + 1,
          message: `Materi ${materiId} belum ada di database — baris dilewati.`,
        });
        continue;
      }
      rows.push({
        kode: cellString(row[iKode]).toUpperCase(),
        nama,
        cabang_id: cabangId,
        materi_id: materiId,
        ruang: iRuang >= 0 ? cellString(row[iRuang]) : "",
        sesi: iSesi >= 0 ? cellString(row[iSesi]) : "",
      });
    }
  }
  return { rows: gabungTugas(rows), issues };
}

/**
 * Baca data panitia (sheet PANITIA): header di baris 2 (Kode, Nama Panitia,
 * Tugas, …). Tugas dinormalisasi (Usher/Time Keeper); kode apa adanya.
 */
export function parsePanitiaSheets(
  sheets: ControlSheet[],
): PersonilData<ControlPanitia> {
  const rows: ControlPanitia[] = [];
  const issues: ControlIssue[] = [];
  for (const { name: sheetName, grid } of personilSheets(sheets, "PANITIA")) {
    if (!grid || grid.length < 2) continue;
    const head = grid[0].map(cellString);
    const headerRow = headerPrefix(head, "NAMA") >= 0 ? 0 : 1;
    const h = grid[headerRow].map(cellString);
    const iKode = headerPrefix(h, "KODE");
    const iNama = headerPrefix(h, "NAMA");
    const iTugas = headerPrefix(h, "TUGAS", "PERAN", "ROLE");
    const iRuang = headerPrefix(h, "RUANG");
    const iSesi = headerPrefix(h, "SESI");
    if (iNama < 0) {
      issues.push({
        sheet: sheetName,
        row: headerRow + 1,
        message: "Header NAMA tidak ditemukan.",
      });
      continue;
    }
    for (let i = headerRow + 1; i < grid.length; i += 1) {
      const row = grid[i];
      const nama = properName(row[iNama]);
      if (!nama || /^CONTOH\b/i.test(nama)) continue;
      const kode = cellString(row[iKode]).toUpperCase();
      if (!kode) {
        issues.push({
          sheet: sheetName,
          row: i + 1,
          message: `Kode wajib diisi untuk ${nama} — baris dilewati.`,
        });
        continue;
      }
      const tugasRaw = cellString(row[iTugas]);
      const tugasUp = tugasRaw.toUpperCase().replace(/\s+/g, " ");
      const tugas =
        tugasUp === "USHER"
          ? "Usher"
          : tugasUp === "TIME KEEPER" || tugasUp === "TIMEKEEPER"
            ? "Time Keeper"
            : tugasRaw;
      rows.push({
        kode,
        nama,
        tugas,
        ruang: iRuang >= 0 ? cellString(row[iRuang]) : "",
        sesi: iSesi >= 0 ? cellString(row[iSesi]) : "",
      });
    }
  }
  return { rows: gabungTugas(rows), issues };
}

/** Sheet sesi NEW-DATA ("SD (SESI 1)", "SMP-SMA_AKH (SESI 2)", ...). */
export const isNewDataSheet = (name: string): boolean => /SESI/i.test(name);

// ponytail: asal cabang di NEW-DATA = cabang tujuan tes (tempat siswa terdaftar),
// bukan lokasi ujian (semua di AW3). Hanya AW1/AW3/AW4 yang dikenal.
const ASAL_CABANG: Record<string, string> = {
  "AL-WILDAN 1 GADING SERPONG": "AW1",
  "AL-WILDAN 3 BSD CITY": "AW3",
  "AL-WILDAN 4 JAKARTA SELATAN": "AW4",
};

// ponytail: Excel (raw:true) mengembalikan TANGGAL sebagai nomor seri
// (46285 = 2026-09-20) — konversi ke ISO, bukan string mentah.
const normTanggal = (value: unknown): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = Math.round((value - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  return cellString(value).split(" ")[0];
};

// ponytail: ambil kata pertama ("Inter (SD)"→INTER, "MQ - …"→MQ,
// "AE - …"→AE, "DI (…)"→DI) — cukup untuk kode program_jurusan.
const normPenjurusan = (value: unknown): string =>
  (cellString(value).split(/[\s(-]/)[0] ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

// ponytail: baris sesi & pivot berbagi 14 kolom identitas yang sama — satu
// konstruktor agar normalisasi (HP, JK, penjurusan) selalu identik di
// kedua sisi join. Kolom ruang diisi tahap pivot, bukan di sini.
function newDataSiswa(row: unknown[], cabangId: string): ControlSiswa {
  const program = normProgram(row[9]);
  const peminatan = normPenjurusan(row[11]);
  return {
    kode: cellString(row[1]),
    cabang_id: cabangId,
    nama: cellString(row[4]),
    email: cellString(row[3]),
    no_hp_wali: normalizePhone(cellString(row[7])),
    jenis_kelamin: normJk(row[6]),
    jenjang: cellString(row[10]).toUpperCase(),
    program,
    kelas_tujuan: normKelas(row[12]),
    peminatan,
    program_jurusan: [program, peminatan].filter(Boolean).join(" · "),
    jenis_pendaftaran: cellString(row[8]),
    ruang_tes: "",
    lantai_tes: "",
    ruang_ortu: "",
    lantai_ortu: "",
    sesi: "",
    pukul: "",
    tanggal: "",
  };
}
/** Sheet ruang NEW-DATA: header berisi "RUANG TES" (mis. PIVOT DCC…). */
function roomSheetIndex(grid: ControlSheet["grid"]): number {
  return grid.findIndex((row) =>
    row.some((cell) => cellString(cell).toUpperCase().includes("VALIDASI")),
  );
}

/** NEW-DATA = ada sheet SESI atau sheet ber-header RUANG TES. */
export function isNewDataFile(sheets: ControlSheet[]): boolean {
  return sheets.some(
    (s) =>
      isNewDataSheet(s.name) ||
      s.grid.some((row) =>
        row.some((c) => cellString(c).toUpperCase() === "RUANG TES"),
      ),
  );
}

const naturalOf = (s: ControlSiswa): string =>
  `${s.nama.trim().toUpperCase()}|${s.no_hp_wali}|${s.cabang_id}|${s.jenjang}`;
const mailOf = (s: ControlSiswa): string =>
  `${s.nama.trim().toUpperCase()}|${s.email.trim().toLowerCase()}`;

/** Kunci alami sama, atau email/HP sama-sama terisi dan sama. */
function identityMatch(a: ControlSiswa, b: ControlSiswa): boolean {
  if (naturalOf(a) === naturalOf(b)) return true;
  if (a.email && a.email.trim().toLowerCase() === b.email.trim().toLowerCase())
    return true;
  if (a.no_hp_wali && a.no_hp_wali === b.no_hp_wali) return true;
  return false;
}

/**
 * Baca format NEW-DATA pivot: kode + identitas + ruang dibaca sebaris apa
 * adanya dari sheet ber-header RUANG TES — nomor AWI file adalah nomor resmi.
 * Sheet sesi (tanpa RUANG TES) dilewati: kodenya bukan nomor resmi.
 * Aturan gabung antar-baris:
 * - kode sama + identitas cocok → gabung (isi yang kosong saja);
 * - kode sama + orang jelas beda → lewati + issue;
 * - identitas sama + kode beda → baris baru (data ganda dipertahankan);
 * - selain itu → baris baru.
 * Sheet berkolom SESI (DCC) didahulukan agar ejaan & sesi darinya menang.
 */
export function parseNewDataSheets(sheets: ControlSheet[]): ControlData {
  const issues: ControlIssue[] = [];
  const cabang: ControlCabang[] = [];
  const siswa: ControlSiswa[] = [];
  const seenCabang = new Set<string>();
  const pushCabang = (cabangId: string): void => {
    if (!seenCabang.has(cabangId)) {
      seenCabang.add(cabangId);
      cabang.push(cabangRow(cabangId));
    }
  };
  const checkEmail = (
    sheetName: string,
    rowNum: number,
    email: string,
  ): void => {
    if (email && !validEmail(email)) {
      issues.push({
        sheet: sheetName,
        row: rowNum,
        message: `Email tidak valid: ${email}.`,
      });
    }
  };

  const roomSheets = sheets
    .map((s) => {
      const headIdx = roomSheetIndex(s.grid);
      if (headIdx < 0) return null;
      const head = s.grid[headIdx].map((c) => cellString(c).toUpperCase());
      if (!head.includes("RUANG TES")) return null;
      return { name: s.name, grid: s.grid, headIdx, head };
    })
    .filter((s) => s !== null);
  if (roomSheets.length === 0) {
    throw new Error(
      "Tidak ada sheet ruang (header RUANG TES). Untuk format NEW-DATA sertakan sheet pivot ruang; atau gunakan template DATA SISWA.",
    );
  }
  // ponytail: DCC (berkolom SESI) dulu — ejaan & sesi darinya tak tertimpa.
  roomSheets.sort(
    (a, b) => Number(b.head.includes("SESI")) - Number(a.head.includes("SESI")),
  );

  const byKode = new Map<string, ControlSiswa>();
  const byNatural = new Map<string, ControlSiswa[]>();
  const byMail = new Map<string, ControlSiswa[]>();
  const register = (s: ControlSiswa): void => {
    if (s.kode) byKode.set(s.kode.toUpperCase(), s);
    const k = naturalOf(s);
    byNatural.set(k, [...(byNatural.get(k) ?? []), s]);
    if (s.email) {
      const m = mailOf(s);
      byMail.set(m, [...(byMail.get(m) ?? []), s]);
    }
  };

  for (const { name: sheetName, grid, headIdx, head } of roomSheets) {
    const ruangIdx = head.indexOf("RUANG TES");
    const ortuIdx = head.findIndex((h) => h.startsWith("RUANG TES INT"));
    const sesiIdx = head.indexOf("SESI");
    const pukulIdx = head.indexOf("PUKUL");
    const tanggalIdx = head.indexOf("TANGGAL");
    // ponytail: lantai/gedung = kolom tepat setelah tiap kolom RUANG yang
    // header-nya kosong ATAU bernama LANTAI (template pakai yang bernama).
    const isLantai = (idx: number): boolean => {
      const h = cellString(grid[headIdx][idx] ?? "").toUpperCase();
      return h === "" || h.includes("LANTAI");
    };
    const lantaiTesIdx = isLantai(ruangIdx + 1) ? ruangIdx + 1 : -1;
    const lantaiOrtuIdx =
      ortuIdx >= 0 && isLantai(ortuIdx + 1) ? ortuIdx + 1 : -1;
    for (let i = headIdx + 1; i < grid.length; i += 1) {
      const row = grid[i];
      const kode = cellString(row[1]);
      const nama = cellString(row[4]);
      // ponytail: lewati baris header yang keulang + baris CONTOH template.
      if (
        !nama ||
        /NAMA LENGKAP/i.test(nama) ||
        /VALIDASI/i.test(kode) ||
        /^CONTOH\b/i.test(nama)
      )
        continue;
      const cabangId = ASAL_CABANG[cellString(row[13]).toUpperCase()] ?? "";
      if (!cabangId) {
        issues.push({
          sheet: sheetName,
          row: i + 1,
          message: `Asal cabang tak dikenal: ${cellString(row[13])} — baris dilewati.`,
        });
        continue;
      }
      pushCabang(cabangId);
      const email = cellString(row[3]);
      checkEmail(sheetName, i + 1, email);
      const cand = newDataSiswa(row, cabangId);
      const sesiRaw =
        sesiIdx >= 0 ? cellString(row[sesiIdx]).toUpperCase() : "";
      const sesiMatch = /SESI\s*(\d)/.exec(sesiRaw);
      const assignment = {
        ruang_tes: cellString(row[ruangIdx]),
        lantai_tes: lantaiTesIdx >= 0 ? cellString(row[lantaiTesIdx]) : "",
        ruang_ortu: ortuIdx >= 0 ? cellString(row[ortuIdx]) : "",
        lantai_ortu: lantaiOrtuIdx >= 0 ? cellString(row[lantaiOrtuIdx]) : "",
        sesi: sesiMatch ? `Sesi ${sesiMatch[1]}` : sesiRaw,
        pukul: pukulIdx >= 0 ? cellString(row[pukulIdx]) : "",
        tanggal: tanggalIdx >= 0 ? normTanggal(row[tanggalIdx]) : "",
      };
      Object.assign(cand, assignment);
      const sameKode = cand.kode
        ? byKode.get(cand.kode.toUpperCase())
        : undefined;
      if (sameKode) {
        if (identityMatch(sameKode, cand)) {
          for (const [k, v] of Object.entries(assignment)) {
            if (v) sameKode[k as keyof typeof assignment] = v;
          }
        } else {
          issues.push({
            sheet: sheetName,
            row: i + 1,
            message: `Kode ${cand.kode} dipakai ${sameKode.nama} dan ${cand.nama} — baris dilewati.`,
          });
        }
        continue;
      }
      // ponytail: identitas sama + kode beda = baris baru (ganda
      // dipertahankan); nomor tak pernah ditulis ulang.
      siswa.push(cand);
      register(cand);
    }
  }
  return { cabang, siswa, issues };
}
