import { describe, expect, test } from "bun:test";
import type { PengujiStat } from "./admin";
import { kegiatanPengujiSheet, sheetToCsv } from "./export-backup";

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
