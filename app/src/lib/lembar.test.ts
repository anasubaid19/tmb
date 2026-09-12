import { expect, test } from "bun:test";
import { buildLembarTests, LEMBAR_TESTS } from "./lembar";

const MATERI = [
  { id: "M1", lembar_key: "mtk" },
  { id: "M2", lembar_key: "arb" },
  { id: "M3" },
  { id: "M4", lembar_key: "ing" },
  { id: "M5", lembar_key: "qur" },
];
const NAMA = new Map([
  ["P101", "Ahmad Hidayat"],
  ["P102", "Siti Rahma"],
]);

test("template tetap 4 baris tanpa nilai → semua paraf kosong", () => {
  const rows = buildLembarTests(MATERI, [], NAMA);
  expect(rows.map((r) => r.key)).toEqual(
    LEMBAR_TESTS.map((t) => t.key as string),
  );
  expect(rows.every((r) => r.paraf === null)).toBe(true);
});

test("baris nilai mengisi paraf baris yang dipetakan saja", () => {
  const rows = buildLembarTests(
    MATERI,
    [
      { materi_id: "M1", diisi_oleh: "P101" },
      { materi_id: "M4", diisi_oleh: "P102" },
    ],
    NAMA,
  );
  const byKey = new Map(rows.map((r) => [r.key, r.paraf]));
  expect(byKey.get("mtk")).toEqual({ nama: "Ahmad Hidayat", kode: "P101" });
  expect(byKey.get("ing")).toEqual({ nama: "Siti Rahma", kode: "P102" });
  // M3 tanpa lembar_key + baris arb/qur tanpa nilai → tetap kosong.
  expect(byKey.get("arb")).toBeNull();
  expect(byKey.get("qur")).toBeNull();
});

test("materi tanpa lembar_key diabaikan; kode asing jadi nama apa adanya", () => {
  const rows = buildLembarTests(
    MATERI,
    [
      { materi_id: "M3", diisi_oleh: "P101" },
      { materi_id: "M5", diisi_oleh: "PX9" },
    ],
    NAMA,
  );
  const byKey = new Map(rows.map((r) => [r.key, r.paraf]));
  expect(byKey.get("mtk")).toBeNull();
  expect(byKey.get("qur")).toEqual({ nama: "PX9", kode: "PX9" });
});
