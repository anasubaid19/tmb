// Mode mock: aktif bila kredensial GAS belum diisi. Saat mock, seluruh
// baca/tulis memakai data in-memory (seed.ts) dan login staff di-bypass
// (mockSession). Produksi (GAS_URL+GAS_TOKEN terisi) selalu auth normal.
let warned = false;

export function isMockMode(): boolean {
  const mock = !process.env.GAS_URL || !process.env.GAS_TOKEN;
  if (mock && !warned) {
    warned = true;
    console.warn(
      "[tmb] GAS_URL/GAS_TOKEN kosong — memakai data MOCK (reset saat restart).",
    );
  }
  return mock;
}
