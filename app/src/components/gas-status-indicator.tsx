import { useEffect, useState } from "react";
import { getGasStatusFn } from "#/lib/site";

interface GasStatus {
  connected: boolean;
  source: string;
}

export function GasStatusIndicator() {
  const [status, setStatus] = useState<GasStatus | null>(null);

  useEffect(() => {
    let alive = true;
    getGasStatusFn()
      .then((s) => {
        if (alive) setStatus(s);
      })
      .catch(() => {
        if (alive) setStatus({ connected: false, source: "none" });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!status) return null;

  const connected = status.connected;
  return (
    <span
      title={
        connected
          ? "Terhubung ke Google Sheet (data asli)"
          : "Mode mock — belum terhubung ke Google Sheet"
      }
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none text-muted-foreground"
    >
      <span
        className={
          connected
            ? "size-2 rounded-full bg-emerald-500"
            : "size-2 rounded-full bg-amber-500"
        }
        aria-hidden="true"
      />
      {connected ? "Google Sheet" : "Mode mock"}
    </span>
  );
}
