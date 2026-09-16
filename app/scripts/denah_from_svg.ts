/**
 * Turunkan data denah (lantai → ruangan + posisi grid) dari SVG denah.
 *
 * Jalankan:
 *   bun scripts/denah_from_svg.ts ["../denah-ruangan-tes-bersama.svg"]
 *
 * Menulis: src/lib/denah-plan.generated.ts
 * ponytail: SVG denah tidak punya <text> — label ruangan ada di atribut
 * aria-label tiap <path>, dan posisinya dari transform path itu sendiri.
 * Karena itu dibaca dari atribut, bukan dari render gambar.
 */

const SVG_PATH =
  process.argv[2] ?? "../denah-ruangan-tes-bersama.svg";
const OUT_PATH = "src/lib/denah-plan.generated.ts";

type Raw = { label: string; x: number; y: number; w: number; h: number };
type Rect = { x1: number; y1: number; x2: number; y2: number; fill?: string };

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const mul = (m: typeof I, n: typeof I) => ({
  a: m.a * n.a + m.c * n.b,
  b: m.b * n.a + m.d * n.b,
  c: m.a * n.c + m.c * n.d,
  d: m.b * n.c + m.d * n.d,
  e: m.a * n.e + m.c * n.f + m.e,
  f: m.b * n.e + m.d * n.f + m.f,
});

function parseTransform(s: string | undefined) {
  let out = I;
  for (const m of (s ?? "").matchAll(
    /(translate|matrix|scale)\(([^)]*)\)/g,
  )) {
    const v = m[2].split(/[ ,]+/).map(Number);
    const t =
      m[1] === "translate"
        ? { ...I, e: v[0] || 0, f: v[1] || 0 }
        : m[1] === "scale"
          ? { ...I, a: v[0], d: v[0] }
          : { a: v[0], b: v[1], c: v[2], d: v[3], e: v[4], f: v[5] };
    out = mul(out, t);
  }
  return out;
}

/** Bounding box path, abaikan parameter busur (a/A) yang merusak perhitungan. */
function pathBBox(d: string) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  let cmd = "";
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let minx = Number.POSITIVE_INFINITY;
  let miny = Number.POSITIVE_INFINITY;
  let maxx = Number.NEGATIVE_INFINITY;
  let maxy = Number.NEGATIVE_INFINITY;
  const add = (px: number, py: number) => {
    if (px < minx) minx = px;
    if (px > maxx) maxx = px;
    if (py < miny) miny = py;
    if (py > maxy) maxy = py;
  };
  let k = 0;
  while (k < toks.length) {
    if (/[a-zA-Z]/.test(toks[k])) {
      cmd = toks[k];
      k += 1;
      if (cmd === "Z" || cmd === "z") {
        x = sx;
        y = sy;
      }
      continue;
    }
    const rel = cmd === cmd.toLowerCase();
    const n = (i: number) => Number.parseFloat(toks[k + i]);
    switch (cmd.toUpperCase()) {
      case "M":
      case "L":
      case "T": {
        x = rel ? x + n(0) : n(0);
        y = rel ? y + n(1) : n(1);
        if (cmd.toUpperCase() === "M") {
          sx = x;
          sy = y;
        }
        add(x, y);
        k += 2;
        break;
      }
      case "H":
        x = rel ? x + n(0) : n(0);
        add(x, y);
        k += 1;
        break;
      case "V":
        y = rel ? y + n(0) : n(0);
        add(x, y);
        k += 1;
        break;
      case "C":
        add(rel ? x + n(0) : n(0), rel ? y + n(1) : n(1));
        add(rel ? x + n(2) : n(2), rel ? y + n(3) : n(3));
        x = rel ? x + n(4) : n(4);
        y = rel ? y + n(5) : n(5);
        add(x, y);
        k += 6;
        break;
      case "S":
      case "Q":
        add(rel ? x + n(0) : n(0), rel ? y + n(1) : n(1));
        x = rel ? x + n(2) : n(2);
        y = rel ? y + n(3) : n(3);
        add(x, y);
        k += 4;
        break;
      case "A":
        x = rel ? x + n(5) : n(5);
        y = rel ? y + n(6) : n(6);
        add(x, y);
        k += 7;
        break;
      default:
        k += 1;
    }
  }
  return { minx, miny, maxx, maxy };
}

const svg = await Bun.file(SVG_PATH).text();

