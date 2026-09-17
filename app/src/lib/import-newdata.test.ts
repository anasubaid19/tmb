import { describe, expect, test } from "bun:test";
import { isNewDataFile, parseNewDataSheets } from "./import-control";

const head = [
  "Timestamp",
  "No. Validasi Test/Daftar Ulang",
  "No",
  "EMAIL",
  "Nama Lengkap Calon Siswa",
  "Kode Daftar",
  "Jenis Kelamin",
  "Nomor WA Walimurid (yang dapat dihubungi)",
  "Jenis Pendaftaran",
  "Program",
  "Jenjang",
  "Program Penjurusan",
  "Kelas",
  "Asal Cabang AL-WILDAN",
  "RUANG TES",
  "LANTAI TES",
  "RUANG TES INT ORANG TUA",
  "LANTAI ORTU",
  "TANGGAL",
  "SESI",
  "PUKUL",
];

const row = (values: Record<number, unknown>): unknown[] => {
  const base: unknown[] = [
    "2026-09-15 07:05:06",
    "AWI-001",
    1,
    "Anak@Contoh.id",
    "Anak Satu",
    "27280101012",
    "Laki-Laki",
    "08123456789",
    "Siswa Baru (Non AL-WILDAN)",
    "Fullday",
    "SD",
    "Inter (SD)",
    1,
    "AL-WILDAN 4 JAKARTA SELATAN",
    "IN-4",
    "LT. 1 GEDUNG A",
    "PIR-7",
    "LT. 1 GEDUNG B",
    "2026-09-20 00:00:00",
    "SESI 1",
    "07.30 - 08.30 WIB",
  ];
  for (const [i, v] of Object.entries(values)) base[Number(i)] = v;
  return base;
};

const pivotGrid = (rows: unknown[][]): unknown[][] => [
  ["judul"],
  ["lokasi"],
  ["linktree"],
  ["denah"],
  ["catatan"],
  head,
  ...rows,
];

describe("parseNewDataSheets pivot", () => {
  test("kode + ruang dibaca sebaris apa adanya", () => {
    const data = parseNewDataSheets([
      { name: "PIVOT", grid: pivotGrid([row({})]) },
    ]);
    expect(data.cabang.map((c) => c.id)).toEqual(["AW4"]);
    expect(data.siswa).toHaveLength(1);
    expect(data.siswa[0]).toMatchObject({
      kode: "AWI-001",
      jenis_pendaftaran: "Siswa Baru (Non AL-WILDAN)",
      cabang_id: "AW4",
      nama: "Anak Satu",
      email: "Anak@Contoh.id",
      no_hp_wali: "08123456789",
      jenis_kelamin: "LAKI-LAKI",
      jenjang: "SD",
      kelas_tujuan: "1",
      peminatan: "INTER",
      program_jurusan: "FULLDAY · INTER",
      ruang_tes: "IN-4",
      lantai_tes: "LT. 1 GEDUNG A",
      ruang_ortu: "PIR-7",
      lantai_ortu: "LT. 1 GEDUNG B",
      sesi: "Sesi 1",
      pukul: "07.30 - 08.30 WIB",
      tanggal: "2026-09-20",
    });
    expect(data.issues).toHaveLength(0);
  });

  test("identitas sama + kode beda = dua baris (ganda dipertahankan)", () => {
    const data = parseNewDataSheets([
      {
        name: "PIVOT",
        grid: pivotGrid([
          row({}),
          row({ 1: "AWI-002", 14: "IN-5", 15: "LT. 2 GEDUNG A" }),
        ]),
      },
    ]);
    expect(data.siswa.map((s) => s.kode)).toEqual(["AWI-001", "AWI-002"]);
    expect(data.siswa[1].ruang_tes).toBe("IN-5");
  });

  test("kode sama dipakai dua orang = lewati + issue", () => {
    const data = parseNewDataSheets([
      {
        name: "PIVOT",
        grid: pivotGrid([
          row({}),
          row({ 4: "Anak Beda", 3: "beda@contoh.id", 7: "081299999999" }),
        ]),
      },
    ]);
    expect(data.siswa).toHaveLength(1);
    expect(data.issues).toHaveLength(1);
    expect(data.issues[0].message).toContain("AWI-001");
  });

  test("baris CONTOH + header ulangan dilewati; email jelek jadi issue", () => {
    const data = parseNewDataSheets([
      {
        name: "PIVOT",
        grid: pivotGrid([
          row({ 4: "CONTOH — HAPUS BARIS INI" }),
          head,
          row({ 1: "AWI-003", 3: "bukan-email", 4: "Anak Tiga" }),
        ]),
      },
    ]);
    expect(data.siswa.map((s) => s.kode)).toEqual(["AWI-003"]);
    expect(data.issues).toHaveLength(1);
    expect(data.issues[0].message).toContain("bukan-email");
  });

  test("tanpa sheet ruang = error panduan", () => {
    expect(() =>
      parseNewDataSheets([{ name: "SD (SESI 1)", grid: [["x"]] }]),
    ).toThrow("RUANG TES");
    expect(() => parseNewDataSheets([{ name: "AW3", grid: [["x"]] }])).toThrow(
      "RUANG TES",
    );
  });

  test("isNewDataFile", () => {
    expect(isNewDataFile([{ name: "X", grid: [["RUANG TES"]] }])).toBe(true);
    expect(isNewDataFile([{ name: "SD (SESI 1)", grid: [["x"]] }])).toBe(true);
    expect(isNewDataFile([{ name: "AW3", grid: [["x"]] }])).toBe(false);
  });
});
