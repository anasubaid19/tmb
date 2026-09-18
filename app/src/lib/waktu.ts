/**
 * Format waktu WIB dengan timezone eksplisit. Tanpa `timeZone`, render SSR di
 * server (UTC) dan di browser (WIB) menghasilkan jam berbeda — mis. "Baru Tiba"
 * menampilkan pukul 9 padahal kejadian 15/16 WIB. Murni — diuji unit.
 */
const WIB = "Asia/Jakarta";

/** Jam WIB "HH.MM" dari epoch ms. */
export function wibTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: WIB,
  });
}

/** Tanggal + jam WIB dari epoch ms atau string ISO. */
export function wibDateTime(value: string | number): string {
  const ts = typeof value === "number" ? value : Date.parse(value);
  if (Number.isNaN(ts)) return String(value ?? "");
  return new Date(ts).toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: WIB,
  });
}

/** Cap waktu WIB untuk nama berkas: YYYY-MM-DD-HH-mm-ss. Murni. */
export function wibStamp(): string {
  return new Date(Date.now() + 7 * 3600 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");
}
