import {
  ArrowUpDownIcon,
  BadmintonIcon,
  BedIcon,
  Briefcase01Icon,
  CctvIcon,
  Dumbbell01Icon,
  EntranceStairsIcon,
  FlaskConicalIcon,
  HealthIcon,
  LibraryIcon,
  PencilEdit01Icon,
  PresentationBarChart01Icon,
  SchoolIcon,
  Toilet01Icon,
  UserAccountIcon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useState } from "react";
import { Icon } from "#/components/ui/icon";
import { cn } from "#/lib/utils";

/**
 * Denah ruangan Tes Bersama — rekreasi digital dari
 * `denah-ruangan-tes-bersama.svg` (2 lantai: LT.1 Akhwat, LT.2 Ikhwan).
 *
 * ponytail: geometri disusun via `grid-template-areas` (ASCII map) agar
 * bentuk/posisi ruangan tetap terbaca tanpa SVG. Kalau nanti butuh posisi
 * persis piksel-per-piksel, ganti map-nya dengan koordinat asli SVG.
 */

type RoomType =
  | "pir"
  | "in"
  | "wr"
  | "toilet"
  | "tangga"
  | "lift"
  | "lapangan"
  | "gym"
  | "lab"
  | "kantor"
  | "kesehatan"
  | "perpustakaan"
  | "kelas"
  | "asrama"
  | "meeting"
  | "cctv";

interface TypeMeta {
  /** Keterangan legenda. */
  label: string;
  /** Kelas warna blok ruangan (Tailwind, literal agar ter-scan). */
  block: string;
  /** Kelas warna titik legenda. */
  dot: string;
  icon: IconSvgElement;
}

const TYPES: Record<RoomType, TypeMeta> = {
  pir: {
    label: "PIR — Parent Interview Room",
    block: "border-sky-500/40 bg-sky-500/15 text-sky-800",
    dot: "bg-sky-500",
    icon: UserMultiple02Icon,
  },
  in: {
    label: "IN — Interview / Tes Lisan siswa",
    block: "border-rose-500/40 bg-rose-500/15 text-rose-800",
    dot: "bg-rose-500",
    icon: UserAccountIcon,
  },
  wr: {
    label: "WR — Written Test Math",
    block: "border-green-500/40 bg-green-500/15 text-green-800",
    dot: "bg-green-500",
    icon: PencilEdit01Icon,
  },
  toilet: {
    label: "Toilet",
    block: "border-yellow-500/50 bg-yellow-400/25 text-yellow-800",
    dot: "bg-yellow-400",
    icon: Toilet01Icon,
  },
  tangga: {
    label: "Tangga",
    block: "border-amber-500/40 bg-amber-400/20 text-amber-800",
    dot: "bg-amber-400",
    icon: EntranceStairsIcon,
  },
  lift: {
    label: "Lift",
    block: "border-slate-500/40 bg-slate-500/10 text-slate-700",
    dot: "bg-slate-400",
    icon: ArrowUpDownIcon,
  },
  lapangan: {
    label: "Lapangan",
    block: "border-teal-500/40 bg-teal-500/15 text-teal-800",
    dot: "bg-teal-500",
    icon: BadmintonIcon,
  },
  gym: {
    label: "Gym Room",
    block: "border-indigo-500/40 bg-indigo-500/15 text-indigo-800",
    dot: "bg-indigo-500",
    icon: Dumbbell01Icon,
  },
  lab: {
    label: "Laboratorium",
    block: "border-violet-500/40 bg-violet-500/15 text-violet-800",
    dot: "bg-violet-500",
    icon: FlaskConicalIcon,
  },
  kantor: {
    label: "Ruang kantor / kerja",
    block: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
    icon: Briefcase01Icon,
  },
  kesehatan: {
    label: "UKS / kesehatan",
    block: "border-pink-500/40 bg-pink-500/15 text-pink-800",
    dot: "bg-pink-500",
    icon: HealthIcon,
  },
  perpustakaan: {
    label: "Perpustakaan",
    block: "border-orange-500/40 bg-orange-500/15 text-orange-800",
    dot: "bg-orange-500",
    icon: LibraryIcon,
  },
  kelas: {
    label: "Ruang kelas",
    block: "border-cyan-500/40 bg-cyan-500/15 text-cyan-800",
    dot: "bg-cyan-500",
    icon: SchoolIcon,
  },
  asrama: {
    label: "Asrama / musyrif",
    block: "border-emerald-500/40 bg-emerald-500/15 text-emerald-800",
    dot: "bg-emerald-500",
    icon: BedIcon,
  },
  meeting: {
    label: "Ruang rapat",
    block: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-800",
    dot: "bg-fuchsia-500",
    icon: PresentationBarChart01Icon,
  },
  cctv: {
    label: "Ruang CCTV",
    block: "border-zinc-500/40 bg-zinc-500/10 text-zinc-700",
    dot: "bg-zinc-400",
    icon: CctvIcon,
  },
};

