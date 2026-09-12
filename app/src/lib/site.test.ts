import { expect, test } from "bun:test";
import type { GasRow } from "./gas.server";
import { mergeConfig } from "./site";

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
