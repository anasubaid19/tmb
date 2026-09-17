import { describe, expect, test } from "bun:test";
import { isNewDataSheet, parseNewDataSheets } from "./import-control";

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
];

const row = (
  kode: string,
  nama: string,
  extra: Record<number, unknown> = {},
): unknown[] =>
  [
    "2026-09-12 14:29:07",
    kode,
    1,
    "Anak@Contoh.id",
    nama,
    "27280401074",
    "Laki-Laki",
    "+62 812-3456-789",
    "Siswa Baru (Non AL-WILDAN)",
    "Fullday",
    "SD",
    "Inter (SD)",
    1,
    "AL-WILDAN 4 JAKARTA SELATAN",
  ].map((v, i) => (i in extra ? extra[i] : v));

const sesiGrid = (rows: unknown[][]): unknown[][] => [
  ["PEMBAGIAN RUANG TES CALISTUNG SD"],
  ["LOKASI TEST"],
  ["LINKTREE"],
  ["LINK DENAH"],
  ["catatan regulasi"],
  head,
  ...rows,
];

describe("parseNewDataSheets", () => {
  test("sheet sesi dipahami, kode AWI dipertahankan", () => {
    const data = parseNewDataSheets([
      { name: "DC", grid: [["x"]] },
      { name: "SD (SESI 1)", grid: sesiGrid([row("AWI-001", "Anak Satu")]) },
    ]);
    expect(data.cabang.map((c) => c.id)).toEqual(["AW4"]);
    expect(data.siswa).toHaveLength(1);
    expect(data.siswa[0]).toMatchObject({
      kode: "AWI-001",
      cabang_id: "AW4",
      nama: "Anak Satu",
      email: "Anak@Contoh.id",
      no_hp_wali: "08123456789",
      jenis_kelamin: "LAKI-LAKI",
      jenjang: "SD",
      kelas_tujuan: "1",
      peminatan: "INTER",
      program_jurusan: "FULLDAY · INTER",
    });
    expect(data.issues).toHaveLength(0);
  });

  test("baris header ulangan dilewati; email jelek jadi issue tapi baris masuk", () => {
    const data = parseNewDataSheets([
      {
        name: "SMP-SMA_AKH (SESI 2)",
        grid: sesiGrid([
          row("AWI-103", "Anak Dua", { 3: "bukan-email" }),
          head,
          row("AWI-104", "Anak Tiga", {
            13: "AL-WILDAN 1 GADING SERPONG",
            10: "SMA",
            11: "AE - Amerika Europe",
            9: "Boarding",
          }),
        ]),
      },
    ]);
    expect(data.siswa.map((s) => s.kode)).toEqual(["AWI-103", "AWI-104"]);
    expect(data.siswa[1]).toMatchObject({
      cabang_id: "AW1",
      jenjang: "SMA",
      program_jurusan: "BOARDING · AE",
    });
    expect(data.issues).toHaveLength(1);
    expect(data.issues[0].message).toContain("bukan-email");
  });

  test("asal cabang tak dikenal → issue + baris dilewati", () => {
    const data = parseNewDataSheets([
      {
        name: "SD (SESI 1)",
        grid: sesiGrid([row("AWI-009", "Anak X", { 13: "AL-WILDAN 9 entah" })]),
      },
    ]);
    expect(data.siswa).toHaveLength(0);
    expect(data.issues).toHaveLength(1);
  });

  test("tanpa sheet SESI → error", () => {
    expect(() => parseNewDataSheets([{ name: "AW3", grid: [["x"]] }])).toThrow(
      "NEW-DATA",
    );
  });

  test("isNewDataSheet", () => {
    expect(isNewDataSheet("SD (SESI 1)")).toBe(true);
    expect(isNewDataSheet("SMP-SMA_IKH(SESI 3)")).toBe(true);
    expect(isNewDataSheet("AW3")).toBe(false);
    expect(isNewDataSheet("REKAP")).toBe(false);
  });
});

const pivotHead = [
  ...head,
  "RUANG TES",
  "",
  "RUANG TES INT ORANG TUA",
  "",
  "TANGGAL",
  "SESI",
  "PUKUL",
];

const pivotRow = (values: Record<number, unknown>): unknown[] => {
  const base: unknown[] = [...row("AWI-900", "Anak Satu")];
  while (base.length < pivotHead.length) base.push("");
  for (const [i, v] of Object.entries(values)) base[Number(i)] = v;
  return base;
};

describe("parseNewDataSheets ruang", () => {
  test("ruang digabung via kunci alami, bukan kode pivot yang basi", () => {
    const data = parseNewDataSheets([
      { name: "SD (SESI 1)", grid: sesiGrid([row("AWI-001", "Anak Satu")]) },
      {
        name: "PIVOT DCC_PIVOT_DATA CONTROL ON",
        grid: [
          ["judul"],
          ["lokasi"],
          ["linktree"],
          ["denah"],
          ["catatan"],
          pivotHead,
          pivotRow({
            1: "AWI-900",
            14: "IN-4",
            15: "LT. 1 GEDUNG A",
            16: "PIR-7",
            17: "LT. 1 GEDUNG B",
            // ponytail: Excel mentah memberi TANGGAL sebagai nomor seri.
            18: 46285,
            19: "SESI 1",
            20: "07.30 - 08.30 WIB",
          }),
        ],
      },
    ]);
    // sesi 1 siswa + 0 pivot-only (baris pivot menempel ke siswa sesi)
    expect(data.siswa).toHaveLength(1);
    expect(data.siswa[0]).toMatchObject({
      kode: "AWI-001",
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

  test("identitas pivot-only menjadi siswa baru dengan kodenya sendiri", () => {
    const shakila = pivotRow({
      1: "AWI-292",
      3: "shakila@contoh.id",
      4: "Shakila Saja",
      7: "081300000001",
      13: "AL-WILDAN 1 GADING SERPONG",
      10: "SMP",
      11: "AE - Amerika Europe",
      9: "Boarding",
      14: "IN-4",
      15: "LT. 1 GEDUNG A",
      16: "PIR-7",
      17: "LT. 1 GEDUNG B",
      18: "2026-09-20 00:00:00",
      19: "SESI 2",
      20: "09.15 - 10.15 WIB",
    });
    const data = parseNewDataSheets([
      { name: "SD (SESI 1)", grid: sesiGrid([row("AWI-001", "Anak Satu")]) },
      {
        name: "PIVOT DCC_PIVOT_DATA CONTROL ON",
        grid: [["j"], ["l"], ["t"], ["d"], ["c"], pivotHead, shakila],
      },
    ]);
    expect(data.siswa).toHaveLength(2);
    const s = data.siswa.find((x) => x.kode === "AWI-292");
    expect(s).toMatchObject({
      nama: "Shakila Saja",
      cabang_id: "AW1",
      jenjang: "SMP",
      ruang_tes: "IN-4",
      sesi: "Sesi 2",
    });
  });
});
