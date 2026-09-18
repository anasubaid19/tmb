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
import { DENAH_FLOORS, type DenahRoomType } from "#/lib/denah-plan.generated";
import { cn } from "#/lib/utils";

/**
 * Denah ruangan Tes Bersama — rekreasi interaktif dari
 * `denah-ruangan-tes-bersama.svg` (3 lantai: LT.1 & LT.2 umum tiap sesi
 * terjadwal, LT.3 khusus Ikhwan).
 *
 * ponytail: data ruangan (label, tipe, posisi kolom/baris) TIDAK ditulis tangan
 * di sini — diturunkan langsung dari koordinat path SVG oleh
 * `scripts/denah_from_svg.ts` ke `src/lib/denah-plan.generated.ts`. Denah asli
 * tidak punya <text>; labelnya dibaca dari atribut aria-label tiap path.
 * SVG-nya diganti → jalankan ulang generator, komponen ini tak perlu disentuh.
 */

type RoomType = DenahRoomType;

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
  lorong: {
    label: "Lorong",
    block: "border-stone-500/40 bg-stone-500/10 text-stone-700",
    dot: "bg-stone-400",
    icon: ArrowUpDownIcon,
  },
  gudang: {
    label: "Gudang",
    block: "border-neutral-500/40 bg-neutral-500/10 text-neutral-700",
    dot: "bg-neutral-400",
    icon: Briefcase01Icon,
  },
};

export function DenahPlan() {
  const [floorId, setFloorId] = useState(DENAH_FLOORS[0].id);
  const [selected, setSelected] = useState<string | null>(null);
  const floor = DENAH_FLOORS.find((f) => f.id === floorId) ?? DENAH_FLOORS[0];
  const rooms = floor.rooms;
  const usedTypes = [...new Set(rooms.map((r) => r.type))];
  const active = rooms.find((r) => r.key === selected) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border bg-muted/40 p-1">
          {DENAH_FLOORS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFloorId(f.id);
                setSelected(null);
              }}
              aria-pressed={f.id === floor.id}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition",
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

      <section
        className="overflow-x-auto rounded-xl border bg-muted/20 p-2 sm:p-3"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: SR/pengguna Tab butuh fokus untuk menggeser denah
        tabIndex={0}
        aria-label="Denah ruangan: geser horizontal untuk melihat semua ruangan"
      >
        {/* ponytail: posisi absolut (persen), bukan grid — karena kotak di
            denah asli TIDAK seragam (tinggi ruang kantor ±21 satuan, sel
            IN/PIR ±17), sehingga grid + span selalu meleset satu sel. */}
        <div
          className="relative min-w-[520px]"
          style={{ aspectRatio: String(floor.aspect) }}
        >
          {rooms.map((room) => {
            const meta = TYPES[room.type];
            return (
              <button
                key={room.key}
                type="button"
                title={`${room.label} — ${meta.label}`}
                aria-pressed={selected === room.key}
                onClick={() =>
                  setSelected(selected === room.key ? null : room.key)
                }
                style={{
                  left: `${room.x}%`,
                  top: `${room.y}%`,
                  width: `${room.w}%`,
                  height: `${room.h}%`,
                }}
                className={cn(
                  "absolute flex flex-col items-center justify-center gap-1 overflow-hidden rounded-md border px-0.5 text-center text-[10px] font-medium leading-tight transition sm:text-xs",
                  "hover:z-10 hover:ring-2 hover:ring-primary/40 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  meta.block,
                  selected === room.key ? "ring-2 ring-primary/60" : "",
                )}
              >
                {/* ponytail: ikon hanya di layar sm+ dan hanya bila kotaknya
                    cukup tinggi — di HP teks ruangan yang paling penting */}
                <Icon
                  icon={meta.icon}
                  size={14}
                  className="hidden shrink-0 sm:block"
                />
                <span className="text-balance">{room.label}</span>
              </button>
            );
          })}
        </div>
      </section>

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
