import { useEffect, useState } from "react";

function parts(target: string): {
  done: boolean;
  d: number;
  h: number;
  m: number;
  s: number;
} {
  const diff = new Date(target).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0)
    return { done: true, d: 0, h: 0, m: 0, s: 0 };
  const total = Math.floor(diff / 1000);
  return {
    done: false,
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

const pad = (n: number): string => String(n).padStart(2, "0");

export function Countdown({
  target,
  label,
}: {
  target: string;
  label: string;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  void tick;
  const p = parts(target);
  if (p.done)
    // ponytail: role=status agar momen selesai diumumkan sekali ke SR
    // (angka per-detik sengaja tidak live: noise).
    return (
      <p role="status" className="text-lg font-semibold text-primary">
        Waktu yang ditunggu telah tiba.
      </p>
    );
  const cells: [string, string][] = [
    [pad(p.d), "Hari"],
    [pad(p.h), "Jam"],
    [pad(p.m), "Menit"],
    [pad(p.s), "Detik"],
  ];
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-2">
        {cells.map(([v, l]) => (
          <div
            key={l}
            className="flex min-w-16 flex-col items-center rounded-lg border bg-card px-3 py-2 shadow-sm"
          >
            <span className="text-2xl font-bold tabular-nums text-primary">
              {v}
            </span>
            <span className="text-xs text-muted-foreground">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
