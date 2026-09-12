import { expect, test } from "bun:test";
import { normalizePhone } from "./phone";

test("tiga format input wali menghasilkan nomor yang sama", () => {
  // +62 / 62 / 08 harus identik setelah normalisasi.
  expect(normalizePhone("+628521026401")).toBe("08521026401");
  expect(normalizePhone("628521026401")).toBe("08521026401");
  expect(normalizePhone("08521026401")).toBe("08521026401");
});

test("nomor tanpa awalan (Excel buang leading zero) diberi 0", () => {
  expect(normalizePhone("85773552375")).toBe("085773552375");
  expect(normalizePhone("85921026401")).toBe("085921026401");
});

test("wa.me/, spasi, strip, dan float .0 dibersihkan", () => {
  expect(normalizePhone("wa.me/6287731073105")).toBe("087731073105");
  expect(normalizePhone("62 812-9907-3727")).toBe("081299073727");
  expect(normalizePhone("085921026401.0")).toBe("085921026401");
});

test("62 diikuti 0 tidak menghasilkan 00", () => {
  expect(normalizePhone("62085921026401")).toBe("085921026401");
});

test("input kosong tetap kosong", () => {
  expect(normalizePhone("")).toBe("");
  expect(normalizePhone("   ")).toBe("");
});
