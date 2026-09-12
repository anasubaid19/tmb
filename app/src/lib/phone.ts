/**
 * Normalisasi nomor HP Indonesia ke format kanonis `08xxxxxxxxx`.
 * Menerima: `+62…`, `62…`, `08…`, `wa.me/…`, dan nomor tanpa awalan
 * (Excel membuang leading zero). Dipakai identik saat import & login.
 */
export function normalizePhone(input: string): string {
  let s = String(input ?? "").trim();
  s = s.replace(/^wa\.me\//i, "");
  s = s.replace(/\.0+$/, "");
  const digits = s.replace(/\D/g, "");
  if (!digits) return "";
  let d = digits;
  if (d.startsWith("62")) d = d.slice(2);
  if (!d.startsWith("0")) d = `0${d}`;
  return d;
}
