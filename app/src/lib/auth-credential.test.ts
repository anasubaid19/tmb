import { describe, expect, test } from "bun:test";
import type { InternalAdapter } from "better-auth";
import { verifyPassword } from "better-auth/crypto";
import { setStaffCredential } from "./auth-server";

/** Adapter palsu: cukup untuk merekam create/update kredensial. */
function fakeAdapter(opts: {
  userExists: boolean;
  credential?: { id: string; password: string };
}) {
  const calls: { create: unknown[]; update: unknown[] } = {
    create: [],
    update: [],
  };
  const adapter = {
    findUserById: async () =>
      opts.userExists ? { id: "staff:ADMIN-03" } : null,
    findAccountByUserId: async () =>
      opts.credential ? [{ ...opts.credential, providerId: "credential" }] : [],
    updateAccount: async (id: string, data: unknown) => {
      calls.update.push({ id, data });
    },
    createAccount: async (data: unknown) => {
      calls.create.push(data);
    },
  } as unknown as InternalAdapter;
  return { adapter, calls };
}

describe("setStaffCredential", () => {
  test("akun auth ada → update hash yang memverifikasi password baru", async () => {
    const { adapter, calls } = fakeAdapter({
      userExists: true,
      credential: { id: "acc-1", password: "hash-lama" },
    });
    const ok = await setStaffCredential(adapter, "ADMIN-03", "rahasia123");
    expect(ok).toBe(true);
    expect(calls.create).toHaveLength(0);
    const update = calls.update[0] as { data: { password: string } };
    expect(
      await verifyPassword({
        hash: update.data.password,
        password: "rahasia123",
      }),
    ).toBe(true);
  });

  test("user ada tanpa kredensial → buat kredensial baru", async () => {
    const { adapter, calls } = fakeAdapter({ userExists: true });
    const ok = await setStaffCredential(adapter, "ADMIN-03", "rahasia123");
    expect(ok).toBe(true);
    expect(calls.update).toHaveLength(0);
    expect(calls.create).toHaveLength(1);
  });

  test("user belum ada → tidak menulis apa pun (bootstrap plaintext saat login)", async () => {
    const { adapter, calls } = fakeAdapter({ userExists: false });
    const ok = await setStaffCredential(adapter, "ADMIN-03", "rahasia123");
    expect(ok).toBe(false);
    expect(calls.create).toHaveLength(0);
    expect(calls.update).toHaveLength(0);
  });
});
