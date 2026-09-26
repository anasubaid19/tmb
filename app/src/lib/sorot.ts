export interface SegmenSorot {
  teks: string;
  sorot: boolean;
}

/**
 * Pecah teks berdasar daftar frasa penting (cocok case-insensitive).
 * Frasa terpanjang dicoba dulu agar "Ketikkan nama ananda" tidak terpecah
 * oleh kata yang lebih pendek; karakter regex di-escape otomatis.
 */
export function bagiSorotan(teks: string, frasa: string[]): SegmenSorot[] {
  const kata = [...new Set(frasa.map((f) => f.trim()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (!teks || kata.length === 0) return [{ teks, sorot: false }];
  const pola = new RegExp(`(${kata.map(bungkusKata).join("|")})`, "gi");
  const cocok = new Set(kata.map((k) => k.toLowerCase()));
  const hasil: SegmenSorot[] = [];
  for (const b of teks.split(pola)) {
    if (!b) continue;
    hasil.push({ teks: b, sorot: cocok.has(b.toLowerCase()) });
  }
  return hasil;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Keyword satu kata hanya cocok utuh ("\bLULUS\b" tak kena "Kelulusan");
 * frasa multi-kata tetap substring agar kena variasi imbuhan sekitarnya.
 */
function bungkusKata(s: string): string {
  const e = escapeRegExp(s);
  return /\s/.test(s) ? e : `\\b${e}\\b`;
}
