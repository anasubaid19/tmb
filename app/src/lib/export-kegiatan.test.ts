import { describe, expect, test } from "bun:test";
import type { PengujiStat } from "./admin";
import {
  calistungPengujiSheet,
  kegiatanPengujiSheet,
  sheetToCsv,
  statistikCalistung,
} from "./export-backup";

const kosong: PengujiStat = {
  diujiPerMateri: {},
  totalDiuji: 0,
  interviewOrtu: 0,
  cabang: {},
};

const statP026: PengujiStat = {
  diujiPerMateri: { M2: 2, M4: 1 },
  totalDiuji: 3,
  interviewOrtu: 1,
  cabang: { AW1: 2, AW2: 1 },
};

const cabangNama = new Map([
  ["AW1", "Al Wildan 1"],
  ["AW2", "Al Wildan 2"],
]);
const materiNama = new Map([
  ["M2", "English"],
  ["M3", "Arabic"],
  ["M4", "Quran"],
]);
const MATERI = ["M2", "M3", "M4"] as const;
const CABANG = ["AW1", "AW2"] as const;

describe("ekspor kegiatan penguji", () => {
  test("kegiatan: join nama + kolom per cabang + total, urut kode", () => {
    const sheet = kegiatanPengujiSheet(
      [
        { kode: "P-030", nama: "Hadi", cabang_id: "AW1", materi_id: "M2" },
        {
          kode: "P-026",
          nama: "Adi",
          cabang_id: "AW2",
          materi_id: "M2",
          ruang: "IN-1",
          sesi: "Sesi 1",
        },
      ],
      new Map([
        ["P-026", statP026],
        ["P-030", kosong],
      ]),
      cabangNama,
      materiNama,
      MATERI,
      CABANG,
    );
    expect(sheet.name).toBe("Kegiatan");
    expect(sheet.header).toEqual([
      "Kode Login",
      "Nama",
      "Cabang",
      "Materi",
      "Ruang",
      "Sesi",
      "AW1",
      "AW2",
      "Total Diuji",
      "Interview Orangtua",
      "Diuji English",
      "Diuji Arabic",
      "Diuji Quran",
    ]);
    expect(sheet.rows).toEqual([
      [
        "P-026",
        "Adi",
        "Al Wildan 2",
        "English",
        "IN-1",
        "Sesi 1",
        "2",
        "1",
        "3",
        "1",
        "2",
        "0",
        "1",
      ],
      [
        "P-030",
        "Hadi",
        "Al Wildan 1",
        "English",
        "",
        "",
        "0",
        "0",
        "0",
        "0",
        "0",
        "0",
        "0",
      ],
    ]);
  });

  test("tanpa penguji → header saja", () => {
    expect(
      kegiatanPengujiSheet(
        [],
        new Map(),
        cabangNama,
        materiNama,
        MATERI,
        CABANG,
      ).rows,
    ).toEqual([]);
  });

  test("sheetToCsv: escape koma/kutip", () => {
    const csv = sheetToCsv({
      name: "x",
      header: ["a", "b"],
      rows: [['Al "Wildan", 1', "ok"]],
    });
    expect(csv).toBe('a,b\n"Al ""Wildan"", 1",ok\n');
  });
});

describe("ekspor detail penguji calistung", () => {
  const fallback = new Map([
    ["AW1", "P-002"],
    ["AW2", "P-116"],
  ]);
  const calistungKodeSet = new Set(["P-002", "P-116"]);

  test("statistikCalistung: fallback pengampu, cap WR ter-skip, nilai kosong lewat", () => {
    const stats = statistikCalistung(
      [
        { id: "s1", cabang_id: "AW1", nilai_calistung_math: "15" },
        { id: "s2", cabang_id: "AW1", nilai_calistung_math: "12" },
        {
          id: "s3",
          cabang_id: "AW3",
          nilai_calistung_math: "10",
          nilai_calistung_math_oleh: "P-002",
        },
        {
          id: "s4",
          cabang_id: "AW3",
          nilai_calistung_math: "9",
          nilai_calistung_math_oleh: "WR-1",
        },
        { id: "s5", cabang_id: "AW1", nilai_calistung_math: "" },
        { id: "s6", cabang_id: "AW2", nilai_calistung_math: "11" },
      ],
      fallback,
      calistungKodeSet,
    );
    expect(stats.get("P-002")).toEqual({
      diujiPerMateri: {},
      totalDiuji: 3,
      interviewOrtu: 0,
      cabang: { AW1: 2, AW3: 1 },
    });
    expect(stats.get("P-116")).toEqual({
      diujiPerMateri: {},
      totalDiuji: 1,
      interviewOrtu: 0,
      cabang: { AW2: 1 },
    });
    expect(stats.has("WR-1")).toBe(false);
  });

  test("calistungPengujiSheet: kolom per cabang + total, urut kode", () => {
    const stats = statistikCalistung(
      [
        { id: "s1", cabang_id: "AW1", nilai_calistung_math: "15" },
        {
          id: "s2",
          cabang_id: "AW3",
          nilai_calistung_math: "10",
          nilai_calistung_math_oleh: "P-002",
        },
        { id: "s3", cabang_id: "AW2", nilai_calistung_math: "11" },
      ],
      fallback,
      calistungKodeSet,
    );
    const sheet = calistungPengujiSheet(
      [
        { kode: "P-116", nama: "Sofiatul", cabang_id: "AW1", materi_id: "M1" },
        {
          kode: "P-002",
          nama: "Ully",
          cabang_id: "AW1",
          materi_id: "M1",
          ruang: "R1",
          sesi: "S1",
        },
      ],
      stats,
      new Map([
        ["AW1", "Al Wildan 1"],
        ["AW2", "Al Wildan 2"],
        ["AW3", "Al Wildan 3"],
      ]),
      new Map([["M1", "Calistung / Math"]]),
      ["AW1", "AW2", "AW3"],
    );
    expect(sheet.name).toBe("Calistung");
    expect(sheet.header).toEqual([
      "Kode Login",
      "Nama",
      "Cabang",
      "Materi",
      "Ruang",
      "Sesi",
      "AW1",
      "AW2",
      "AW3",
      "Total Diuji",
    ]);
    expect(sheet.rows).toEqual([
      [
        "P-002",
        "Ully",
        "Al Wildan 1",
        "Calistung / Math",
        "R1",
        "S1",
        "1",
        "0",
        "1",
        "2",
      ],
      [
        "P-116",
        "Sofiatul",
        "Al Wildan 1",
        "Calistung / Math",
        "",
        "",
        "0",
        "1",
        "0",
        "1",
      ],
    ]);
  });
});