/** Kumpulkan path ber-label + titik jangkar & ukurannya. */
function extract(): Raw[] {
  const out: Raw[] = [];
  const stack: (typeof I)[] = [];
  const re = /<(\/?)(g|path)\b([^>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const [, close, tag, attrs] = m;
    if (tag === "g") {
      if (close) stack.pop();
      else stack.push(parseTransform(attrs.match(/transform="([^"]*)"/)?.[1]));
      continue;
    }
    const label = attrs.match(/aria-label="([^"]*)"/)?.[1];
    if (!label) continue;
    const d = attrs.match(/\bd="([^"]*)"/)?.[1];
    if (!d) continue;
    const own = parseTransform(attrs.match(/transform="([^"]*)"/)?.[1]);
    // ponytail: transform grup TIDAK diikutkan — tiap path sudah membawa
    // matriks absolutnya sendiri (mengikutkan grup = terhitung dua kali).
    const t = own;
    const b = pathBBox(d);
    const cx = t.a * ((b.minx + b.maxx) / 2) + t.e;
    const cy = t.d * ((b.miny + b.maxy) / 2) + t.f;
    out.push({
      label,
      x: cx,
      y: cy,
      w: Math.abs(b.maxx - b.minx) * Math.abs(t.a),
      h: Math.abs(b.maxy - b.miny) * Math.abs(t.d),
    });
  }
  return out;
}

/** Label yang menandakan AWAL nama ruangan — kandidat gabungan tidak boleh
 * salah satu dari ini, supaya "TOILET " + "AKHWAT" berhenti di "AKHWAT" dan
 * tidak menelan "R. FINANCE" / "PIR-6" di sebelahnya. */
const ROOM_START =
  /^(IN-|PIR-|WR-?\d|R\.|LAP\.|LAB IPA|TOILET|TANGGA|LIFT|LORONG|DENAH)/i;

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

/** Gabungkan pecahan label satu ruangan. Hanya label yang JELAS belum
 * lengkap (berakhiran spasi, mis. "TOILET " / "LAB. ") yang disambung dengan
 * potongan lanjutan ("AKHWAT" / "KOMPUTER"). Ruangan utuh tidak pernah
 * digabung — itu yang membuat sel grid rapat ikut tertelan. */
function merge(rows: Raw[]): Raw[] {
  const used = new Set<number>();
  const items = rows.map((r, i) => ({ ...r, i }));
  const out: Raw[] = [];
  for (const a of items) {
    if (used.has(a.i)) continue;
    used.add(a.i);
    let label = a.label;
    let x = a.x;
    let y = a.y;
    if (/\s$/.test(label)) {
      for (;;) {
        const next = items.find(
          (b) =>
            !used.has(b.i) &&
            !ROOM_START.test(b.label.trim()) &&
            Math.abs(b.x - x) < 14 &&
            Math.abs(b.y - y) < 20 &&
            b.y >= y - 3,
        );
        if (!next) break;
        label += next.label;
        used.add(next.i);
        y = Math.max(y, next.y);
      }
    }
    out.push({ label: decode(label), x, y, w: a.w, h: a.h });
  }
  return out;
}

const DECOR =
  /^(DENAH|IN = |PIR = |WR = |Denah dan |sewaktu-waktu|peserta dan |Google Form |September 2026|AKHWAT$|IKHWAN$|\(IKHWAN\)$|SD, SMP)/;

function classify(label: string): string {
  const l = label.trim().toUpperCase();
  if (l.startsWith("PIR")) return "pir";
  if (l.startsWith("IN-") || l === "IN") return "in";
  if (l.startsWith("WR")) return "wr";
  if (l.startsWith("TOILET")) return "toilet";
  if (l.startsWith("TANGGA")) return "tangga";
  if (l.startsWith("LIFT")) return "lift";
  if (l.startsWith("LAP.")) return "lapangan";
  if (l.startsWith("LAB")) return "lab";
  if (l.startsWith("LORONG")) return "lorong";
  if (l.startsWith("R. GYM")) return "gym";
  if (l.startsWith("R. UKS")) return "kesehatan";
  if (l.startsWith("R. PERPUS")) return "perpustakaan";
  if (l.startsWith("R. MEETING")) return "meeting";
  if (l.startsWith("R. CCTV")) return "cctv";
  if (l.startsWith("R. KAMAR") || l.startsWith("R. MUSYRIF"))
    return "asrama";
  if (l.startsWith("R. BOARDING")) return "asrama";
  if (l.startsWith("R. GUDANG")) return "gudang";
  return "kantor";
}

const all = merge(extract());

/** Judul tiap lantai: label "DENAH LT. n …" menandai batas atas lantai.
 * ponytail: harus cocok "DENAH LT" — teks catatan juga diawali "Denah …". */
