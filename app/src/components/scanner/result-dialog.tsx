import { useEffect, useRef } from "react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

/** Hasil satu pemindaian — mirror `ScanOutcome` di routes/scanner. */
export interface ScanResult {
  kode?: string;
  nama?: string;
  tipe?: string;
  duplicate?: boolean;
  error?: string;
}

/**
 * Berapa lama modal bertahan sebelum menutup sendiri.
 *
 * Sukses 3 detik (petugas langsung lanjut ke antrean berikutnya),
 * duplikat 4 detik, error 5 detik (butuh waktu membaca pesan kesalahan).
 */
export function autoCloseMs(r: ScanResult): number {
  if (r.error) return 5000;
  if (r.duplicate) return 4000;
  return 3000;
}

type Tone = "success" | "warning" | "error";

const TONE: Record<
  Tone,
  { ring: string; chip: string; bar: string; icon: string }
> = {
  success: {
    ring: "border-emerald-500/30",
    chip: "bg-success text-success-foreground",
    bar: "bg-emerald-500",
    icon: "✓",
  },
  warning: {
    ring: "border-amber-500/40",
    chip: "bg-warning text-warning-foreground",
    bar: "bg-amber-500",
    icon: "!",
  },
  error: {
    ring: "border-destructive/30",
    chip: "bg-destructive text-destructive-foreground",
    bar: "bg-destructive",
    icon: "✕",
  },
};

export function ResultDialog({
  result,
  onClose,
}: {
  result: ScanResult | null;
  onClose: () => void;
}) {
  const ms = result ? autoCloseMs(result) : 0;

  /**
   * onClose disimpan di ref, TIDAK di dependency effect.
   *
   * Parent mengopernya sebagai arrow function baru tiap render. Kalau ikut jadi
   * dependency, render → onClose baru → effect jalan ulang → timer ter-reset.
   * Hitung mundurnya restart selamanya dan modal TIDAK PERNAH menutup sendiri.
   */
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // ponytail: dialog kustom tanpa focus-trap — minimal pindahkan fokus ke
  // tombol OKE saat muncul agar keyboard/SR mendarat di hasil, bukan tertinggal.
  const okeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (result) okeRef.current?.focus();
  }, [result]);

  useEffect(() => {
    if (!result) return;
    const id = setTimeout(() => closeRef.current(), autoCloseMs(result));
    return () => clearTimeout(id);
  }, [result]);

  // Esc menutup lebih cepat — petugas yang sudah membaca tidak perlu menunggu.
  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result]);

  if (!result) return null;

  const v = view(result);
  const tone = TONE[v.tone];

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop klik-tutup; keyboard pakai Esc + tombol OKE */}
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={v.title}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: hanya menahan klik agar tidak menutup */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation bukan aksi */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "w-full max-w-sm overflow-hidden rounded-3xl border-2 bg-card shadow-2xl",
            tone.ring,
          )}
        >
          <div className="px-6 pt-7 pb-6 text-center">
            <span
              className={cn(
                "mx-auto grid size-14 place-items-center rounded-2xl text-2xl font-extrabold",
                tone.chip,
              )}
            >
              {tone.icon}
            </span>

            <h2 className="mt-4 text-xl font-extrabold">{v.title}</h2>

            {v.name ? (
              <p className="mt-1 text-[17px] font-bold">{v.name}</p>
            ) : null}
            {v.sub ? (
              <p className="mt-1 text-sm text-muted-foreground capitalize">
                {v.sub}
              </p>
            ) : null}

            {v.big ? (
              <div className="mt-5 rounded-2xl bg-muted py-5">
                <p className="text-4xl font-extrabold tabular-nums">{v.big}</p>
                <p className="mt-1 text-[13px] font-semibold text-muted-foreground">
                  {v.bigLabel}
                </p>
              </div>
            ) : null}

            <Button
              ref={okeRef}
              className="mt-6 w-full"
              size="lg"
              onClick={onClose}
            >
              OKE
            </Button>
          </div>

          {/* Bar hitung mundur — petugas tahu kapan modal menutup sendiri. */}
          <div className="h-1.5 bg-muted">
            <div
              className={cn(
                "h-full origin-left animate-[countdown-bar_linear_forwards]",
                tone.bar,
              )}
              style={{ animationDuration: `${ms}ms` }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

type View = {
  tone: Tone;
  title: string;
  name?: string;
  sub?: string;
  big?: string;
  bigLabel?: string;
};

function view(r: ScanResult): View {
  if (r.error) {
    return { tone: "error", title: "Scan Gagal", sub: r.error };
  }
  const sub = [r.tipe, r.kode].filter(Boolean).join(" · ");
  if (r.duplicate) {
    return {
      tone: "warning",
      title: "Sudah Tercatat",
      name: r.nama,
      sub,
      big: r.kode,
      bigLabel: "Kode",
    };
  }
  return {
    tone: "success",
    title: "Tercatat",
    name: r.nama,
    sub,
    big: r.kode,
    bigLabel: "Kode",
  };
}
