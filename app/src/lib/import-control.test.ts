import { describe, expect, test } from "bun:test";
import {
  nextControlKode,
  parseControlSheets,
  parsePengumumanSheets,
} from "./import-control";

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

describe("parsePengumumanSheets", () => {
  const phead = [
    "NO",
    "NAMA LENGKAP",
    "ASAL CABANG AL-WILDAN",
    "JENJANG/UNIT",
    "KELAS",
    "STATUS",
    "REMARKS",
  ];

  test("baca sheet LULUS, lewati blok judul + baris tanpa status", () => {
    const judul = [["DAFTAR SISWA"]]; // baris properti di atas header
    const data = parsePengumumanSheets([
      {
        name: "Sheet1",
        grid: [...judul, ["laporan internal"]],
      },
      {
        name: "DATA PESERTA LULUS",
        grid: [
          ...judul,
          ["Keterangan:"],
          phead,
          [
            1,
            "ABDULLAH YAR KHAN",
            "AL-WILDAN 01 GADING SERPONG",
            "SD",
            1,
            "LULUS",
            "ok",
          ],
          [
            2,
            "MARYAM",
            "AL-WILDAN 04 JAKARTA SELATAN",
            "SMP",
            7,
            "LULUS",
            null,
          ],
          [3, "Tanpa Status", "AL-WILDAN 03 BSD CITY", "SMA", 10, "", null],
          [
            4,
            "Tidak Lulus",
            "AL-WILDAN 03 BSD CITY",
            "SMA",
            "7 AE",
            "TIDAK LULUS",
            "catatan",
          ],
          [
            5,
            "Arsyad Hafizhan Yusuf",
            "AL-WILDAN 29 DEPOK",
            "SD",
            1,
            "TES LANJUTAN",
            "INFO DETAIL AKAN DISAMPAIKAN TIM HUMAS",
          ],
        ],
      },
    ]);
    expect(data.sheet).toBe("DATA PESERTA LULUS");
    expect(data.rows).toHaveLength(4);
    expect(data.rows[0]).toEqual({
      nama: "Abdullah Yar Khan",
      cabang: "AL-WILDAN 01 GADING SERPONG",
      jenjang: "SD",
      kelas: "1",
      status: "lulus",
      remarks: "",
    });
    // kelas teks berprogram dipertahankan; status "TIDAK LULUS" dibedakan.
    expect(data.rows[2].kelas).toBe("7 AE");
    expect(data.rows[2].status).toBe("tidak_lulus");
    expect(data.rows[2].remarks).toBe("catatan");
    // "TES LANJUTAN" disimpan (bukan dibuang), remarks informatif dipertahankan.
    expect(data.rows[3].status).toBe("tes_lanjutan");
    expect(data.rows[3].remarks).toBe("INFO DETAIL AKAN DISAMPAIKAN TIM HUMAS");
    expect(data.issues.map((i) => i.message)).toContain(
      "Tanpa Status: STATUS kosong — baris dilewati.",
    );
  });
});
