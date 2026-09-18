import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import type { LembarData } from "#/lib/lembar";

/* Koordinat mm dari studi lembar-validasi.svg (1px = 1/3.779528mm).
   Hal.1: nilai peserta x=80,4 (baris 108,5–149,8); sel paraf x=142,6–185,6.
   Hal.2 = crop x−220,25555: paraf tim di badan tabel; 2 slot foto y≥241
   (baris bold kosong di bawah tabel). */

const PESERTA_Y = [108.5, 118.8, 129.2, 139.5, 149.8];

const PARAF_BOX: Record<string, { top: number; height: number }> = {
  mtk: { top: 195.7, height: 17.6 },
  ing: { top: 223.5, height: 13.4 },
  arb: { top: 236.9, height: 13.1 },
  qur: { top: 250.0, height: 13.4 },
};

function Paraf({
  qr,
  nama,
  qrMm = 9,
  stack = false,
}: {
  qr: string;
  nama: string;
  qrMm?: number;
  /** QR di atas, nama wrap di bawah (kolom validasi interview, lebar). */
  stack?: boolean;
}) {
  return (
    <div
      className={
        stack
          ? "flex h-full flex-col items-start gap-1 px-1"
          : "flex h-full items-center gap-1 px-1"
      }
    >
      <img
        src={qr}
        alt={`Paraf ${nama}`}
        style={{ width: `${qrMm}mm`, height: `${qrMm}mm` }}
      />
      <p
        className="leading-none"
        style={{
          fontFamily: '"MonteCarlo", cursive',
          fontSize: "3.8mm",
          maxWidth: stack ? "100%" : "31mm",
          overflow: "hidden",
          textOverflow: stack ? "clip" : "ellipsis",
          whiteSpace: stack ? "normal" : "nowrap",
          overflowWrap: stack ? "break-word" : "normal",
        }}
      >
        {nama}
      </p>
    </div>
  );
}

function Peserta({ data }: { data: LembarData }) {
  const vals = [
    ["nama", data.peserta.nama],
    ["kode", data.peserta.kode],
    ["cabang", data.peserta.cabang],
    ["kelas", data.peserta.kelasJenjang],
    ["program", data.peserta.program],
  ] as const;
  return (
    <>
      {vals.map(([k, v], i) => (
        <p
          key={k}
          style={{
            position: "absolute",
            left: "80.4mm",
            top: `${PESERTA_Y[i]}mm`,
            width: "106mm",
            transform: "translateY(-100%)",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "3.5mm",
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {v}
        </p>
      ))}
    </>
  );
}

function Page({
  src,
  children,
  last,
}: {
  src: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section
      className="lembar-page"
      style={{
        position: "relative",
        width: "210mm",
        height: "297mm",
        overflow: "hidden",
        background: "#fff",
        pageBreakAfter: last ? "auto" : "always",
      }}
    >
      <img
        src={src}
        alt=""
        aria-hidden
        style={{ position: "absolute", inset: 0, width: "210mm" }}
      />
      {children}
    </section>
  );
}

export function LembarValidasiDocument({ data }: { data: LembarData }) {
  return (
    <div className="lembar-print">
      <style>{`@page{size:A4;margin:0}@media print{body *{visibility:hidden}.lembar-print,.lembar-print *{visibility:visible}.lembar-print{position:static !important;height:auto !important;overflow:visible !important}.lembar-page{margin:0 !important;box-shadow:none !important}.no-print{display:none !important}}`}</style>
      <div className="flex flex-col items-center gap-4">
        <Page src="/lembar-validasi-1.svg">
          <Peserta data={data} />
          {data.tests.map((t) => {
            const box = PARAF_BOX[t.key];
            if (!box || !t.paraf?.qr) return null;
            return (
              <div
                key={t.key}
                style={{
                  position: "absolute",
                  left: "142.6mm",
                  top: `${box.top}mm`,
                  width: "43mm",
                  height: `${box.height}mm`,
                }}
              >
                <Paraf qr={t.paraf.qr} nama={t.paraf.nama} />
              </div>
            );
          })}
        </Page>
        <Page src="/lembar-validasi-2.svg" last>
          <Peserta data={data} />
          {data.interview ? (
            <div
              style={{
                position: "absolute",
                left: "6mm",
                top: "192mm",
                width: "98mm",
                maxHeight: "60mm",
                overflow: "hidden",
              }}
            >
              {data.interview.qr ? (
                <Paraf
                  qr={data.interview.qr}
                  nama={data.interview.nama}
                  qrMm={12}
                  stack
                />
              ) : null}
              {data.interview.catatan ? (
                <p
                  style={{
                    fontFamily: "Arial, Helvetica, sans-serif",
                    fontSize: "2.6mm",
                    lineHeight: 1.3,
                    marginTop: "1mm",
                    padding: "0 1mm",
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {data.interview.catatan}
                </p>
              ) : null}
            </div>
          ) : null}
          {data.fotos.length > 0 ? (
            <div
              style={{
                position: "absolute",
                left: "25.4mm",
                top: "241mm",
                width: "160mm",
                height: "50mm",
                display: "flex",
                gap: "4mm",
                alignItems: "flex-start",
              }}
            >
              {data.fotos.map((f, i) => (
                <img
                  key={f.path}
                  src={f.dataUrl}
                  alt={`Foto interview ${i + 1}`}
                  style={{
                    maxWidth: "78mm",
                    maxHeight: "50mm",
                    objectFit: "contain",
                    border: "0.3mm solid #94a3b8",
                  }}
                />
              ))}
            </div>
          ) : null}
        </Page>
      </div>
    </div>
  );
}

/** Skalakan anak berukuran tetap (dokumen A4 210mm) agar pas lebar wadah —
    selalu center, tanpa scroll geser. Ukur ulang saat resize/rotasi. */
export function FitWidth({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 1, height: 0 });

  useEffect(() => {
    const measure = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const w = inner.offsetWidth;
      if (!w) return;
      // ponytail: tak pernah perbesar di atas 1 — A4 210mm sudah cukup tajam.
      const scale = Math.min(1, outer.clientWidth / w);
      setBox({ scale, height: inner.offsetHeight * scale });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div ref={outerRef} className="w-full overflow-hidden">
      <div
        style={{
          position: "relative",
          ...(box.height ? { height: `${box.height}px` } : undefined),
        }}
      >
        <div
          ref={innerRef}
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: `scale(${box.scale}) translateX(-50%)`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function LembarPrintOverlay({
  data,
  onClose,
}: {
  data: LembarData;
  onClose: () => void;
}) {
  return (
    <div className="lembar-print fixed inset-0 z-[60] overflow-auto bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-white/95 px-4 py-2 backdrop-blur">
        <p className="text-sm font-semibold">
          Lembar Validasi — {data.peserta.nama} ({data.peserta.kode})
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => window.print()}>
            Cetak
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto p-4">
        <LembarValidasiDocument data={data} />
      </div>
    </div>
  );
}
