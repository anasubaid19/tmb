import { describe, expect, test } from "bun:test";
import { wibDateTime, wibStamp, wibTime } from "./waktu";

describe("waktu WIB", () => {
  // 2026-09-18T08:04:00Z = 15.04 WIB — jam yang sama dari server (UTC) maupun
  // browser mana pun karena timeZone dikunci "Asia/Jakarta".
  const ts = Date.parse("2026-09-18T08:04:00Z");

  test("wibTime memberi jam WIB, bukan jam lokal mesin", () => {
    expect(wibTime(ts)).toContain("15");
    expect(wibTime(ts)).toContain("04");
  });

  test("wibDateTime memuat tanggal + jam WIB", () => {
    const s = wibDateTime(ts);
    expect(s).toContain("18");
    expect(s).toContain("15");
  });

  test("wibDateTime menerima ISO string dan aman untuk nilai invalid", () => {
    expect(wibDateTime("2026-09-18T08:04:00Z")).toContain("15");
    expect(wibDateTime("bukan-tanggal")).toBe("bukan-tanggal");
  });

  test("wibStamp berformat YYYY-MM-DD-HH-mm-ss (WIB)", () => {
    expect(wibStamp()).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/);
  });
});
