import { describe, expect, test } from "bun:test";
import { nextTheme, normalizeTheme, resolveTheme } from "./theme";

describe("normalizeTheme", () => {
  test("nilai valid diteruskan", () => {
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("system")).toBe("system");
  });

  test("null / nilai tak dikenal → system", () => {
    expect(normalizeTheme(null)).toBe("system");
    expect(normalizeTheme("garbage")).toBe("system");
    expect(normalizeTheme(undefined)).toBe("system");
  });
});

describe("resolveTheme", () => {
  test("preferensi eksplisit mengabaikan OS", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  test("system mengikuti preferensi OS", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("nextTheme", () => {
  test("siklus terang → gelap → sistem → terang", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
    expect(nextTheme("system")).toBe("light");
  });
});
