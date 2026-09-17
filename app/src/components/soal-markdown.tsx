import { useEffect, useState } from "react";
import { renderMdBlocks } from "#/lib/md";

/** Cache teks soal per URL dalam sesi — penguji buka banyak siswa. */
const cache = new Map<string, string>();

/** Tampilkan berkas .md soal sebagai teks (bukan editor, bukan PDF). */
export function SoalMarkdown({ src, title }: { src: string; title: string }) {
  const [text, setText] = useState<string | null>(() => cache.get(src) ?? null);
  const [gagal, setGagal] = useState(false);

  useEffect(() => {
    let hidup = true;
    const cached = cache.get(src);
    if (cached !== undefined) {
      setText(cached);
      return;
    }
    setText(null);
    setGagal(false);
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((t) => {
        cache.set(src, t);
        if (hidup) setText(t);
      })
      .catch(() => {
        if (hidup) setGagal(true);
      });
    return () => {
      hidup = false;
    };
  }, [src]);

  if (gagal)
    return (
      <p className="py-6 text-center text-sm text-destructive">
        Teks soal gagal dimuat. Coba lagi atau buka PDF di bawah.
      </p>
    );
  if (text === null)
    return (
      <p
        className="py-6 text-center text-sm text-muted-foreground"
        role="status"
      >
        Memuat teks soal…
      </p>
    );
  return (
    <article aria-label={title} className="space-y-2">
      {renderMdBlocks(text)}
    </article>
  );
}