interface Room {
  label: string;
  type: RoomType;
}

const ROOMS: Record<string, Room> = {
  // kantor & ruang kerja
  md: { label: "R. MD", type: "kantor" },
  guru: { label: "R. Guru", type: "kantor" },
  guru2: { label: "R. Guru", type: "kantor" },
  wakasek: { label: "R. Wakasek", type: "kantor" },
  kepsek: { label: "R. Kepsek", type: "kantor" },
  dirpen: { label: "R. Dirpen", type: "kantor" },
  markaz: { label: "R. Markaz", type: "kantor" },
  arabic: { label: "R. Arabic", type: "kantor" },
  presdir: { label: "R. Presdir", type: "kantor" },
  finance: { label: "R. Finance", type: "kantor" },
  ppdb: { label: "R. PPDB", type: "kantor" },
  admin: { label: "R. Administrasi", type: "kantor" },
  yayasan: { label: "R. Yayasan", type: "kantor" },
  gnc: { label: "R. G&C", type: "kantor" },
  // fasilitas khusus
  uks: { label: "R. UKS", type: "kesehatan" },
  perpus: { label: "R. Perpus", type: "perpustakaan" },
  movingClass: { label: "Moving Class", type: "kelas" },
  boarding: { label: "R. Boarding", type: "asrama" },
  musyrif: { label: "R. Musyrif", type: "asrama" },
  meeting: { label: "R. Meeting", type: "meeting" },
  cctv: { label: "R. CCTV", type: "cctv" },
  // sirkulasi & lapangan
  tangga1: { label: "Tangga", type: "tangga" },
  tangga2: { label: "Tangga", type: "tangga" },
  tangga3: { label: "Tangga", type: "tangga" },
  tangga4: { label: "Tangga", type: "tangga" },
  lift: { label: "Lift", type: "lift" },
  badminton: { label: "Lap. Badminton", type: "lapangan" },
  pingpong: { label: "Lap. Ping Pong", type: "lapangan" },
  gym1: { label: "Gym Room", type: "gym" },
  gym2: { label: "Gym Room", type: "gym" },
  labkomp: { label: "Lab. Komputer", type: "lab" },
  labIpa: { label: "Lab IPA", type: "lab" },
  labIpaKosong: { label: "Lab IPA (Kosong)", type: "lab" },
  toiletIkhwan: { label: "Toilet Ikhwan", type: "toilet" },
  toiletAkhwat: { label: "Toilet Akhwat", type: "toilet" },
};

for (let n = 1; n <= 12; n++)
  ROOMS[`in${n}`] = { label: `IN-${n}`, type: "in" };
for (let n = 1; n <= 16; n++)
  ROOMS[`pir${n}`] = { label: `PIR-${n}`, type: "pir" };
for (let n = 1; n <= 4; n++) ROOMS[`wr${n}`] = { label: `WR-${n}`, type: "wr" };

/**
 * Satu ruangan = satu sel grid. `c`/`r` mengacu ke lattice denah asli
 * (lebar kolom 64.16, tinggi baris 27.95 pada koordinat SVG), `cs`/`rs` = span.
 * Posisi diambil langsung dari koordinat path SVG, jadi susunannya sama
 * dengan denah asli.
 */
