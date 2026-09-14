// Status konfigurasi GAS untuk mode mock — modul MURNI (tanpa node:fs) agar
// aman diimport dari kode client. Nilai di-set oleh gas-settings.server.ts.
let configured = false;

export function isGasConfigured(): boolean {
  return configured;
}

export function markGasConfigured(v: boolean): void {
  configured = v;
}
