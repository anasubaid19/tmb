import type { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "#/lib/utils";

/** Konfigurasi seri chart: label + warna (CSS var agar ikut tema). */
export type ChartConfig = Record<string, { label: string; color: string }>;

/**
 * Pembungkus chart gaya shadcn: responsif + pewarisan warna seri.
 * ponytail: subset minimal dari pola shadcn (container + tooltip) — tanpa
 * ChartLegend/ChartStyle karena legenda sudah HTML biasa di pemanggil.
 */
export function ChartContainer({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
        className,
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipRow {
  name: string;
  value: number | string;
  color?: string;
  key: string;
}

/** Isi tooltip gaya shadcn: popover + titik warna per seri. Props sengaja
 *  longgar (unknown) agar cocok dengan payload recharts v3. */
export function ChartTooltipContent({
  active,
  payload,
  label,
  config,
}: {
  active?: boolean;
  payload?: readonly unknown[];
  label?: unknown;
  config: ChartConfig;
}) {
  const rows: TooltipRow[] = (payload ?? []).flatMap((p) => {
    if (typeof p !== "object" || p === null) return [];
    const r = p as {
      name?: unknown;
      value?: unknown;
      color?: unknown;
      dataKey?: unknown;
    };
    if (typeof r.value !== "number" && typeof r.value !== "string") return [];
    return [
      {
        name: String(r.name ?? ""),
        value: r.value,
        color: typeof r.color === "string" ? r.color : undefined,
        key: String(r.dataKey ?? ""),
      },
    ];
  });
  if (!active || rows.length === 0) return null;
  const total = rows.reduce((n, r) => n + (Number(r.value) || 0), 0);
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-xl">
      <p className="mb-1 font-medium tabular-nums">{String(label ?? "")}</p>
      {rows.map((row) => (
        <p
          key={row.key || row.name}
          className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums"
        >
          <span
            className="size-2.5 rounded-sm"
            style={{
              backgroundColor:
                row.color ?? config[row.key]?.color ?? "var(--chart-1)",
            }}
            aria-hidden
          />
          {config[row.key]?.label || row.name || row.key}
          <span className="ml-auto pl-4 font-semibold text-foreground">
            {row.value}
          </span>
        </p>
      ))}
      <p className="mt-1 border-t pt-1 text-xs font-semibold tabular-nums">
        Total {total}
      </p>
    </div>
  );
}
