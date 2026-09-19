import { expect, test } from "bun:test";
import { canAccessSiswaDashboard } from "./siswa";

test("dashboard siswa hanya menerima sesi siswa pemilik", () => {
  expect(canAccessSiswaDashboard({ role: "siswa", sub: "S-1" }, "S-1")).toBe(
    true,
  );
  expect(canAccessSiswaDashboard({ role: "penguji", sub: "P-1" }, "S-1")).toBe(
    false,
  );
  expect(canAccessSiswaDashboard({ role: "siswa", sub: "S-2" }, "S-1")).toBe(
    false,
  );
});
