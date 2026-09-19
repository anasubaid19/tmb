import { describe, expect, test } from "bun:test";
import {
  ASPEK_ENGLISH,
  ASPEK_SANTRI,
  alasanBelumLengkap,
  gradeEnglish,
  gradeLabel,
  isAspekJenjang,
  isAspekValid,
  santriStatus,
} from "./nilai-english";

describe("rubrik English + santri", () => {
  test("4 aspek tiap kelompok", () => {
    expect(ASPEK_ENGLISH.map((a) => a.key)).toEqual([
      "fluency",
      "vocab",
      "critical",
      "expression",
    ]);
    expect(ASPEK_SANTRI.map((a) => a.key)).toEqual([
      "sholat",
      "quran",
      "mapel",
      "ortu",
    ]);
  });

  test("batas grade", () => {
    expect(gradeEnglish(0)).toBe("D");
    expect(gradeEnglish(8)).toBe("D");
    expect(gradeEnglish(9)).toBe("C");
    expect(gradeEnglish(12)).toBe("C");
    expect(gradeEnglish(13)).toBe("B");
    expect(gradeEnglish(16)).toBe("B");
    expect(gradeEnglish(17)).toBe("A");
    expect(gradeEnglish(20)).toBe("A");
    expect(gradeLabel("A")).toContain("Excellent");
    expect(gradeLabel("D")).toContain("Weak");
  });

  test("aspek hanya SMP/SMA — SD hanya Calistung + ortu", () => {
    expect(isAspekJenjang("SMP")).toBe(true);
    expect(isAspekJenjang("SMA")).toBe(true);
    expect(isAspekJenjang("SD")).toBe(false);
    expect(isAspekJenjang("sd")).toBe(false);
    expect(isAspekJenjang("")).toBe(true);
  });

  test("aspek valid 1–5 bulat", () => {
    expect(isAspekValid("1")).toBe(true);
    expect(isAspekValid("5")).toBe(true);
    expect(isAspekValid("0")).toBe(false);
    expect(isAspekValid("6")).toBe(false);
    expect(isAspekValid("3.5")).toBe(false);
    expect(isAspekValid("")).toBe(false);
    expect(isAspekValid("x")).toBe(false);
  });

  test("checksum contoh tahun lalu", () => {
    // Wan (SMA): English 1+1+1+1=4 Weak; santri 2+3+3+1=9 Fair.
    const wanE = [1, 1, 1, 1].reduce((a, b) => a + b, 0);
    const wanS = [2, 3, 3, 1].reduce((a, b) => a + b, 0);
    expect(wanE).toBe(4);
    expect(gradeLabel(gradeEnglish(wanE))).toContain("Weak");
    expect(wanS).toBe(9);
    expect(gradeLabel(gradeEnglish(wanS))).toContain("Fair");
    // Abidzar (SMP): English 5+5+4+5=19 Excellent; santri 16 Good.
    const abiE = [5, 5, 4, 5].reduce((a, b) => a + b, 0);
    const abiS = [4, 4, 4, 4].reduce((a, b) => a + b, 0);
    expect(abiE).toBe(19);
    expect(gradeLabel(gradeEnglish(abiE))).toContain("Excellent");
    expect(abiS).toBe(16);
    expect(gradeLabel(gradeEnglish(abiS))).toContain("Good");
  });
});

describe("santri opsional + kelayakan submit English", () => {
  test("santriStatus: kosong / lengkap / sebagian", () => {
    expect(santriStatus(["", "", "", ""])).toBe("none");
    expect(santriStatus(["1", "2", "3", "4"])).toBe("full");
    expect(santriStatus(["1", "", "", ""])).toBe("partial");
  });

  test("English wajib lengkap; santri dikosongkan tetap boleh submit", () => {
    expect(alasanBelumLengkap(["1", "2", "3", "4"], ["", "", "", ""])).toBe(
      null,
    );
    expect(alasanBelumLengkap(["1", "2", "3", ""], ["", "", "", ""])).toContain(
      "English",
    );
  });

  test("santri sebagian ditolak; lengkap valid diterima", () => {
    expect(
      alasanBelumLengkap(["1", "2", "3", "4"], ["1", "", "", ""]),
    ).toContain("santri");
    expect(alasanBelumLengkap(["1", "2", "3", "4"], ["1", "2", "3", "4"])).toBe(
      null,
    );
    expect(
      alasanBelumLengkap(["1", "2", "3", "4"], ["1", "2", "3", "6"]),
    ).toContain("1–5");
  });
});
