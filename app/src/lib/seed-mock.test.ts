import { describe, expect, test } from "bun:test";
import { mockAppend, mockDelete, mockRead, mockUpdate } from "./seed";

describe("mock delete/update (paritas PostgreSQL)", () => {
  test("update mengisi kolom valid yang belum ada di baris", async () => {
    const added = await mockAppend("penguji", { kode: "TEST-99", nama: "Uji" });
    const id = String(added.id);
    await mockUpdate("penguji", id, { kontak: "081200000099" });
    const row = (await mockRead("penguji", { id }))[0];
    expect(row?.kontak).toBe("081200000099");
    await mockDelete("penguji", id);
    expect((await mockRead("penguji", { id })).length).toBe(0);
  });

  test("users dihapus lewat kunci kode", async () => {
    await mockAppend("users", {
      kode: "TEST-PAN",
      nama: "Panitia Uji",
      role: "panitia",
      password: "",
      ref_id: "",
    });
    await mockUpdate("users", "TEST-PAN", { nama: "Panitia Baru" });
    expect((await mockRead("users", { kode: "TEST-PAN" }))[0]?.nama).toBe(
      "Panitia Baru",
    );
    await mockDelete("users", "TEST-PAN");
    expect((await mockRead("users", { kode: "TEST-PAN" })).length).toBe(0);
  });

  test("hapus baris tak ada → error", async () => {
    await expect(mockDelete("penguji", "999999")).rejects.toThrow();
  });
});
