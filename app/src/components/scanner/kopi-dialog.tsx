import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { labelVarian, type VarianKopi } from "#/lib/kopi-meta";
import { cn } from "#/lib/utils";

/**
 * Fase dialog klaim kopi.
 * - loading: peek sedang jalan
 * - choose : pilih jumlah cup + varian tiap cup
 * - empty  : kuota QR sudah habis
 * - done   : klaim berhasil
 * - error  : kode tak dikenal / gagal klaim
 */
export type KopiDialogState =
  | { phase: "loading"; kode: string }
  | { phase: "choose"; kode: string; nama: string; sisa: number }
  | { phase: "empty"; kode: string; nama: string }
  | {
      phase: "done";
      kode: string;
      nama: string;
      items: VarianKopi[];
      sisa: number;
    }
  | { phase: "error"; message: string };

const VARIAN: VarianKopi[] = ["americano", "aren-latte"];

// Kunci stabil per posisi cup (maks 2) — menghindari index sebagai key.
const CUP_KEYS = ["cup-1", "cup-2"] as const;

export function KopiDialog({
  state,
  busy,
  onClaim,
  onClose,
}: {
  state: KopiDialogState | null;
  busy: boolean;
  onClaim: (items: VarianKopi[]) => void;
  onClose: () => void;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const phase = state?.phase ?? null;

  // Auto-close fase akhir saja; fase "choose" menunggu input barista.
  useEffect(() => {
    if (phase !== "done" && phase !== "empty" && phase !== "error") return;
    const ms = phase === "done" ? 3500 : 4500;
    const id = setTimeout(() => closeRef.current(), ms);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  if (!state) return null;

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop klik-tutup; keyboard pakai Esc */}
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Klaim kopi gratis"
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: menahan klik agar tidak menutup */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation bukan aksi */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg"
        >
          {state.phase === "loading" ? <Loading /> : null}
          {state.phase === "error" ? (
            <ErrorView message={state.message} onClose={onClose} />
          ) : null}
          {state.phase === "empty" ? (
            <EmptyView nama={state.nama} onClose={onClose} />
          ) : null}
          {state.phase === "done" ? (
            <DoneView
              nama={state.nama}
              items={state.items}
              sisa={state.sisa}
              onClose={onClose}
            />
          ) : null}
          {state.phase === "choose" ? (
            <ChooseView
              nama={state.nama}
              kode={state.kode}
              sisa={state.sisa}
              busy={busy}
              onClaim={onClaim}
              onClose={onClose}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

function Header({
  tone,
  title,
  nama,
  kode,
}: {
  tone: "success" | "warning" | "error" | "muted";
  title: string;
  nama?: string;
  kode?: string;
}) {
  const chip = {
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    error: "bg-destructive text-destructive-foreground",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  const icon = { success: "✓", warning: "!", error: "✕", muted: "☕" }[tone];
  return (
    <div className="text-center">
      <span
        className={cn(
          "mx-auto grid size-12 place-items-center rounded-xl text-xl font-semibold",
          chip,
        )}
      >
        {icon}
      </span>
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      {nama ? <p className="mt-1 text-sm font-medium">{nama}</p> : null}
      {kode ? (
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {kode}
        </p>
      ) : null}
    </div>
  );
}

function Loading() {
  return (
    <div className="p-6 text-center">
      <p className="animate-pulse text-sm text-muted-foreground">
        Memeriksa kuota…
      </p>
    </div>
  );
}

function ErrorView({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <Header tone="error" title="Scan Gagal" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <Button className="mt-6 w-full" size="lg" onClick={onClose}>
        OKE
      </Button>
    </div>
  );
}

function EmptyView({ nama, onClose }: { nama: string; onClose: () => void }) {
  return (
    <div className="p-6 text-center">
      <Header tone="warning" title="Kuota Kopi Habis" nama={nama} />
      <p className="mt-3 text-sm text-muted-foreground">
        Jatah 2 kopi untuk QR ini sudah diambil.
      </p>
      <Button className="mt-6 w-full" size="lg" onClick={onClose}>
        Scan Berikutnya
      </Button>
    </div>
  );
}

function DoneView({
  nama,
  items,
  sisa,
  onClose,
}: {
  nama: string;
  items: VarianKopi[];
  sisa: number;
  onClose: () => void;
}) {
  const ringkas = VARIAN.filter((v) => items.includes(v))
    .map((v) => `${items.filter((i) => i === v).length}× ${labelVarian(v)}`)
    .join(" · ");
  return (
    <div className="p-6 text-center">
      <Header tone="success" title="Kopi Diberikan" nama={nama} />
      <div className="mt-5 rounded-lg bg-muted py-4">
        <p className="text-lg font-semibold">{ringkas}</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          {sisa > 0 ? `Sisa kuota ${sisa}` : "Kuota habis"}
        </p>
      </div>
      <Button className="mt-6 w-full" size="lg" onClick={onClose}>
        Scan Berikutnya
      </Button>
    </div>
  );
}

function ChooseView({
  nama,
  kode,
  sisa,
  busy,
  onClaim,
  onClose,
}: {
  nama: string;
  kode: string;
  sisa: number;
  busy: boolean;
  onClaim: (items: VarianKopi[]) => void;
  onClose: () => void;
}) {
  const maxCups = Math.min(sisa, 2);
  const [cups, setCups] = useState(maxCups);
  const [varian, setVarian] = useState<VarianKopi[]>(
    Array.from({ length: maxCups }, () => "americano" as VarianKopi),
  );

  const setJumlah = (n: number) =>
    setVarian((prev) =>
      Array.from({ length: n }, (_, i) => prev[i] ?? "americano"),
    );

  const setVarianAt = (i: number, v: VarianKopi) =>
    setVarian((prev) => prev.map((x, idx) => (idx === i ? v : x)));

  return (
    <div className="p-6">
      <Header tone="muted" title="Ambil Kopi Gratis" nama={nama} kode={kode} />

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Sisa kuota{" "}
        <span className="font-bold text-foreground tabular-nums">{sisa}</span>{" "}
        dari 2
      </p>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
          Jumlah cup
        </p>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: maxCups }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={cups === n}
              onClick={() => {
                setCups(n);
                setJumlah(n);
              }}
              className={cn(
                "min-h-10 rounded-lg border text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-ring",
                cups === n
                  ? "border-transparent bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {n} cup
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {varian.map((v, i) => (
          <div key={CUP_KEYS[i]}>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Cup {i + 1}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {VARIAN.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={v === opt}
                  onClick={() => setVarianAt(i, opt)}
                  className={cn(
                    "min-h-10 rounded-lg border text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    v === opt
                      ? "border-transparent bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {labelVarian(opt)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        className="mt-6 w-full"
        size="lg"
        disabled={busy}
        onClick={() => onClaim(varian.slice(0, cups))}
      >
        {busy ? "Menyimpan…" : `Berikan ${cups} Kopi`}
      </Button>
      <Button
        variant="outline"
        className="mt-2 w-full"
        disabled={busy}
        onClick={onClose}
      >
        Batal
      </Button>
    </div>
  );
}
