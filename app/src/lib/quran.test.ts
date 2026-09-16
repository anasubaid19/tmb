import { expect, test } from "bun:test";
import { mapDaftarSurah, mapSurahArab } from "./quran";

test("daftar surah dipetakan dari data.surahs", () => {
  const out = mapDaftarSurah({
    success: true,
    data: {
      total: 114,
      surahs: [
        {
          number: 112,
          name_arabic: "الإخلاص",
          name_english: "Al-Ikhlas",
          verses_count: 4,
        },
      ],
    },
  });
  expect(out).toEqual([
    { no: 112, nama: "Al-Ikhlas", namaArab: "الإخلاص", totalAyah: 4 },
  ]);
  expect(mapDaftarSurah(null)).toEqual([]);
  expect(mapDaftarSurah({ data: {} })).toEqual([]);
});

test("isi surah: arab saja, tanpa terjemahan, spasi tepi dibuang", () => {
  const out = mapSurahArab(
    {
      success: true,
      data: {
        surah: {
          number: 112,
          name_arabic: "الإخلاص",
          name_english: "Al-Ikhlas",
          verses_count: 2,
        },
        verses: [
          {
            verse_key: "112:1",
            ayah: 1,
            arabic: " قُلْ هُوَ ٱللَّهُ أَحَدٌ",
            translations: { indonesian: "Katakanlah…" },
          },
          {
            verse_key: "112:2",
            ayah: 2,
            arabic: "ٱللَّهُ ٱلصَّمَدُ ",
          },
        ],
      },
    },
    112,
  );
  expect(out.nama).toBe("Al-Ikhlas");
  expect(out.namaArab).toBe("الإخلاص");
  expect(out.ayat).toHaveLength(2);
  expect(out.ayat[0]).toEqual({ nomor: 1, arab: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" });
  expect(out.ayat[1]).toEqual({ nomor: 2, arab: "ٱللَّهُ ٱلصَّمَدُ" });
  expect("translations" in out).toBe(false);
});
