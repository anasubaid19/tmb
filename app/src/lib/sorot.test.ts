import { describe, expect, test } from "bun:test";
import { bagiSorotan } from "./sorot";

describe("bagiSorotan", () => {
  test("frasa cocok case-insensitive, teks lain utuh", () => {
    const hasil = bagiSorotan("dinyatakan LULUS sebagai Peserta Didik", [
      "LULUS",
    ]);
    expect(hasil).toEqual([
      { teks: "dinyatakan ", sorot: false },
      { teks: "LULUS", sorot: true },
      { teks: " sebagai Peserta Didik", sorot: false },
    ]);
  });

  test("frasa terpanjang menang atas yang pendek", () => {
    const hasil = bagiSorotan("Ketikkan nama ananda di kolom", [
      "nama",
      "Ketikkan nama ananda",
    ]);
    expect(hasil).toEqual([
      { teks: "Ketikkan nama ananda", sorot: true },
      { teks: " di kolom", sorot: false },
    ]);
  });

  test("karakter regex (+, .) di frasa tidak merusak pola", () => {
    const hasil = bagiSorotan("tekan Ctrl + F atau H+3 sesudahnya", [
      "Ctrl + F",
      "H+3",
    ]);
    expect(hasil.filter((s) => s.sorot).map((s) => s.teks)).toEqual([
      "Ctrl + F",
      "H+3",
    ]);
    expect(hasil.map((s) => s.teks).join("")).toBe(
      "tekan Ctrl + F atau H+3 sesudahnya",
    );
  });

  test("kata tunggal hanya cocok utuh (LULUS tak kena Kelulusan)", () => {
    const hasil = bagiSorotan("Belum Tercantum dalam Daftar Kelulusan", [
      "LULUS",
      "Belum Tercantum",
    ]);
    expect(hasil.filter((s) => s.sorot).map((s) => s.teks)).toEqual([
      "Belum Tercantum",
    ]);
  });

  test("tanpa kecocokan = satu segmen utuh", () => {
    expect(bagiSorotan("teks biasa", ["LULUS"])).toEqual([
      { teks: "teks biasa", sorot: false },
    ]);
  });
});
