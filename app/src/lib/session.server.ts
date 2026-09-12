import { createServerOnlyFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";
import { isMockMode } from "./mock";

export type Role = "siswa" | "penguji" | "panitia" | "admin";

export interface SessionData {
  role: Role;
  /** id siswa (siswa) atau kode (penguji/panitia/admin) */
  sub: string;
  cabangId?: string;
  nama?: string;
  exp: number;
}

const COOKIE_NAME = "tmb_session";
const TTL_SECONDS = 12 * 3600;

// ponytail: mode mock (tanpa GAS_URL) = eksplorasi lokal saja → secret dev
// tetap agar login bisa dicoba tanpa .env. Produksi wajib SESSION_SECRET.
const getSecret = createServerOnlyFn(() => {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (!process.env.GAS_URL || !process.env.GAS_TOKEN) {
    console.warn(
      "[tmb] SESSION_SECRET kosong — memakai secret DEV (jangan produksi).",
    );
    return "dev-only-secret-jangan-dipakai-produksi-0123456789";
  }
  throw new Error("SESSION_SECRET wajib min. 32 karakter (.env)");
});

function toB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return new Uint8Array(sig);
}

// ponytail: perbandingan waktu-konstan ala kadarnya agar timing attack tak trivial.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(
  data: Omit<SessionData, "exp">,
): Promise<string> {
  const payload: SessionData = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const body = toB64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = toB64Url(await hmac(await getSecret(), body));
  return `${body}.${sig}`;
}

export async function verifySession(
  token: string,
): Promise<SessionData | null> {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = toB64Url(await hmac(await getSecret(), body));
    if (!constantTimeEqual(sig, expected)) return null;
    const data = JSON.parse(
      new TextDecoder().decode(fromB64Url(body)),
    ) as SessionData;
    if (!data.role || !data.sub || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const token = getCookie(COOKIE_NAME);
  if (!token) return null;
  return verifySession(token);
}

// ponytail: bypass login staff hanya saat mock — sesi pabrikan dengan kode
// seed yang valid (SCAN-01/P101). Produksi selalu null → auth normal.
// Admin dikecualikan: dua akun admin sungguhan (Anas/Kemal) wajib login form.
export function mockSession(role: Role): SessionData {
  const sub = role === "penguji" ? "P101" : "SCAN-01";
  return {
    role,
    sub,
    cabangId: "AW3",
    nama: role === "penguji" ? "Ahmad Hidayat" : "Panitia (dev)",
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
}

/** Sesi cookie, atau — bila mock & belum login & bukan admin — sesi pabrikan. */
export async function getSessionOr(role: Role): Promise<SessionData | null> {
  const s = await getSession();
  if (s) return s;
  if (role === "admin") return null;
  return isMockMode() ? mockSession(role) : null;
}

export async function setSessionCookie(token: string): Promise<void> {
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    // localhost adalah secure context sehingga Secure tetap valid saat dev.
    // Set COOKIE_SECURE=false saat produksi HTTP polos (IP:port tanpa HTTPS).
    secure: process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  deleteCookie(COOKIE_NAME, { path: "/" });
}