const titles = all
  .filter((r) => /^DENAH LT/i.test(r.label))
  .sort((a, b) => a.y - b.y);

/** Zona lantai. Judulnya terpecah jadi beberapa path ("DENAH LT. 2 (KHUSUS" +
 * "IKHWAN" + " SD, SMP & SMA)"), jadi kata kuncinya dicari di label yang
 * sebaris dengan judul. */
function zoneOf(title: Raw): "AKHWAT" | "IKHWAN" {
  const near = all.filter(
    (r) => r.y > title.y - 3 && r.y < title.y + 14 && /AKHWAT|IKHWAN/i.test(r.label),
  );
  const text = [title.label, ...near.map((r) => r.label)].join(" ");
  return /IKHWAN/i.test(text) ? "IKHWAN" : "AKHWAT";
}

const bands = titles.map((t, i) => ({
  title: t.label,
  zone: zoneOf(t),
  top: t.y - 8,
  bottom: titles[i + 1] ? titles[i + 1].y - 8 : Number.POSITIVE_INFINITY,
}));

/** Ruangan saja — judul, legenda, dan catatan dibuang. */
const merged = all.filter((r) => !DECOR.test(r.label));

/** Path berbentuk tanpa label — calon kotak ruangan (240 di denah ini). */
function extractShapes(): Rect[] {
  const out: Rect[] = [];
  // ponytail: <defs> memuat <clipPath> selebar artboard (1212 satuan). Kalau
  // ikut dipindai, batas lantai meledak jadi 30x139 sel.
  const body = svg.replace(/<defs[\s\S]*?<\/defs>/g, "");
  for (const c of body.split("<path").slice(1)) {
    const end = c.indexOf("/>");
    if (end < 0) continue;
    const head = c.slice(0, end);
    if (/aria-label="/.test(head)) continue;
    const d = head.match(/\bd="([^"]*)"/)?.[1];
    if (!d) continue;
    // ponytail: JANGAN saring berdasarkan warna. Sebagian ruangan (mis.
    // LAP. BADMINTON, LIFT) digambar putih polos, jadi menyaring putih justru
    // membuang ruangan asli dan menyisakan bentuk dekoratif tipis di dalamnya.
    // Pembedanya ukuran + keberadaan label, bukan warna.
    const fill =
      head.match(/fill:(#[0-9a-fA-F]{3,8})/)?.[1] ??
      head.match(/fill="([^"]+)"/)?.[1] ??
      "";
    const t = parseTransform(head.match(/transform="([^"]*)"/)?.[1]);
    const b = pathBBox(d);
    const x1 = Math.min(t.a * b.minx, t.a * b.maxx) + t.e;
    const x2 = Math.max(t.a * b.minx, t.a * b.maxx) + t.e;
    const y1 = Math.min(t.d * b.miny, t.d * b.maxy) + t.f;
    const y2 = Math.max(t.d * b.miny, t.d * b.maxy) + t.f;
    if (x2 - x1 <= 0 || y2 - y1 <= 0) continue;
    out.push({ x1, y1, x2, y2, fill });
  }
  return out;
}

function slug(label: string, seen: Map<string, number>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 14) || "room";
  const n = (seen.get(base) ?? 0) + 1;
  seen.set(base, n);
  return n > 1 ? `${base}${n}` : base;
}

const shapes = extractShapes();

/** Label ruangan per lantai (dipakai dua kali: menyaring kotak & menyusun). */
const floorRooms = bands.map((b) =>
  merged
    .filter((r) => r.y > b.top && r.y < b.bottom)
    .sort((p, q) => p.y - q.y || p.x - q.x),
);

/**
 * Kotak yang benar-benar MEMUAT label ruangan. Dengan saringan ini kotak
 * legenda, kotak catatan (kuningnya sama dengan ruangan), bar judul, dan
 * perabot kecil tersingkir sendiri — warnanya tak bisa dipakai sebagai pembeda.
 */
const floorBoxes = floorRooms.map((rooms, i) => {
  const band = bands[i];
  return shapes.filter(
    (s) =>
      // ukuran minimal ~1 sel: menyaring simbol perabot (kasur, meja) yang
      // kebetulan berada tepat di bawah teks label.
      s.x2 - s.x1 >= 25 &&
      s.y2 - s.y1 >= 10 &&
      // harus di dalam pita lantainya: menyaring frame/bingkai halaman yang
      // membentang seluruh dokumen dan memuat label semua lantai.
      s.y1 >= band.top - 2 &&
      s.y2 <= band.bottom + 2 &&
      // toleransi ±5 sama dengan boxOf: label kadang duduk persis di tepi
      // kotaknya (mis. "LAP. BADMINTON" 3 satuan di bawah dasar kotak).
      rooms.some(
        (r) =>
          r.x >= s.x1 - 5 &&
          r.x <= s.x2 + 5 &&
          r.y >= s.y1 - 5 &&
          r.y <= s.y2 + 5,
      ),
  );
});

