import { describe, expect, test } from "bun:test";
import { DB_TABLES, dbColumns, dbKey, isDbTable } from "./db-schema";

describe("db-schema", () => {
  test("cermin kolom GAS dan kunci tulis", () => {
    expect(dbColumns("siswa")).toContain("email");
    expect(dbColumns("users")).toEqual([
      "kode",
      "nama",
      "role",
      "password",
      "ref_id",
    ]);
    expect(dbKey("users")).toBe("kode");
    expect(dbKey("siswa")).toBe("id");
    expect(isDbTable("siswa")).toBe(true);
    expect(isDbTable("gas")).toBe(false);
    expect(Object.keys(DB_TABLES)).toHaveLength(13);
  });
});
