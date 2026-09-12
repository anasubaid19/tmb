import { expect, test } from "bun:test";
import { hashPassword, verifyPassword } from "./password.server";

test("hash lalu verify berhasil, password salah gagal", async () => {
  const hash = await hashPassword("admin123");
  expect(await verifyPassword("admin123", hash)).toBe(true);
  expect(await verifyPassword("salah", hash)).toBe(false);
  expect(await verifyPassword("admin123", "bukan-format")).toBe(false);
  expect(await verifyPassword("admin123", "")).toBe(false);
});

test("salt acak: dua hash berbeda, keduanya valid", async () => {
  const a = await hashPassword("x");
  const b = await hashPassword("x");
  expect(a === b).toBe(false);
  expect(await verifyPassword("x", a)).toBe(true);
  expect(await verifyPassword("x", b)).toBe(true);
});
