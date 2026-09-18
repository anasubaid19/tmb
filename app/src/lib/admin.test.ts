import { describe, expect, test } from "bun:test";
import { nilaiResetUpdates } from "./admin";

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
