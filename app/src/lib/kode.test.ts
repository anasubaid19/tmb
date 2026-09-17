import { expect, test } from "bun:test";
import {
  isJenjangValid,
  jenjangLetter,
  nextAWIKode,
  nextMateriId,
  nextPengujiKode,
  ticketKode,
} from "./kode";

test("huruf jenjang", () => {
  expect(jenjangLetter("SD")).toBe("A");
  expect(jenjangLetter("SMP")).toBe("B");
  expect(jenjangLetter("SMA")).toBe("C");
  expect(jenjangLetter("PG")).toBe("K");
  expect(jenjangLetter("TK-A")).toBe("K");
  expect(jenjangLetter("TK-B")).toBe("K");
  expect(jenjangLetter("sd")).toBe("A");
  expect(jenjangLetter("???")).toBe("X");
});

test("format kode + padding", () => {
  expect(ticketKode("AW1", "SD", 1)).toBe("AW1-A001");
  expect(ticketKode("AW3", "SMP", 131)).toBe("AW3-B131");
  expect(ticketKode("AW1", "TK-A", 30)).toBe("AW1-K030");
  expect(ticketKode("AW4", "SD", 1000)).toBe("AW4-A1000");
});

test("kode penguji = suffix terbesar + 1, format P-00x", () => {
  expect(nextPengujiKode([])).toBe("P-001");
  expect(nextPengujiKode(["P1", "P-003", "X", "P12"])).toBe("P-013");
});

test("kode walk-in lanjut urutan AWI", () => {
  expect(nextAWIKode([])).toBe("AWI-001");
  expect(nextAWIKode(["AWI-001", "AWI-292", "AW1-A001", "x"])).toBe("AWI-293");
});

test("id materi = M terbesar + 1", () => {
  expect(nextMateriId([])).toBe("M1");
  expect(nextMateriId(["M1", "M5", "M3"])).toBe("M6");
  expect(nextMateriId(["M9", "M10", "M2"])).toBe("M11");
});

test("validasi jenjang — tak ada kode X dari form daftar", () => {
  for (const j of ["SD", "SMP", "SMA", "PG", "TK-A", "TK-B"]) {
    expect(isJenjangValid(j)).toBe(true);
    expect(ticketKode("AW1", j, 1)).not.toContain("-X");
  }
  expect(isJenjangValid("")).toBe(false);
  expect(isJenjangValid("SD ISLAM")).toBe(false);
  expect(isJenjangValid("Kinder")).toBe(false);
});
