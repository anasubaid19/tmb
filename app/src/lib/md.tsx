// biome-ignore-all lint/suspicious/noArrayIndexKey: seluruh isi bersumber dari
// berkas soal statis; urutan baris tidak pernah berubah, aman pakai index.
import type { ReactNode } from "react";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Inline subset: **tebal** dan *miring* (konten milik sendiri). */
function inline(text: string, key: string): ReactNode {
  const parts = esc(text).split(/(\*\*.+?\*\*|\*[^*]+?\*)/g);
  if (parts.length === 1) return parts[0];
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4)
      return <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2)
      return <em key={`${key}-${i}`}>{p.slice(1, -1)}</em>;
    return <span key={`${key}-${i}`}>{p}</span>;
  });
}

/**
 * Render subset markdown (heading, list, quote, paragraf) untuk teks soal.
 * ponytail: subset saja, bukan parser penuh — konten soal hanya memakai
 * bentuk ini; tanpa dep markdown, tanpa risiko XSS (escape dulu).
 * Blok beraksara Arab otomatis RTL + lang="ar" (typeface Amiri via CSS).
 */
export function renderMdBlocks(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  const lines = src.split("\n");
  let list: string[] = [];
  /** Props RTL bila teks mengandung aksara Arab (rentang U+0600–U+06FF). */
  const rtl = (text: string): { dir?: "rtl"; lang?: string } =>
    /[\u0600-\u06FF]/.test(text) ? { dir: "rtl", lang: "ar" } : {};
  const flush = (): void => {
    if (list.length > 0) {
      const items = list;
      list = [];
      out.push(
        <ul key={`ul-${out.length}`} className="list-disc space-y-1 pl-5">
          {items.map((t, i) => (
            <li key={i} {...rtl(t)}>
              {inline(t, `li-${out.length}-${i}`)}
            </li>
          ))}
        </ul>,
      );
    }
  };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) {
      flush();
      return;
    }
    if (line.startsWith("### ")) {
      flush();
      out.push(
        <h4 key={i} className="pt-1 text-sm font-bold" {...rtl(line)}>
          {inline(line.slice(4), `h-${i}`)}
        </h4>,
      );
    } else if (line.startsWith("## ")) {
      flush();
      out.push(
        <h3 key={i} className="pt-2 text-base font-bold" {...rtl(line)}>
          {inline(line.slice(3), `h-${i}`)}
        </h3>,
      );
    } else if (line.startsWith("# ")) {
      flush();
      out.push(
        <h2 key={i} className="text-lg font-bold" {...rtl(line)}>
          {inline(line.slice(2), `h-${i}`)}
        </h2>,
      );
    } else if (line.startsWith("- ")) {
      list.push(line.slice(2));
    } else if (line.startsWith("> ")) {
      flush();
      out.push(
        <blockquote
          key={i}
          className="border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground italic"
          {...rtl(line)}
        >
          {inline(line.slice(2), `q-${i}`)}
        </blockquote>,
      );
    } else {
      flush();
      out.push(
        <p key={i} className="text-sm" {...rtl(line)}>
          {inline(line, `p-${i}`)}
        </p>,
      );
    }
  });
  flush();
  return out;
}
