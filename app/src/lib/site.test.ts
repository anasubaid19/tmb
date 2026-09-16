import { expect, test } from "bun:test";
import type { GasRow } from "./gas.server";
import {
  compareCabangId,
  isCabangDiuji,
  mergeConfig,
  mergeSesi,
  withFlight,
} from "./site";

const rows = (list: [string, string, string][]): GasRow[] =>
  list.map(([key, value, cabang_id], i) => ({
    id: i + 1,
    key,
    value,
    cabang_id,
  }));

test("default tampil semua kecuali countdown & pengumuman", () => {
  const cfg = mergeConfig([], "AW3");
  expect(cfg.showJadwal).toBe(true);
  expect(cfg.showPengumuman).toBe(true);
  expect(cfg.countdownEnabled).toBe(false);
  expect(cfg.umumkanHasil).toBe(false);
});

test("global false menyembunyikan bagian", () => {
  const cfg = mergeConfig(rows([["show_jadwal", "false", ""]]), "AW3");
  expect(cfg.showJadwal).toBe(false);
  expect(cfg.showKelas).toBe(true);
});

test("config cabang menimpa global", () => {
  const cfg = mergeConfig(
    rows([
      ["show_denah", "false", ""],
      ["show_denah", "true", "AW1"],
    ]),
    "AW1",
  );
  expect(cfg.showDenah).toBe(true);
  const other = mergeConfig(
    rows([
      ["show_denah", "false", ""],
      ["show_denah", "true", "AW1"],
    ]),
    "AW3",
  );
  expect(other.showDenah).toBe(false);
});

test("uji_cabang: default ikut; global & per-cabang menimpa", () => {
  expect(isCabangDiuji([], "AW1")).toBe(true);
  expect(isCabangDiuji(rows([["uji_cabang", "false", ""]]), "AW1")).toBe(false);
  expect(isCabangDiuji(rows([["uji_cabang", "0", "AW1"]]), "AW1")).toBe(false);
  expect(isCabangDiuji(rows([["uji_cabang", "0", "AW1"]]), "AW3")).toBe(true);
  const r = rows([
    ["uji_cabang", "false", ""],
    ["uji_cabang", "true", "AW1"],
  ]);
  expect(isCabangDiuji(r, "AW1")).toBe(true);
  expect(isCabangDiuji(r, "AW3")).toBe(false);
});

test("cabang terurut sesuai nomor (AW2 < AW10)", () => {
  const ids = ["AW1", "AW10", "AW11", "AW2", "AW3"];
  expect([...ids].sort(compareCabangId)).toEqual([
    "AW1",
    "AW2",
    "AW3",
    "AW10",
    "AW11",
  ]);
});

test("countdown & umumkan hasil terbaca", () => {
  const cfg = mergeConfig(
    rows([
      ["countdown_enabled", "TRUE", ""],
      ["countdown_at", "2026-09-19T07:00:00+07:00", ""],
      ["umumkan_hasil", "1", ""],
    ]),
    "AW3",
  );
  expect(cfg.countdownEnabled).toBe(true);
  expect(cfg.countdownAt).toBe("2026-09-19T07:00:00+07:00");
  expect(cfg.umumkanHasil).toBe(true);
});

const sesiRows = (list: [string, string, string, string, string][]): GasRow[] =>
  list.map(([sesi, cabang_id, jenjang, waktu, tampil], i) => ({
    id: `S${i + 1}`,
    sesi,
    cabang_id,
    jenjang,
    waktu,
    tampil,
  }));

test("sesi kosong = default SESI_UJIAN 3 baris", () => {
  const s = mergeSesi([], "AW3");
  expect(s.map((x) => x.sesi)).toEqual(["Sesi 1", "Sesi 2", "Sesi 3"]);
  expect(s[1]).toEqual({
    sesi: "Sesi 2",
    jenjang: "SMP & SMA (Akhwat)",
    waktu: "09.15–10.15",
  });
});

test("sesi cabang menimpa global", () => {
  const r = sesiRows([
    ["Sesi 2", "", "SMP & SMA (Akhwat)", "09.15–10.15", "true"],
    ["Sesi 2", "AW1", "SMP & SMA (Akhwat)", "09.30–10.30", "true"],
  ]);
  const aw1 = mergeSesi(r, "AW1");
  expect(aw1.find((x) => x.sesi === "Sesi 2")?.waktu).toBe("09.30–10.30");
  const aw3 = mergeSesi(r, "AW3");
  expect(aw3.find((x) => x.sesi === "Sesi 2")?.waktu).toBe("09.15–10.15");
});

test("sesi tampil=false disembunyikan", () => {
  const r = sesiRows([
    ["Sesi 3", "", "SMP & SMA (Ikhwan)", "11.00–12.00", "false"],
  ]);
  const s = mergeSesi(r, "AW3");
  expect(s.map((x) => x.sesi)).toEqual(["Sesi 1", "Sesi 2"]);
});

test("withFlight: request bersamaan menumpang 1 wave; gagal membersihkan flight", async () => {
  const flight = new Map<string, Promise<string>>();
  let calls = 0;
  const load = (): Promise<string> => {
    calls++;
    return new Promise((res) => setTimeout(() => res("ok"), 10));
  };
  const [a, b] = await Promise.all([
    withFlight(flight, "k", load),
    withFlight(flight, "k", load),
  ]);
  expect(a).toBe("ok");
  expect(b).toBe("ok");
  expect(calls).toBe(1);
  await withFlight(flight, "k", load);
  expect(calls).toBe(2);
  let fails = 0;
  const fail = (): Promise<string> => {
    fails++;
    return Promise.reject(new Error("x"));
  };
  await expect(withFlight(flight, "e", fail)).rejects.toThrow("x");
  await expect(withFlight(flight, "e", fail)).rejects.toThrow("x");
  expect(fails).toBe(2);
});
