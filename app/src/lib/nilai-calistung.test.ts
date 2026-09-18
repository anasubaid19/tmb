import { describe, expect, test } from "bun:test";
import {
  ASPEK_CALISTUNG,
  gradeCalistung,
  gradeCalistungLabel,
  isAspekCalistungValid,
} from "./nilai-calistung";

describe("rubrik Calistung SD", () => {
  test("3 aspek", () => {
    expect(ASPEK_CALISTUNG.map((a) => a.key)).toEqual([
      "membaca",
      "menulis",
      "menghitung",
    ]);
  });

  test("batas grade ikut file (17/13/9)", () => {
    expect(gradeCalistung(0)).toBe("D");
    expect(gradeCalistung(8.99)).toBe("D");
    expect(gradeCalistung(9)).toBe("C");
    expect(gradeCalistung(12.99)).toBe("C");
    expect(gradeCalistung(13)).toBe("B");
    expect(gradeCalistung(16.99)).toBe("B");
    expect(gradeCalistung(17)).toBe("A");
    expect(gradeCalistung(20)).toBe("A");
    expect(gradeCalistungLabel("A")).toBe(
      "Excellent (Ready for Advanced Class)",
    );
    expect(gradeCalistungLabel("B")).toBe("Good (Ready for Standard Class)");
    expect(gradeCalistungLabel("C")).toBe("Fair (Needs Support Class)");
    expect(gradeCalistungLabel("D")).toBe("Weak (Needs Intensive Program)");
  });

  test("aspek valid bulat 1–20", () => {
    expect(isAspekCalistungValid("1")).toBe(true);
    expect(isAspekCalistungValid("20")).toBe(true);
    expect(isAspekCalistungValid("0")).toBe(false);
    expect(isAspekCalistungValid("21")).toBe(false);
    expect(isAspekCalistungValid("3.5")).toBe(false);
    expect(isAspekCalistungValid("")).toBe(false);
    expect(isAspekCalistungValid("x")).toBe(false);
  });

  test("checksum contoh file: (19+14+17)/3 = 16.67 → B", () => {
    const rata = Math.round(((19 + 14 + 17) / 3) * 100) / 100;
    expect(rata).toBe(16.67);
    expect(gradeCalistung(rata)).toBe("B");
    expect(gradeCalistungLabel(gradeCalistung(rata))).toBe(
      "Good (Ready for Standard Class)",
    );
  });
});
