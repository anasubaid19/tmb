import { describe, expect, test } from "bun:test";
import { backupSheets, tableToCsv } from "./export-backup";

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
});
