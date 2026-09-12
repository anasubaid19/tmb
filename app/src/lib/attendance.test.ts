import { expect, test } from "bun:test";
import { type AttendanceEvent, dayOf, isDuplicateToday } from "./attendance";

const ev = (kode: string, ts: number): AttendanceEvent => ({
  ts,
  waktu: new Date(ts).toISOString(),
  kode,
  nama: "X",
  tipe: "siswa",
  oleh: "P1",
});

test("dayOf memakai WIB (UTC+7)", () => {
  // 18 Sep 2026 16:59 UTC = 23:59 WIB
  expect(dayOf(Date.UTC(2026, 8, 18, 16, 59))).toBe("2026-09-18");
  // 17:00 UTC = 00:00 WIB keesokan hari
  expect(dayOf(Date.UTC(2026, 8, 18, 17, 0))).toBe("2026-09-19");
});

test("duplikat terdeteksi bila kode sama di hari yang sama", () => {
  const now = Date.UTC(2026, 8, 19, 1, 0); // 08:00 WIB
  const events = [ev("S001", now - 3600_000)];
  expect(isDuplicateToday(events, "S001", now)).toBe(true);
  expect(isDuplicateToday(events, "S002", now)).toBe(false);
});

test("tidak duplikat bila beda hari", () => {
  const now = Date.UTC(2026, 8, 19, 1, 0);
  const yesterday = [ev("S001", now - 24 * 3600_000)];
  expect(isDuplicateToday(yesterday, "S001", now)).toBe(false);
  expect(isDuplicateToday([], "S001", now)).toBe(false);
});
