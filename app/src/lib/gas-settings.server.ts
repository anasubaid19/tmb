import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { markGasConfigured } from "./gas-config-state";

// ponytail: GAS_URL/GAS_TOKEN tidak boleh disimpan di spreadsheet (chicken-
// and-egg: butuh URL untuk membaca spreadsheet). Jadi disimpan di file lokal
// server, ditulis lewat CMS admin. Urutan baca: env → file → null (mock).
// File tidak pernah ikut git (server/gas-settings.json di .gitignore).
//
// Modul ini SERVER-ONLY (node:fs). Server fn yang dipakai client hidup di
// admin.ts (dynamic import) agar kode client tidak menyentuh node:fs.

export interface GasSettings {
  url: string;
  token: string;
  source: "env" | "file";
}

function settingsPath(): string {
  return join(process.cwd(), "server", "gas-settings.json");
}

let cached: GasSettings | null | undefined;
let cacheAt = 0;
const CACHE_MS = 3000;

function readFile(): GasSettings | null {
  try {
    if (!existsSync(settingsPath())) return null;
    const raw = JSON.parse(readFileSync(settingsPath(), "utf8")) as {
      url?: string;
      token?: string;
    };
    if (typeof raw.url !== "string" || !raw.url.trim()) return null;
    if (typeof raw.token !== "string" || !raw.token.trim()) return null;
    return { url: raw.url.trim(), token: raw.token.trim(), source: "file" };
  } catch {
    return null;
  }
}

/** Baca pengaturan GAS: env menang, lalu file lokal, lalu null (mock). */
export function getGasSettings(): GasSettings | null {
  const envUrl = process.env.GAS_URL;
  const envToken = process.env.GAS_TOKEN;
  if (envUrl && envToken) {
    markGasConfigured(true);
    return { url: envUrl, token: envToken, source: "env" };
  }
  if (cached && Date.now() - cacheAt < CACHE_MS) {
    markGasConfigured(cached !== null);
    return cached;
  }
  const fromFile = readFile();
  cached = fromFile;
  cacheAt = Date.now();
  markGasConfigured(fromFile !== null);
  return fromFile;
}

/** Simpan URL+token ke file lokal server + invalidasi cache. */
export function saveGasSettingsFile(url: string, token: string): void {
  writeFileSync(
    settingsPath(),
    JSON.stringify({ url, token }, null, 2),
    "utf8",
  );
  cached = { url, token, source: "file" };
  cacheAt = Date.now();
  markGasConfigured(true);
}

/** Perlihatkan token sebagian untuk UI (bukan rahasia penuh). */
export function maskToken(token: string): string {
  if (token.length <= 6) return "••••••";
  return `${token.slice(0, 4)}…${token.slice(-3)}`;
}

/** Status untuk UI admin — tanpa mengekspos token penuh. */
export function gasStatus(): {
  connected: boolean;
  source: "env" | "file" | "none";
  url: string;
  tokenMasked: string;
} {
  const s = getGasSettings();
  if (!s) return { connected: false, source: "none", url: "", tokenMasked: "" };
  return {
    connected: true,
    source: s.source,
    url: s.url,
    tokenMasked: maskToken(s.token),
  };
}
