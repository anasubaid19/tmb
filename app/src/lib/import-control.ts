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
    ruang_tes: "",
    lantai_tes: "",
    ruang_ortu: "",
    lantai_ortu: "",
    sesi: "",
    pukul: "",
    tanggal: "",
  };
}

/**
 * Baca format NEW-DATA (daftar peserta per sesi): prolog ±5 baris, header di
 * baris berisi "No. Validasi", data setelahnya. Kolom: 1=No.Validasi
 * (AWI-xxx, dipertahankan), 3=email, 4=nama, 6=JK, 7=WA, 9=program,
 * 10=jenjang, 11=penjurusan, 12=kelas, 13=asal cabang.
 *
 * Penugasan ruang dibaca dari sheet pivot (header "RUANG TES", mis. PIVOT
 * DCC…) dan digabung via kunci alami — BUKAN via kode, karena penomoran AWI
 * sheet pivot basi (291/291 kode menunjuk orang berbeda vs sheet sesi).
 * Kolom lantai/gedung = tepat setelah tiap kolom RUANG. Baris yang hanya ada
 * di pivot (mis. AWI-292) ikut menjadi siswa baru dengan kodenya sendiri.
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
  // ponytail: validasi email + normalisasi dipakai sesi & pivot — satu fungsi.
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

  let foundSesi = false;
  for (const { name: sheetName, grid } of sheets) {
    if (!isNewDataSheet(sheetName)) continue;
    foundSesi = true;
    const headIdx = grid.findIndex((row) =>
      row.some((cell) => cellString(cell).toUpperCase().includes("VALIDASI")),
    );
    if (headIdx < 0) {
      issues.push({
        sheet: sheetName,
        row: null,
        message: "Header No. Validasi tidak ditemukan.",
      });
      continue;
    }
    for (let i = headIdx + 1; i < grid.length; i += 1) {
      const row = grid[i];
      const kode = cellString(row[1]);
      const nama = cellString(row[4]);
      // ponytail: lewati baris header yang keulang di tengah sheet.
      if (!nama || /NAMA LENGKAP/i.test(nama) || /VALIDASI/i.test(kode))
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
      siswa.push(newDataSiswa(row, cabangId));
    }
  }
  if (!foundSesi) throw new Error("File bukan NEW-DATA: tidak ada sheet SESI.");

  // ponytail: kunci alami sesi ↔ pivot (nama+HP+cabang+jenjang, fallback
  // nama+email) — penomoran AWI pivot basi, tak bisa dipakai join.
  const keyOf = (s: ControlSiswa): string =>
    `${s.nama.trim().toUpperCase()}|${s.no_hp_wali}|${s.cabang_id}|${s.jenjang}`;
  const mailOf = (s: ControlSiswa): string =>
    `${s.nama.trim().toUpperCase()}|${s.email.trim().toLowerCase()}`;
  const byKey = new Map<string, ControlSiswa[]>();
  for (const s of siswa) {
    const k = keyOf(s);
    byKey.set(k, [...(byKey.get(k) ?? []), s]);
  }
  // ponytail: fallback email hanya bila menunjuk tepat satu siswa — email
  // kakak-adik bisa sama untuk anak berbeda, jangan asal tempel.
  const byMail = new Map<string, ControlSiswa[]>();
  for (const s of siswa) {
    if (!s.email) continue;
    const k = mailOf(s);
    byMail.set(k, [...(byMail.get(k) ?? []), s]);
  }
  const pivotOnly = new Set<string>();

  for (const { name: sheetName, grid } of sheets) {
    const headIdx = grid.findIndex((row) =>
      row.some((cell) => cellString(cell).toUpperCase().includes("VALIDASI")),
    );
    if (headIdx < 0) continue;
    const head = grid[headIdx].map((c) => cellString(c).toUpperCase());
    const ruangIdx = head.indexOf("RUANG TES");
    if (ruangIdx < 0) continue;
    const ortuIdx = head.findIndex((h) => h.startsWith("RUANG TES INT"));
    const sesiIdx = head.indexOf("SESI");
    const pukulIdx = head.indexOf("PUKUL");
    const tanggalIdx = head.indexOf("TANGGAL");
    // ponytail: lantai/gedung = kolom tepat setelah tiap kolom RUANG, dan
    // header-nya memang kosong (bukan kolom data lain).
    const lantaiTesIdx =
      cellString(grid[headIdx][ruangIdx + 1] ?? "") === "" ? ruangIdx + 1 : -1;
    const lantaiOrtuIdx =
      ortuIdx >= 0 && cellString(grid[headIdx][ortuIdx + 1] ?? "") === ""
        ? ortuIdx + 1
        : -1;
    for (let i = headIdx + 1; i < grid.length; i += 1) {
      const row = grid[i];
      const kode = cellString(row[1]);
      const nama = cellString(row[4]);
      if (!nama || /NAMA LENGKAP/i.test(nama) || /VALIDASI/i.test(kode))
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
      const probe = newDataSiswa(row, cabangId);
      const sesiRaw = cellString(row[sesiIdx]).toUpperCase();
      const sesiMatch = /SESI\s*(\d)/.exec(sesiRaw);
      const assignment = {
        ruang_tes: cellString(row[ruangIdx]),
        lantai_tes: lantaiTesIdx >= 0 ? cellString(row[lantaiTesIdx]) : "",
        ruang_ortu: ortuIdx >= 0 ? cellString(row[ortuIdx]) : "",
        lantai_ortu: lantaiOrtuIdx >= 0 ? cellString(row[lantaiOrtuIdx]) : "",
        sesi: sesiMatch ? `Sesi ${sesiMatch[1]}` : sesiRaw,
        pukul: cellString(row[pukulIdx]),
        tanggal: normTanggal(row[tanggalIdx]),
      };
      const keyMatches = byKey.get(keyOf(probe)) ?? [];
      const mailMatches = probe.email ? (byMail.get(mailOf(probe)) ?? []) : [];
      // ponytail: tempel ke SEMUA salinan berkunci sama (pasangan duplikat)
      // agar ringkasan sync stabil (unchanged, bukan updated). Fallback email
      // hanya bila menunjuk tepat satu siswa (email kakak-adik bisa sama).
      const targets =
        keyMatches.length > 0
          ? keyMatches
          : mailMatches.length === 1
            ? mailMatches
            : [];
      // ponytail: hanya timpa dengan nilai tak-kosong — sheet pivot tanpa
      // kolom SESI (4 dari 5) tak boleh menghapus sesi dari sheet DCC.
      if (targets.length > 0) {
        for (const target of targets) {
          for (const [k, v] of Object.entries(assignment)) {
            if (v) target[k as keyof typeof assignment] = v;
          }
        }
        continue;
      }
      // ponytail: identitas pivot-only (mis. AWI-292) = siswa baru; kode
      // bawaannya dipakai apa adanya — tabrakan ditangani sync (skip+issue).
      const onlyKey = `pivot:${keyOf(probe)}`;
      if (pivotOnly.has(onlyKey)) continue;
      pivotOnly.add(onlyKey);
      siswa.push({ ...probe, ...assignment });
    }
  }
  return { cabang, siswa, issues };
}
