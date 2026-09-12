import { createServerOnlyFn } from "@tanstack/react-start";
import { isMockMode } from "./mock";
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

const getGasConfig = createServerOnlyFn(() => {
  const url = process.env.GAS_URL;
  const token = process.env.GAS_TOKEN;
  if (!url || !token) throw new Error("GAS_URL/GAS_TOKEN belum di-set (.env)");
  return { url, token };
});

// ponytail: retry hanya untuk kegagalan transient (lock/timeout/5xx/jaringan),
// bukan untuk unauthorized/data-tidak-ditemukan.
const TRANSIENT_RE =
  /timeout|timed out|coba lagi|try again|lock|429|5\d\d|fetch failed|network|econn|socket/i;

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
  if (isMockMode()) return mockRead(table, q);
  return withRetry(
    async () => {
      const { url, token } = getGasConfig();
      const params = new URLSearchParams({
        token,
        op: "read",
        table,
        ...(q ? { q: JSON.stringify(q) } : {}),
      });
      const res = await fetch(`${url}?${params.toString()}`, {
        signal: AbortSignal.timeout(25000),
      });
      const body = await parseGas(res);
      return body.rows ?? [];
    },
    { attempts: 3, isRetryable: (e) => isTransient(e) },
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
  if (isMockMode()) {
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
      const { url, token } = getGasConfig();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, op, ...payload }),
        signal: AbortSignal.timeout(25000),
      });
      return await parseGas(res);
    },
    { attempts: 4, baseMs: 600, isRetryable: (e) => isTransient(e) },
  );
}