interface RoomCell {
  key: string;
  c: number;
  r: number;
  cs?: number;
  rs?: number;
}

interface Floor {
  id: string;
  label: string;
  /** Zona gender sesuai judul di denah asli. */
  zone: string;
  /** Kolom paling kiri pada denah asli (untuk normalisasi grid). */
  cMin: number;
  cols: number;
  rows: number;
  cells: RoomCell[];
}

const COLS = 9;
const ROWS = 11;
/** Rasio grid: (9 × 64.16) / (11 × 27.95). */
const PLAN_ASPECT = (COLS * 64.16) / (ROWS * 27.95);

const FLOORS: Floor[] = [
  {
    id: "lt1",
    label: "Lantai 1",
    zone: "Khusus Akhwat — SMP & SMA",
    cMin: 0,
    cols: COLS,
    rows: ROWS,
    cells: [
      { key: "md", c: 0, r: 0 },
      { key: "guru", c: 1, r: 0, cs: 3 },
      { key: "toiletIkhwan", c: 4, r: 0 },
      { key: "wakasek", c: 0, r: 1, rs: 2 },
      { key: "in1", c: 1, r: 1 },
      { key: "pir1", c: 2, r: 1 },
      { key: "in2", c: 3, r: 1 },
      { key: "pir2", c: 4, r: 1 },
      { key: "presdir", c: 1, r: 2, rs: 2 },
      { key: "badminton", c: 2, r: 2, cs: 2, rs: 6 },
      { key: "in3", c: 4, r: 2 },
      { key: "pir3", c: 4, r: 3 },
      { key: "kepsek", c: 0, r: 3, rs: 2 },
      { key: "pir5", c: 1, r: 4 },
      { key: "in4", c: 4, r: 4 },
      { key: "dirpen", c: 0, r: 5 },
      { key: "tangga1", c: 1, r: 5 },
      { key: "pir4", c: 4, r: 5 },
      { key: "markaz", c: 0, r: 6 },
      { key: "finance", c: 1, r: 6 },
      { key: "lift", c: 4, r: 6, rs: 3 },
      { key: "boarding", c: 5, r: 6, rs: 2 },
      { key: "arabic", c: 0, r: 7, rs: 2 },
      { key: "pir6", c: 1, r: 7 },
      { key: "wr1", c: 1, r: 8 },
      { key: "admin", c: 2, r: 8, cs: 2 },
      { key: "cctv", c: 5, r: 8 },
      { key: "gym1", c: 6, r: 8 },
      { key: "gym2", c: 7, r: 8 },
      { key: "toiletAkhwat", c: 8, r: 8 },
      { key: "guru2", c: 0, r: 9 },
      { key: "ppdb", c: 1, r: 9, rs: 2 },
      { key: "meeting", c: 5, r: 9 },
      { key: "pingpong", c: 6, r: 9, cs: 2 },
      { key: "labkomp", c: 8, r: 9 },
      { key: "tangga2", c: 4, r: 9 },
      { key: "uks", c: 0, r: 10 },
      { key: "yayasan", c: 5, r: 10, cs: 3 },
      { key: "pir7", c: 8, r: 10 },
    ],
  },
  {
    id: "lt2",
    label: "Lantai 2",
    zone: "Khusus Ikhwan — SMP & SMA",
    cMin: 1,
    cols: COLS,
    rows: ROWS,
    cells: [
      { key: "toiletIkhwan", c: 4, r: 0 },
      { key: "in6", c: 1, r: 1 },
      { key: "pir8", c: 2, r: 1 },
      { key: "in7", c: 3, r: 1 },
      { key: "musyrif", c: 4, r: 1 },
      { key: "in5", c: 1, r: 2 },
      { key: "wr4", c: 4, r: 2 },
      { key: "badminton", c: 2, r: 2, cs: 2, rs: 6 },
      { key: "wr3", c: 1, r: 3 },
      { key: "in8", c: 4, r: 3 },
      { key: "tangga3", c: 1, r: 4, rs: 2 },
      { key: "pir9", c: 4, r: 4 },
      { key: "gnc", c: 1, r: 6 },
      { key: "in9", c: 4, r: 5 },
      { key: "pir12", c: 1, r: 7 },
      { key: "lift", c: 4, r: 6, rs: 3 },
      { key: "pir11", c: 1, r: 8 },
      { key: "in10", c: 2, r: 8 },
      { key: "pir10", c: 3, r: 8 },
      { key: "wr2", c: 5, r: 8 },
      { key: "in11", c: 6, r: 8 },
      { key: "in12", c: 7, r: 8 },
      { key: "movingClass", c: 8, r: 8 },
      { key: "toiletAkhwat", c: 9, r: 8 },
      { key: "perpus", c: 1, r: 9, rs: 2 },
      { key: "tangga4", c: 4, r: 9 },
      { key: "labIpaKosong", c: 5, r: 9 },
      { key: "pingpong", c: 6, r: 9, cs: 2 },
      { key: "pir13", c: 8, r: 9 },
      { key: "labIpa", c: 5, r: 10 },
      { key: "pir16", c: 6, r: 10 },
      { key: "pir15", c: 7, r: 10 },
      { key: "pir14", c: 8, r: 10 },
    ],
  },
];

