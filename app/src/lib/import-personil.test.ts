import { describe, expect, test } from "bun:test";
import {
  parsePanitiaSheets,
  parsePengujiSheets,
  properName,
} from "./import-control";

describe("properName", () => {
  test("caps-lock dibetulkan, gelar & singkatan dipertahankan", () => {
    expect(properName("ERNI IKA ANDRIYANI, M.Pd")).toBe(
      "Erni Ika Andriyani, M.Pd",
    );
    expect(properName("Wulan puspitaningtyas")).toBe("Wulan Puspitaningtyas");
    expect(properName("NURUL HIKMAH, S.PD.")).toBe("Nurul Hikmah, S.Pd.");
    expect(properName("RIZKY HIKMAHDA, S.H")).toBe("Rizky Hikmahda, S.H");
    expect(properName("Uswatunhasanah, M.Pd")).toBe("Uswatunhasanah, M.Pd");
    expect(properName("Nurani,S.Ag.")).toBe("Nurani, S.Ag.");
    expect(properName("Diana Fajrin")).toBe("Diana Fajrin");
  });
});

describe("parsePengujiSheets file asli", () => {
  const cabang = new Set(["AW1"]);
  const materi = new Set(["M1", "M5"]);

  test("PENGUJI + BACKUP terbaca, REKAP dilewati, materi nama→ID", () => {
    const { rows, issues } = parsePengujiSheets(
      [
        {
          name: "PENGUJI",
          grid: [
            ["LIST PENGUJI"],
            [
              "Kode",
              "Nama Penguji",
              "Materi yang Diuji",
              "Ruangan",
              "Sesi",
              "Tanggal",
              "Jam",
            ],
            [
              "P-001",
              "ERNI IKA ANDRIYANI, M.Pd",
              "Calistung",
              "IN-1",
              "Sesi 1 – SD",
              "Ahad",
              "07.30",
            ],
            [
              "P-001",
              "ERNI IKA ANDRIYANI, M.Pd",
              "Calistung",
              "IN-2",
              "Sesi 1 – SD",
              "Ahad",
              "07.30",
            ],
          ],
        },
        {
          name: "REKAP PENGUJI",
          grid: [
            ["REKAP"],
            ["Kode", "Nama Penguji", "Materi", "Ruangan", "Sesi"],
            ["P-999", "Orang Rekap", "Calistung", "IN-9", "Sesi 9"],
          ],
        },
        {
          name: "BACKUP PENGUJI",
          grid: [
            ["DAFTAR BACKUP"],
            [
              "Kode Penguji",
              "Nama Backup",
              "Ruangan",
              "Sesi",
              "Tanggal",
              "Jam",
            ],
            ["", "Cadangan Satu, S.Pd.", "IN-1", "Sesi 2", "Ahad", "09.15"],
          ],
        },
      ],
      cabang,
      materi,
    );
    expect(rows).toEqual([
      {
        kode: "P-001",
        nama: "Erni Ika Andriyani, M.Pd",
        cabang_id: "",
        materi_id: "M1",
        ruang: "IN-1, IN-2",
        sesi: "Sesi 1 – SD",
      },
      {
        kode: "",
        nama: "Cadangan Satu, S.Pd.",
        cabang_id: "",
        materi_id: "",
        ruang: "IN-1",
        sesi: "Sesi 2",
      },
    ]);
    expect(issues).toHaveLength(0);
  });

  test("materi tak dikenal = lewati", () => {
    const { rows, issues } = parsePengujiSheets(
      [
        {
          name: "PENGUJI",
          grid: [
            ["Kode", "Nama Penguji", "Materi yang Diuji"],
            ["P-002", "Uji Dua", "Menari"],
          ],
        },
      ],
      new Set(),
      new Set(["M1"]),
    );
    expect(rows).toHaveLength(0);
    expect(issues).toHaveLength(1);
  });
});
describe("parsePengujiSheets template", () => {
  const cabang = new Set(["AW1", "AW3"]);
  const materi = new Set(["M1", "M2"]);

  test("kolom berdasar nama header; kode kosong diizinkan", () => {
    const { rows, issues } = parsePengujiSheets(
      [
        {
          name: "DATA PENGUJI",
          grid: [
            ["Nama", "Materi", "Kode", "Cabang"],
            ["Uji Satu", "M1", "P1", "AW1"],
            ["Uji Dua", "M2", "", "AW3"],
            ["CONTOH — HAPUS", "M1", "PX", "AW1"],
          ],
        },
      ],
      cabang,
      materi,
    );
    expect(rows).toEqual([
      {
        kode: "P1",
        nama: "Uji Satu",
        cabang_id: "AW1",
        materi_id: "M1",
        ruang: "",
        sesi: "",
      },
      {
        kode: "",
        nama: "Uji Dua",
        cabang_id: "AW3",
        materi_id: "M2",
        ruang: "",
        sesi: "",
      },
    ]);
    expect(issues).toHaveLength(0);
  });

  test("cabang/materi tak dikenal = lewati + issue", () => {
    const { rows, issues } = parsePengujiSheets(
      [
        {
          name: "DATA PENGUJI",
          grid: [
            ["Kode", "Nama", "Cabang", "Materi"],
            ["P9", "Uji X", "AW9", "M1"],
            ["P8", "Uji Y", "AW1", "M9"],
          ],
        },
      ],
      cabang,
      materi,
    );
    expect(rows).toHaveLength(0);
    expect(issues).toHaveLength(2);
  });
});

describe("parsePanitiaSheets", () => {
  test("kode wajib; contoh dilewati", () => {
    const { rows, issues } = parsePanitiaSheets([
      {
        name: "DATA PANITIA",
        grid: [
          ["Kode", "Nama"],
          ["SCAN-01", "Panitia Satu"],
          ["", "Tanpa Kode"],
          ["CX", "CONTOH — HAPUS"],
        ],
      },
    ]);
    expect(rows).toEqual([
      { kode: "SCAN-01", nama: "Panitia Satu", tugas: "", ruang: "", sesi: "" },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("Kode wajib diisi");
  });

  test("format file panitia asli: judul + Tugas dinormalisasi", () => {
    const { rows, issues } = parsePanitiaSheets([
      {
        name: "PANITIA",
        grid: [
          ["LIST PANITIA – USHER & TIME KEEPER"],
          [
            "Kode",
            "Nama Panitia",
            "Tugas",
            "Ruangan",
            "Sesi",
            "Tanggal",
            "Jam",
          ],
          [
            "U-001",
            "Teti Sunarwati, S. Ag",
            "Usher",
            "IN-1",
            "Sesi 1 – SD",
            "Ahad",
            "07.30",
          ],
          [
            "TK-001",
            " AYU SITI NURHAYATI ",
            "Time Keeper",
            "IN-1",
            "Sesi 1 – SD",
            "Ahad",
            "07.30",
          ],
        ],
      },
    ]);
    expect(rows).toEqual([
      {
        kode: "U-001",
        nama: "Teti Sunarwati, S. Ag",
        tugas: "Usher",
        ruang: "IN-1",
        sesi: "Sesi 1 – SD",
      },
      {
        kode: "TK-001",
        nama: "Ayu Siti Nurhayati",
        tugas: "Time Keeper",
        ruang: "IN-1",
        sesi: "Sesi 1 – SD",
      },
    ]);
    expect(issues).toHaveLength(0);
  });
});
