import { describe, expect, test } from "bun:test";
import {
  ASPEK_ARAB,
  gradeArab,
  gradeArabLabel,
  isArabJenjang,
  isAspekArabValid,
} from "./nilai-arabic";

describe("rubrik Bahasa Arab", () => {
  test("4 aspek", () => {
    expect(ASPEK_ARAB.map((a) => a.key)).toEqual([
      "pd",
      "kelancaran",
      "kejelasan",
      "adab",
    ]);
  });

  test("batas grade ikut file (91/75/51)", () => {
    expect(gradeArab(0)).toBe("D");
    expect(gradeArab(50.99)).toBe("D");
    expect(gradeArab(51)).toBe("C");
    expect(gradeArab(74.99)).toBe("C");
    expect(gradeArab(75)).toBe("B");
    expect(gradeArab(90.99)).toBe("B");
    expect(gradeArab(91)).toBe("A");
    expect(gradeArab(100)).toBe("A");
    expect(gradeArabLabel("A")).toContain("penutur");
    expect(gradeArabLabel("D")).toContain("Tidak bisa");
  });

  test("aspek valid 10–100", () => {
    expect(isAspekArabValid("10")).toBe(true);
    expect(isAspekArabValid("100")).toBe(true);
    expect(isAspekArabValid("18.75")).toBe(true);
    expect(isAspekArabValid("9.99")).toBe(false);
    expect(isAspekArabValid("101")).toBe(false);
    expect(isAspekArabValid("")).toBe(false);
    expect(isAspekArabValid("x")).toBe(false);
  });

  test("Arab hanya SMP/SMA", () => {
    expect(isArabJenjang("SMP")).toBe(true);
    expect(isArabJenjang("SMA")).toBe(true);
    expect(isArabJenjang("SD")).toBe(false);
    expect(isArabJenjang("")).toBe(false);
  });

  test("checksum contoh file: (20+20+25+10)/4 = 18.75 → D", () => {
    const rata = (20 + 20 + 25 + 10) / 4;
    expect(rata).toBe(18.75);
    expect(gradeArab(rata)).toBe("D");
  });
});
