// Mode mock: aktif bila kredensial GAS belum diisi (env ATAU file lokal
// server/gas-settings.json). Saat mock, seluruh baca/tulis memakai data
// in-memory (seed.ts) dan login staff di-bypass (mockSession). Produksi
// (GAS terkonfigurasi) selalu auth normal.
import { isGasConfigured } from "./gas-config-state";

let warned = false;

export function isMockMode(): boolean {
  const mock = !isGasConfigured();
  if (mock && !warned) {
    warned = true;
    console.warn(
      "[tmb] GAS belum dikonfigurasi (env atau server/gas-settings.json) — memakai data MOCK (reset saat restart).",
    );
  }
  return mock;
}