// ponytail: ukuran sel WAJIB dihitung dari kotak ruangan saja. Kalau semua
// bentuk ikut dihitung (perabot: kasur, meja, simbol), median jaraknya jadi
// beberapa satuan dan seluruh grid rusak.
const floors = bands.map((b, i) => {
  const rooms = floorRooms[i];
  const boxes = floorBoxes[i];
  if (boxes.length === 0) return null;

  // Kotak lantai = pembatas semua kotak ruangan; dipakai sebagai acuan 0..100%.
  const fx1 = Math.min(...boxes.map((s) => s.x1));
  const fy1 = Math.min(...boxes.map((s) => s.y1));
  const fx2 = Math.max(...boxes.map((s) => s.x2));
  const fy2 = Math.max(...boxes.map((s) => s.y2));
  const fw = fx2 - fx1;
  const fh = fy2 - fy1;

  /**
   * Kotak TERKECIL yang memuat label ini, minimal ~1 sel, di dalam pita
   * lantai. Bukan terbesar: frame/bingkai lantai juga memuat semua label, dan
   * kalau dipilih, semua ruangan jadi sebesar lantai.
   */
  const boxOf = (room: (typeof rooms)[number]) => {
    let best: Rect | null = null;
    let bestArea = Number.POSITIVE_INFINITY;
    for (const s of boxes) {
      if (
        room.x < s.x1 - 5 ||
        room.x > s.x2 + 5 ||
        room.y < s.y1 - 5 ||
        room.y > s.y2 + 5
      )
        continue;
      const area = (s.x2 - s.x1) * (s.y2 - s.y1);
      if (area < bestArea) {
        bestArea = area;
        best = s;
      }
    }
    return best;
  };

  const rects: (Rect | null)[] = rooms.map(boxOf);

  /**
   * Satu path bisa menutupi beberapa ruangan sekaligus (mis. kolom kantor
   * digambar sebagai satu kotak tinggi). Kotak itu dibagi ke label di
   * dalamnya dengan potongan di TENGAH antara dua label berurutan — jadi
   * tinggi tiap bagian mengikuti posisi label aslinya, bukan dibagi rata.
   */
  const members = new Map<number, number[]>();
  rects.forEach((s, k) => {
    if (!s) return;
    const key = boxes.indexOf(s);
    if (key < 0) return;
    members.set(key, [...(members.get(key) ?? []), k]);
  });
  for (const ks of members.values()) {
    if (ks.length < 2) continue;
    const box = rects[ks[0]] as Rect;
    const sameRow = ks.every((k) => Math.abs(rooms[k].y - rooms[ks[0]].y) < 6);
    const sameCol = ks.every((k) => Math.abs(rooms[k].x - rooms[ks[0]].x) < 6);
    if (sameRow) {
      const ord = [...ks].sort((a, z) => rooms[a].x - rooms[z].x);
      ord.forEach((k, idx) => {
        const left = idx === 0 ? box.x1 : (rooms[ord[idx - 1]].x + rooms[k].x) / 2;
        const right =
          idx === ord.length - 1
            ? box.x2
            : (rooms[k].x + rooms[ord[idx + 1]].x) / 2;
        rects[k] = { x1: left, y1: box.y1, x2: right, y2: box.y2 };
      });
    } else if (sameCol) {
      const ord = [...ks].sort((a, z) => rooms[a].y - rooms[z].y);
      ord.forEach((k, idx) => {
        const top = idx === 0 ? box.y1 : (rooms[ord[idx - 1]].y + rooms[k].y) / 2;
        const bottom =
          idx === ord.length - 1
            ? box.y2
            : (rooms[k].y + rooms[ord[idx + 1]].y) / 2;
        rects[k] = { x1: box.x1, y1: top, x2: box.x2, y2: bottom };
      });
    }
  }

  const pct = (v: number, total: number) =>
    Math.round((v / total) * 10000) / 100;
  const seen = new Map<string, number>();
  const out = rooms.map((room, k) => {
    const s = rects[k] ?? {
      x1: room.x - room.w / 2,
      y1: room.y - room.h / 2,
      x2: room.x + room.w / 2,
      y2: room.y + room.h / 2,
    };
    return {
      key: slug(room.label, seen),
      label: room.label,
      type: classify(room.label),
      x: pct(s.x1 - fx1, fw),
      y: pct(s.y1 - fy1, fh),
      w: pct(s.x2 - s.x1, fw),
      h: pct(s.y2 - s.y1, fh),
    };
  });
  const lantai = /MASJID/i.test(b.title)
    ? `Lantai ${b.title.match(/LT\.\s*(\d)/)?.[1]} Masjid`
    : `Lantai ${b.title.match(/LT\.\s*(\d)/)?.[1]}`;
  return {
    id: `lt${i + 1}`,
    label: lantai,
    zone:
      b.zone === "IKHWAN"
        ? "Khusus Ikhwan — SD, SMP & SMA"
        : "Khusus Akhwat — SD, SMP & SMA",
    aspect: Math.round((fw / fh) * 1000) / 1000,
    rooms: out,
  };
}).filter((f) => f !== null);

