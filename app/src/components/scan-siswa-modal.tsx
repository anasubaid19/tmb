import { Html5Qrcode } from "html5-qrcode";
import { useCallback, useRef, useState } from "react";
import { Modal } from "#/components/ui/dialog";

/** Scan QR tiket siswa → panggil `onPick` dengan item roster yang cocok. */
export function ScanSiswaModal<T extends { kode: string }>({
  roster,
  onPick,
  onClose,
}: {
  roster: T[];
  onPick: (item: T) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // ponytail: onPick inline selalu baru → simpan di ref agar kamera tak restart.
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);

  // ponytail: Modal dirender via Portal (mount async) → useEffect bisa jalan
  // sebelum #qr-siswa ada di DOM. Mulai scanner dari ref callback div.
  // useCallback agar ref tak detach/attach tiap render (stop saat tak jalan = throw).
  const attach = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) {
        const sc = scannerRef.current;
        scannerRef.current = null;
        startedRef.current = false;
        if (sc) {
          try {
            void sc.stop().catch(() => {});
          } catch {
            /* scanner tak pernah jalan (kamera ditolak) — abaikan */
          }
        }
        return;
      }
      if (startedRef.current) return;
      startedRef.current = true;
      const scanner = new Html5Qrcode("qr-siswa");
      scannerRef.current = scanner;
      void scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (text) => {
            const kode = text.trim().toUpperCase();
            const cocok = roster.find((w) => w.kode.toUpperCase() === kode);
            if (cocok) pickRef.current(cocok);
            else
              setError(
                `Kode ${kode} tidak ada di daftar. Arahkan ulang kamera atau tutup lalu cari manual.`,
              );
          },
          () => {},
        )
        .then(() => setReady(true))
        .catch(() =>
          setError(
            "Kamera tidak dapat diakses. Buka via HTTPS dan izinkan kamera.",
          ),
        );
    },
    [roster],
  );

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Scan QR siswa"
      description="Arahkan kamera ke QR tiket siswa"
      sheet
    >
      {/* ponytail: viewport disamakan dgn scanner panitia (routes/scanner):
          persegi 1/1 + bingkai sudut + garis laser. 4/3 bikin persegi
          panjang di HP dan qrbox 250px tak sejajar bingkai. */}
      <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-black">
        <div
          id="qr-siswa"
          ref={attach}
          className="w-full"
          style={{ aspectRatio: "1 / 1" }}
        />
        {ready ? (
          <>
            {/* bingkai sudut + garis scan */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-4 rounded-lg border-2 border-white/70"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-8 animate-[scan-y_2.2s_ease-in-out_infinite] motion-reduce:animate-none"
            >
              {" "}
              <div className="h-0.5 w-full rounded bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.9)]" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-muted text-sm text-muted-foreground">
            Menyiapkan kamera…
          </div>
        )}
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