export function DenahPlan() {
  const [floorId, setFloorId] = useState(FLOORS[0].id);
  const [selected, setSelected] = useState<string | null>(null);
  const floor = FLOORS.find((f) => f.id === floorId) ?? FLOORS[0];
  const usedTypes = [
    ...new Set(
      floor.cells.map((cell) => ROOMS[cell.key]?.type).filter(Boolean),
    ),
  ] as RoomType[];

  const active = selected ? ROOMS[selected] : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full border bg-muted/40 p-1">
          {FLOORS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFloorId(f.id);
                setSelected(null);
              }}
              aria-pressed={f.id === floor.id}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition",
                f.id === floor.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {floor.label} · {floor.zone}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-muted/20 p-2 sm:p-3">
        <div
          className="grid min-w-[520px] gap-1"
          style={{
            gridTemplateColumns: `repeat(${floor.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${floor.rows}, minmax(0, 1fr))`,
            aspectRatio: String(PLAN_ASPECT),
          }}
        >
          {floor.cells.map((cell) => {
            const room = ROOMS[cell.key];
            if (!room) return null;
            const meta = TYPES[room.type];
            return (
              <button
                key={cell.key}
                type="button"
                title={`${room.label} — ${meta.label}`}
                aria-pressed={selected === cell.key}
                onClick={() =>
                  setSelected(selected === cell.key ? null : cell.key)
                }
                style={{
                  gridColumn: `${cell.c - floor.cMin + 1} / span ${cell.cs ?? 1}`,
                  gridRow: `${cell.r + 1} / span ${cell.rs ?? 1}`,
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 overflow-hidden rounded-md border px-1 py-1 text-center text-[10px] font-medium leading-tight transition sm:text-[11px]",
                  "hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  meta.block,
                  selected === cell.key ? "ring-2 ring-primary/60" : "",
                )}
              >
                <Icon icon={meta.icon} size={14} />
                <span className="text-balance">{room.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="min-h-5 text-sm text-muted-foreground">
        {active
          ? `${active.label} — ${TYPES[active.type].label}`
          : "Klik ruangan untuk melihat keterangannya."}
      </p>

      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {usedTypes.map((type) => (
          <li key={type} className="flex items-center gap-2 text-xs">
            <span
              className={cn("size-3 rounded-full", TYPES[type].dot)}
              aria-hidden
            />
            <span className="text-muted-foreground">{TYPES[type].label}</span>
          </li>
        ))}
      </ul>

      <p className="text-pretty text-xs text-muted-foreground">
        Denah dan pembagian ruangan dapat berubah sewaktu-waktu, menyesuaikan
        jumlah peserta dan data terbaru.
      </p>
    </div>
  );
}