// ponytail: penjaga — kotak dibagi dari geometri SVG, jadi tumpang tindih
// seharusnya mustahil. Kalau tetap terjadi, denah yang dikirim akan menyesatkan
// (peserta tak bisa menemukan ruangnya) — lebih baik generate GAGAL.
for (const f of floors) {
  for (let a = 0; a < f.rooms.length; a++) {
    for (let b = a + 1; b < f.rooms.length; b++) {
      const A = f.rooms[a];
      const B = f.rooms[b];
      const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
      const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (ox > 1.5 && oy > 1.5) {
        console.error(
          `BENTROK ${f.id}: "${A.label}" dan "${B.label}" tumpang tindih ` +
            `${ox.toFixed(1)}% x ${oy.toFixed(1)}%.`,
        );
        process.exit(1);
      }
    }
  }
}

const lines: string[] = [];
lines.push("// GENERATED — jangan edit manual.");
lines.push("// Dibuat oleh scripts/denah_from_svg.ts dari denah-ruangan-tes-bersama.svg.");
lines.push("// Regen: bun scripts/denah_from_svg.ts && bun run check:fix && bun run build");
lines.push("");
lines.push("export type DenahRoomType =");
for (const t of ["pir", "in", "wr", "toilet", "tangga", "lift", "lapangan", "gym", "lab", "kantor", "kesehatan", "perpustakaan", "kelas", "asrama", "meeting", "cctv", "lorong", "gudang"]) {
  lines.push(`  | "${t}"`);
}
lines.push(";");
lines.push("");
lines.push("export interface DenahRoom {");
lines.push("  key: string;");
lines.push("  label: string;");
lines.push("  type: DenahRoomType;");
lines.push("  /** Posisi & ukuran relatif lantai (persen 0..100). */");
lines.push("  x: number;");
lines.push("  y: number;");
lines.push("  w: number;");
lines.push("  h: number;");
lines.push("}");
lines.push("");
lines.push("export interface DenahFloor {");
lines.push("  id: string;");
lines.push("  label: string;");
lines.push("  zone: string;");
lines.push("  /** Rasio lebar:tinggi area lantai. */");
lines.push("  aspect: number;");
lines.push("  rooms: DenahRoom[];");
lines.push("}");
lines.push("");
lines.push("export const DENAH_FLOORS: DenahFloor[] = [");
for (const f of floors) {
  lines.push("  {");
  lines.push(`    id: ${JSON.stringify(f.id)},`);
  lines.push(`    label: ${JSON.stringify(f.label)},`);
  lines.push(`    zone: ${JSON.stringify(f.zone)},`);
  lines.push(`    aspect: ${f.aspect},`);
  lines.push("    rooms: [");
  for (const r of f.rooms) {
    lines.push(
      `      { key: ${JSON.stringify(r.key)}, label: ${JSON.stringify(r.label)}, type: ${JSON.stringify(r.type)}, x: ${r.x}, y: ${r.y}, w: ${r.w}, h: ${r.h} },`,
    );
  }
  lines.push("    ],");
  lines.push("  },");
}
lines.push("];");
lines.push("");
await Bun.write(OUT_PATH, lines.join("\n"));

console.log(`lantai: ${floors.length}`);
for (const f of floors) {
  console.log(
    `  ${f.id} ${f.label.padEnd(16)} ${f.zone.padEnd(32)} ${String(f.rooms.length).padStart(2)} ruangan`,
  );
}
console.log(`\ntotal ruangan: ${floors.reduce((n, f) => n + f.rooms.length, 0)}`);
console.log(`ditulis: ${OUT_PATH}`);


export {};
