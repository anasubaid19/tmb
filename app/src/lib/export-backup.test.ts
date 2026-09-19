import { describe, expect, test } from "bun:test";
import {
  backupSheets,
  kehadiranSheet,
  nilaiSheet,
  tableToCsv,
} from "./export-backup";

describe("export-backup", () => {
  test("CSV escape koma/kutip/baris baru", () => {
    const csv = tableToCsv("cabang", [
      {
        id: "AW1",
        nama: 'Al "Wildan", 1\nGading',
        portal: "false",
        alamat: "",
        program: "",
        landing: "true",
      },
    ]);
    expect(csv).toBe(
      'id,nama,portal,alamat,program,landing\nAW1,"Al ""Wildan"", 1\nGading",false,,,true\n',
    );
  });

  test("grid XLSX memuat semua tabel", () => {
    const sheets = backupSheets({
      cabang: [{ id: "AW1" }],
      kelas: [],
      materi: [],
      jadwal: [],
      sesi: [],
      denah: [],
      penguji: [],
      siswa: [],
      users: [],
      config: [],
      kedatangan: [],
      pengumuman: [],
      lembar: [],
    });
    expect(sheets).toHaveLength(13);
    expect(sheets[0]).toMatchObject({ name: "cabang" });
    expect(sheets[0].rows).toEqual([["AW1", "", "", "", "", ""]]);
  });

  test("kehadiranSheet: filter tipe, urut waktu, jam WIB, nama terpetakan", () => {
    const sheet = kehadiranSheet(
      [
        {
          kode_terdata: "AWI-1",
          tipe: "siswa",
          waktu: "2026-09-18T08:04:00Z",
          oleh: "SCAN-01",
        },
        { kode_terdata: "P-1", tipe: "penguji", waktu: "2026-09-18T01:00:00Z" },
        { kode_terdata: "AWI-2", tipe: "siswa", waktu: "2026-09-18T07:00:00Z" },
      ],
      "siswa",
      new Map([["AWI-1", "Anas"]]),
    );
    expect(sheet.name).toBe("Kedatangan-siswa");
    expect(sheet.rows).toHaveLength(2);
    // urut waktu: AWI-2 (07.00Z) lebih dulu dari AWI-1 (08.04Z).
    expect(sheet.rows[0][0]).toBe("AWI-2");
    expect(sheet.rows[1][1]).toBe("Anas");
    expect(sheet.rows[1][2]).toContain("15"); // 08.04Z → 15.04 WIB
  });

  test("kehadiranSheet: 'Dicatat oleh' resolve kode panitia → nama", () => {
    const sheet = kehadiranSheet(
      [
        {
          kode_terdata: "AWI-1",
          tipe: "siswa",
          waktu: "2026-09-18T08:04:00Z",
          oleh: "SCAN-01",
        },
        {
          kode_terdata: "AWI-2",
          tipe: "siswa",
          waktu: "2026-09-18T07:00:00Z",
          oleh: "SCAN-99",
        },
      ],
      "siswa",
      new Map([
        ["AWI-1", "Anas"],
        ["SCAN-01", "Pak Andi"],
      ]),
    );
    // Terpetakan → nama; tak dikenal → fallback kode apa adanya.
    expect(sheet.rows[1][3]).toBe("Pak Andi");
    expect(sheet.rows[0][3]).toBe("SCAN-99");
  });

  test("nilaiSheet: satu jenjang, kolom nilai dari skema", () => {
    const sheet = nilaiSheet(
      "SMP",
      [
        { kode: "AWI-9", nama: "Budi", jenjang: "SMP", nilai_arabic: "86" },
        { kode: "AWI-1", nama: "Ani", jenjang: "SD", nilai_arabic: "70" },
      ],
      new Map([["AW3", "Al Wildan 3"]]),
    );
    expect(sheet.name).toBe("SMP");
    expect(sheet.rows).toHaveLength(1);
    expect(sheet.rows[0][0]).toBe("AWI-9");
    expect(sheet.header).toContain("nilai_arabic");
    expect(sheet.header).toContain("nilai_arabic_oleh");
  });
});
