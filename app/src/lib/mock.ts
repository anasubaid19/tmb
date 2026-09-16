// Mode mock: aktif bila DATABASE_URL/POSTGRES_URL belum diisi. Saat mock,
// seluruh baca/tulis memakai data in-memory (seed.ts). Produksi (DB
// terkonfigurasi) selalu auth normal + data PostgreSQL.
import { isDatabaseConfigured } from "./db.server";

let warned = false;

export function isMockMode(): boolean {
  const mock = !isDatabaseConfigured();
  if (mock && !warned) {
    warned = true;
    console.warn(
      "[tmb] DATABASE_URL/POSTGRES_URL belum diisi — memakai data MOCK (reset saat restart).",
    );
  }
  return mock;
}
