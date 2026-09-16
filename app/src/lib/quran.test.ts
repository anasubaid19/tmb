import { expect, test } from "bun:test";
import { mapDaftarSurah, mapSurahArab } from "./quran";

test("daftar surah dipetakan", () => {
  const out = mapDaftarSurah([
    {
      surahNo: 112,
      surahName: "Al-Ikhlaas",
      surahNameArabic: "الإخلاص",
      totalAyah: 4,
    },
  ]);
  expect(out).toEqual([
    { no: 112, nama: "Al-Ikhlaas", namaArab: "الإخلاص", totalAyah: 4 },
  ]);
  expect(mapDaftarSurah(null)).toEqual([]);
});

test("isi surah: arab saja, tanpa terjemahan", () => {
  const out = mapSurahArab(
    {
      surahName: "Al-Ikhlaas",
      surahNameArabic: "الإخلاص",
      arabic1: ["قُلْ هُوَ ٱللَّهُ أَحَدٌ", "ٱللَّهُ ٱلصَّمَدُ"],
      english: ["Say...", "Allah..."],
    },
    112,
  );
  expect(out.nama).toBe("Al-Ikhlaas");
  expect(out.ayat).toHaveLength(2);
  expect(out.ayat[0]).toEqual({ nomor: 1, arab: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" });
  expect("english" in out && "arti" in (out.ayat[0] as object)).toBe(false);
});
