import type { AnakOption } from "./auth";

interface LoginSiswaResult {
  ok: true;
  picked: boolean;
  nama?: string;
  anak?: AnakOption[];
}

interface LoginStaffResult {
  ok: true;
  role: string;
  nama: string;
}

async function postAuth<T>(
  path: string,
  body: Record<string, string>,
): Promise<T> {
  const res = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as {
    message?: string;
  } | null;
  if (!res.ok) throw new Error(data?.message ?? "Login gagal.");
  return data as T;
}

/** Login siswa tanpa password — lewat nomor HP wali atau email. */
export function loginSiswaApi(
  mode: "phone" | "email",
  identifier: string,
): Promise<LoginSiswaResult> {
  return postAuth<LoginSiswaResult>("/kode-login/siswa", { mode, identifier });
}

export function pickSiswaApi(
  mode: "phone" | "email",
  identifier: string,
  siswaId: string,
): Promise<LoginSiswaResult> {
  return postAuth<LoginSiswaResult>("/kode-login/siswa", {
    mode,
    identifier,
    siswaId,
  });
}

/** Login penguji/panitia (kode) dan admin (kode + password). */
export function loginStaffApi(
  kode: string,
  password?: string,
): Promise<LoginStaffResult> {
  return postAuth<LoginStaffResult>("/kode-login/staff", {
    kode,
    password: password ?? "",
  });
}

/** Keluar — hapus sesi Better Auth di server. */
export async function logoutApi(): Promise<void> {
  // ponytail: Better Auth menolak POST tanpa body JSON (415) → kirim body kosong.
  const res = await fetch("/api/auth/sign-out", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error("Gagal keluar.");
}
