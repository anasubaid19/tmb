import { describe, expect, test } from "bun:test";
import {
  nilaiResetUpdates,
  rekapColumnForMateri,
  statistikPenguji,
} from "./admin";

describe("statistikPenguji", () => {
  const rows = [
    {
      id: "1",
      cabang_id: "AW1",
      nilai_english_oleh: "P-026",
      nilai_ortu_oleh: "P-026",
    },
    { id: "2", cabang_id: "AW1", nilai_english_oleh: "P-026" },
    { id: "3", cabang_id: "AW2", nilai_quran_oleh: "P-026" },
    { id: "4", cabang_id: "AW2", nilai_english_oleh: "P-030" },
    { id: "5", cabang_id: "AW1", nilai_calistung_math_oleh: "P-026" },
    { id: "6", cabang_id: "AW1", nilai_english_oleh: "" },
  ];

  test("hitung per materi, total distinct, interview, sebaran cabang", () => {
    const s = statistikPenguji(rows, "P-026");
    expect(s.diujiPerMateri).toEqual({ M2: 2, M4: 1 });
    expect(s.totalDiuji).toBe(3);
    expect(s.interviewOrtu).toBe(1);
    expect(s.cabang).toEqual({ AW1: 2, AW2: 1 });
  });

  test("khusus interview (M5) tetap terhitung total & sebaran cabang", () => {
    const s = statistikPenguji(
      [
        { id: "1", cabang_id: "AW1", nilai_ortu_oleh: "P-026" },
        { id: "2", cabang_id: "AW3", nilai_ortu_oleh: "P-026" },
        { id: "3", cabang_id: "AW3", nilai_ortu_oleh: "P-030" },
      ],
      "P-026",
    );
    expect(s.interviewOrtu).toBe(2);
    expect(s.totalDiuji).toBe(2);
    expect(s.cabang).toEqual({ AW1: 1, AW3: 1 });
  });

  test("M1 (pengawas WR) tidak dihitung sebagai penguji", () => {
    const s = statistikPenguji(
      [{ id: "1", cabang_id: "AW1", nilai_calistung_math_oleh: "P-026" }],
      "P-026",
    );
    expect(s.totalDiuji).toBe(0);
    expect(s.diujiPerMateri).toEqual({});
  });

  test("kode kosong & kode tanpa kecocokan → nol", () => {
    const nol = {
      diujiPerMateri: {},
      totalDiuji: 0,
      interviewOrtu: 0,
      cabang: {},
    };
    expect(statistikPenguji(rows, "")).toEqual(nol);
    expect(statistikPenguji(rows, "P-999")).toEqual(nol);
  });
});

describe("rekapColumnForMateri", () => {
  test("M5 tampil total aspek (nilai), bukan catatan penguji", () => {
    expect(rekapColumnForMateri.M5).toBe("nilai_ortu_total");
    // materi lain tak berubah
    expect(rekapColumnForMateri.M2).toBe("nilai_english");
    expect(rekapColumnForMateri.M1).toBe("nilai_calistung_math");
  });
});

describe("nilaiResetUpdates", () => {
  test("mengosongkan semua kolom nilai + reset status, identitas utuh", () => {
    const updates = nilaiResetUpdates();
    expect(updates.status_ujian).toBe("belum");
    for (const [k, v] of Object.entries(updates)) {
      if (k === "status_ujian") continue;
      expect(k.startsWith("nilai_")).toBe(true);
      expect(v).toBe("");
    }
    // kolom identitas tidak boleh ikut terhapus
    for (const keep of [
      "id",
      "kode",
      "nama",
      "no_hp_wali",
      "email",
      "jenis_pendaftaran",
    ]) {
      expect(updates).not.toHaveProperty(keep);
    }
    // kolom nilai yang dikenal wajib tercakup
    for (const col of [
      "nilai_calistung_math",
      "nilai_english",
      "nilai_english_fluency",
      "nilai_arabic_pd",
      "nilai_santri_sholat",
      "nilai_ortu_ibadah",
      "nilai_ortu_total",
      "nilai_ortu_oleh",
    ]) {
      expect(updates[col]).toBe("");
    }
  });
});
