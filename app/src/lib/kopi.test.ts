import { afterAll, expect, test } from "bun:test";
import { dbDelete, dbRead } from "./db.server";
import { claimKopiCore, peekKopiCore } from "./kopi.server";
import { KUOTA_KOPI_PER_QR, labelVarian, sisaKuota } from "./kopi-meta";

// Kode siswa nyata dari seed control (mock db).
const KODE = "AW1-A001";

async function bersihkan() {
  for (const r of await dbRead("kopi", { kode_terdata: KODE }))
    await dbDelete("kopi", String(r.id ?? ""));
}
afterAll(bersihkan);

test("sisaKuota menurun dari jumlah baris dan tak negatif", () => {
  expect(sisaKuota([], KODE)).toBe(KUOTA_KOPI_PER_QR);
  expect(sisaKuota([{ kode_terdata: KODE }], KODE)).toBe(1);
  expect(
    sisaKuota([{ kode_terdata: KODE }, { kode_terdata: KODE }], KODE),
  ).toBe(0);
  expect(
    sisaKuota(
      [{ kode_terdata: KODE }, { kode_terdata: KODE }, { kode_terdata: KODE }],
      KODE,
    ),
  ).toBe(0);
  // kode lain tak dihitung
  expect(sisaKuota([{ kode_terdata: "AW1-A999" }], KODE)).toBe(2);
});

test("labelVarian", () => {
  expect(labelVarian("americano")).toBe("Americano");
  expect(labelVarian("aren-latte")).toBe("Aren Latte");
});

test("klaim 2 cup lalu kuota habis (mock)", async () => {
  await bersihkan();
  const awal = await peekKopiCore(KODE);
  expect(awal.sisa).toBe(KUOTA_KOPI_PER_QR);
  expect(awal.nama.length).toBeGreaterThan(0);

  const r = await claimKopiCore(KODE, ["americano", "aren-latte"], "BAR-01");
  expect(r.terpakai).toBe(2);
  expect(r.sisa).toBe(0);

  const status = await peekKopiCore(KODE);
  expect(status.sisa).toBe(0);

  await expect(claimKopiCore(KODE, ["americano"], "BAR-01")).rejects.toThrow();
});

test("klaim melebihi sisa ditolak", async () => {
  await bersihkan();
  await claimKopiCore(KODE, ["americano"], "BAR-01");
  await expect(
    claimKopiCore(KODE, ["americano", "aren-latte"], "BAR-01"),
  ).rejects.toThrow();
});

test("kode bukan siswa ditolak", async () => {
  await expect(peekKopiCore("BUKAN-SISWA")).rejects.toThrow();
});
