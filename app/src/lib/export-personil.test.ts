import { describe, expect, test } from "bun:test";
import { panitiaSheet, pengujiSheet } from "./export-backup";

describe("ekspor personil", () => {
  test("penguji: join nama cabang + materi, urut kode", () => {
    const sheet = pengujiSheet(
      [
        {
          id: "2",
          kode: "P2",
          nama: "Uji Dua",
          cabang_id: "AW3",
          materi_id: "M2",
        },
        {
          id: "1",
          kode: "P1",
          nama: "Uji Satu",
          cabang_id: "AW1",
          materi_id: "",
        },
      ],
      new Map([["AW1", "AL-WILDAN ISLAMIC SCHOOL 1"]]),
      new Map([["M2", "Math"]]),
    );
    expect(sheet.name).toBe("Penguji");
    expect(sheet.header).toEqual(["Kode Login", "Nama", "Cabang", "Materi"]);
    expect(sheet.rows).toEqual([
      ["P1", "Uji Satu", "AL-WILDAN ISLAMIC SCHOOL 1", ""],
      ["P2", "Uji Dua", "AW3", "Math"],
    ]);
  });

  test("panitia: hanya role panitia, tanpa password", () => {
    const sheet = panitiaSheet([
      { kode: "SCAN-01", nama: "Panitia Satu", role: "panitia", password: "x" },
      { kode: "P1", nama: "Penguji", role: "penguji", password: "y" },
      { kode: "ADMIN-01", nama: "Admin", role: "admin", password: "z" },
    ]);
    expect(sheet.header).toEqual(["Kode Login", "Nama"]);
    expect(sheet.rows).toEqual([["SCAN-01", "Panitia Satu"]]);
    expect(JSON.stringify(sheet.rows)).not.toContain("password");
  });

  test("tabel kosong → header saja", () => {
    expect(pengujiSheet([], new Map(), new Map()).rows).toEqual([]);
    expect(panitiaSheet([]).rows).toEqual([]);
  });
});
