import { createServerFn } from "@tanstack/react-start";
import { getSession, getSessionOr, type SessionData } from "./session.server";

function mustString(value: unknown, field: string): string {
  if (typeof value !== "object" || value === null)
    throw new Error("data tidak valid");
  const v = (value as Record<string, unknown>)[field];
  if (typeof v !== "string" || !v.trim())
    throw new Error(`${field} wajib diisi`);
  return v.trim();
}

export interface AnakOption {
  id: string;
  nama: string;
  cabangId: string;
  jenjang: string;
  kelasTujuan: string;
}

/**
 * Login/logout berjalan lewat endpoint Better Auth (`/api/auth/...`) agar
 * cookie sesi httpOnly bisa di-set langsung oleh Better Auth. Helper client
 * ada di `./auth-client`. Modul ini hanya menyimpan tipe + sesi guard.
 */

export const sessionFn = createServerFn().handler(
  async (): Promise<SessionData | null> => getSession(),
);

/** Sesi untuk guard route; di mock kembalikan sesi pabrikan per role. */
export const sessionFnOr = createServerFn()
  .validator((data: unknown) => {
    const role = mustString(data, "role");
    if (!["siswa", "penguji", "panitia", "admin"].includes(role))
      throw new Error("role tidak dikenal");
    return { role: role as SessionData["role"] };
  })
  .handler(
    async ({ data }): Promise<SessionData | null> => getSessionOr(data.role),
  );
