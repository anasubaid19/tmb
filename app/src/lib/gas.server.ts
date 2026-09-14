import { createServerOnlyFn } from "@tanstack/react-start";
import { getGasSettings } from "./gas-settings.server";
import { withRetry } from "./retry";
import { mockAppend, mockRead, mockUpdate } from "./seed";

export type GasRow = Record<string, string | number | boolean | null>;

interface GasSuccess {
  ok: true;
  rows?: GasRow[];
  row?: GasRow;
  id?: string;
  time?: string;
}

interface GasFailure {
  ok: false;
  error: string;
}

type GasResponse = GasSuccess | GasFailure;

// ponytail: resolve settings dulu, mock hanya bila null. Jangan cek isMockMode()
// (flag in-memory) SEBELUM getGasSettings() — chicken-and-egg: flag baru
// ter-set lewat getGasSettings(), tapi gerbang mock menghalangi duluan,
// sehingga server fresh-boot stuck di mock selamanya sampai halaman admin
// dibuka. getGasSettings() memanggil markGasConfigured() sendiri.
const getGasConfig = createServerOnlyFn(() => {
  const s = getGasSettings();
  return s ? { url: s.url, token: s.token } : null;
});

// ponytail: retry hanya untuk kegagalan transient (lock/timeout/5xx/jaringan),
// bukan untuk unauthorized/data-tidak-ditemukan.
// ponytail: 404/405 di sini = flake edge Google (halaman Drive) saat fan-out
// paralel, BUKAN "data tidak ditemukan" (itu datang sebagai 200 + {ok:false}).
const TRANSIENT_RE =
  /timeout|timed out|coba lagi|try again|lock|429|404|405|5\d\d|fetch failed|network|econn|socket/i;

function isTransient(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return TRANSIENT_RE.test(msg);
}

async function parseGas(res: Response): Promise<GasSuccess> {
  if (!res.ok) throw new Error(`GAS HTTP ${res.status}`);
  const body = (await res.json()) as GasResponse;
  if (!body.ok) throw new Error(body.error || "GAS error");
  return body;
}

/** Baca publik via GET (untuk data landing + cache). */
export async function gasGetRead(
  table: string,
  q?: Record<string, string>,
): Promise<GasRow[]> {
  const cfg = getGasConfig();
  if (!cfg) return mockRead(table, q);
  return withRetry(
    async () => {
      const params = new URLSearchParams({
        token: cfg.token,
        op: "read",
        table,
        ...(q ? { q: JSON.stringify(q) } : {}),
      });
      const res = await fetch(`${cfg.url}?${params.toString()}`, {
        signal: AbortSignal.timeout(25000),
      });
      const body = await parseGas(res);
      return body.rows ?? [];
    },
    { attempts: 3, baseMs: 250, isRetryable: (e) => isTransient(e) },
  );
}

/** Operasi privat via POST (lookup sensitif + semua tulis). */
export async function gasPost(
  op: "read" | "append" | "update",
  payload: {
    table: string;
    row?: GasRow;
    id?: string;
    updates?: GasRow;
    q?: Record<string, string>;
  },
): Promise<GasSuccess> {
  const cfg = getGasConfig();
  if (!cfg) {
    if (op === "read")
      return { ok: true, rows: await mockRead(payload.table, payload.q) };
    if (op === "append")
      return {
        ok: true,
        row: await mockAppend(payload.table, payload.row ?? {}),
      };
    return {
      ok: true,
      id: await mockUpdate(
        payload.table,
        payload.id ?? "",
        payload.updates ?? {},
      ),
    };
  }
  return withRetry(
    async () => {
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: cfg.token, op, ...payload }),
        signal: AbortSignal.timeout(25000),
      });
      return await parseGas(res);
    },
    { attempts: 3, baseMs: 250, isRetryable: (e) => isTransient(e) },
  );
}

// ponytail: pemanasan cold-start GAS sekali per proses server. Fire-and-forget:
// kegagalan diam saja (tidak menghalangi boot). Tabel "config" dipilih karena
// kecil. Efeknya menghilangkan jeda cold-start Apps Script (~1–3s) dari login
// pertama setelah server naik / GAS idle lama. Batas: hangat hilang lagi bila
// GAS idle menit-menitan; kalau perlu selalu hangat, panggil ulang via timer.
let warmed = false;
export function warmupGas(): void {
  if (warmed) return;
  warmed = true;
  void gasGetRead("config").catch(() => {});
}

warmupGas();
