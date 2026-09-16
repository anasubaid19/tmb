import { describe, expect, test } from "bun:test";
import { nextControlKode, parseControlSheets } from "./import-control";

const head = [
  "NO",
  "NAMA LENGKAP",
  "EMAIL",
  "NO KONTAK",
  "JENIS KELAMIN",
  "JENJANG",
  "PROGRAM",
  "KELAS",
  "TYPE",
  "PEMINATAN",
];

describe("parseControlSheets", () => {
  test("memahami struktur F_DATA CONTROL", () => {
    const data = parseControlSheets([
      { name: "REKAP", grid: [["x"]] },
      { name: "AW3", grid: [head] },
      {
        name: "AW1_",
        grid: [
          head,
          [
            1,
            "Anak Satu",
            "Anak@Contoh.id",
            628123456789,
            "Laki-laki",
            "SD",
            "Fulday",
            1,
            null,
            "International",
          ],
          [
            2,
            "",
            "kosong@contoh.id",
            "08123",
            "Perempuan",
            "SMP",
            "FULLDAY",
            "7",
            null,
            "AE",
          ],
          [
            3,
            "Anak Tiga",
            "bukan-email",
            "08123",
            "Perempuan",
            "SMP",
            "FULLDAY",
            "7",
            null,
            "AE",
          ],
        ],
      },
      {
        name: "AW1",
        grid: [head, [1, "Sisa Dump", "", "", "", "", "", "", null, ""]],
      },
      { name: "XXX", grid: [head] },
    ]);

    expect(data.cabang.map((c) => c.id)).toEqual([
      "AW3",
      "AW1_".replace(/_+$/, ""),
    ]);
    expect(data.siswa).toHaveLength(2);
    expect(data.siswa[0]).toMatchObject({
      cabang_id: "AW1",
      nama: "Anak Satu",
      email: "Anak@Contoh.id",
      no_hp_wali: "08123456789",
      jenis_kelamin: "LAKI-LAKI",
      jenjang: "SD",
      kelas_tujuan: "1",
      program_jurusan: "FULLDAY · INTER",
    });
    expect(data.issues.map((i) => i.message)).toContain(
      "Email tidak valid: bukan-email.",
    );
    expect(data.issues.map((i) => i.sheet)).toContain("XXX");
  });

  test("kode berurutan per cabang+jenjang", () => {
    const used = new Map([["AW3|SMP", 7]]);
    expect(nextControlKode("AW3", "SMP", used)).toBe("AW3-B008");
    expect(nextControlKode("AW3", "SMA", used)).toBe("AW3-C001");
  });
});
