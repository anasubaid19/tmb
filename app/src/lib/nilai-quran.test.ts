import { describe, expect, test } from "bun:test";
import {
  ASPEK_QURAN,
  gradeQuran,
  gradeQuranLabel,
  isAspekQuranValid,
  isQuranJenjang,
} from "./nilai-quran";

describe("rubrik Al-Qur'an", () => {
  test("3 aspek", () => {
    expect(ASPEK_QURAN.map((a) => a.key)).toEqual([
      "makharij",
      "sifat",
      "lancar",
    ]);
  });

  test("batas grade ikut file (91/75/51)", () => {
    expect(gradeQuran(0)).toBe("D");
    expect(gradeQuran(50.99)).toBe("D");
    expect(gradeQuran(51)).toBe("C");
    expect(gradeQuran(74.99)).toBe("C");
    expect(gradeQuran(75)).toBe("B");
    expect(gradeQuran(90.99)).toBe("B");
    expect(gradeQuran(91)).toBe("A");
    expect(gradeQuran(100)).toBe("A");
    expect(gradeQuranLabel("A")).toContain("Excellent");
    expect(gradeQuranLabel("D")).toContain("Weak");
  });

  test("aspek valid 1–100", () => {
    expect(isAspekQuranValid("1")).toBe(true);
    expect(isAspekQuranValid("100")).toBe(true);
    expect(isAspekQuranValid("70.5")).toBe(true);
    expect(isAspekQuranValid("0.99")).toBe(false);
    expect(isAspekQuranValid("101")).toBe(false);
    expect(isAspekQuranValid("")).toBe(false);
    expect(isAspekQuranValid("x")).toBe(false);
  });

  test("Quran hanya SMP/SMA", () => {
    expect(isQuranJenjang("SMP")).toBe(true);
    expect(isQuranJenjang("SMA")).toBe(true);
    expect(isQuranJenjang("SD")).toBe(false);
    expect(isQuranJenjang("")).toBe(false);
  });

  test("checksum contoh file: (70+69+72)/3 = 70.33 → C (bukan Excellent)", () => {
    const rata = (70 + 69 + 72) / 3;
    expect(rata).toBeCloseTo(70.33, 2);
    expect(gradeQuran(rata)).toBe("C");
    expect(gradeQuranLabel(gradeQuran(rata))).toContain("Fair");
  });
});
