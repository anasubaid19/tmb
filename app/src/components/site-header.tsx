import {
  Cancel01Icon,
  Login03Icon,
  Megaphone01Icon,
  Menu01Icon,
} from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Icon } from "#/components/ui/icon";
import type { Cabang } from "#/lib/site";
import { cn } from "#/lib/utils";

/** Label tab pendek kapital, mis. AW1 → "AL-WILDAN 1". */
export function shortCabang(nama: string, id: string) {
  const n = id.replace(/\D/g, "");
  return n ? `AL-WILDAN ${n}` : nama.toUpperCase();
}

/** Nama cabang lengkap kapital, mis. "Al-Wildan 1 Gading Serpong" → "AL-WILDAN ISLAMIC SCHOOL 1 GADING SERPONG". */
export function fullCabang(nama: string) {
  return nama.replace(/^al-wildan/i, "AL-WILDAN ISLAMIC SCHOOL").toUpperCase();
}

export function SiteHeader({
  cabang,
  currentId,
}: {
  cabang: Cabang[];
  currentId: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <header ref={ref} className="border-b bg-white">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium"
      >
        Lewati ke konten
      </a>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Link
          to="/"
          search={{ cabang: currentId }}
          className="flex shrink-0 items-center gap-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
            W
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold">Tes Masuk Bersama</span>
            <span className="block text-xs text-muted-foreground">
              AL-WILDAN ISLAMIC SCHOOL
            </span>
          </span>
        </Link>
        {/* Desktop: baris tombol seperti biasa. */}
        <nav
          aria-label="Navigasi cabang"
          className="hidden min-w-0 flex-1 items-center justify-end gap-1 sm:flex"
        >
          {cabang.map((c) => (
            <Link
              key={c.id}
              to="/"
              search={{ cabang: c.id }}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm font-medium transition-[color,background-color,scale] outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]",
                c.id === currentId
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {shortCabang(c.nama, c.id)}
            </Link>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-border" />
          <Link
            to="/pengumuman"
            search={{ cabang: currentId }}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium transition-[color,background-color,scale] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
          >
            <Icon icon={Megaphone01Icon} size={16} />
            Pengumuman
          </Link>
          <Link
            to="/siswa/login"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium transition-[color,background-color,scale] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
          >
            <Icon icon={Login03Icon} size={16} />
            Portal
          </Link>
        </nav>
        {/* Mobile: tombol-tombol masuk ke ikon 3 garis. */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-input outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] sm:hidden"
        >
          <Icon icon={open ? Cancel01Icon : Menu01Icon} size={20} />
        </button>
      </div>
      {/* ponytail: disclosure sederhana, bukan modal — tanpa focus-trap. */}
      {open && (
        <nav id="menu-mobile" aria-label="Menu" className="border-t sm:hidden">
          <div className="max-h-[calc(100dvh-4.5rem)] space-y-1 overflow-y-auto px-4 py-3">
            {cabang.map((c) => (
              <Link
                key={c.id}
                to="/"
                search={{ cabang: c.id }}
                onClick={close}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  c.id === currentId
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {shortCabang(c.nama, c.id)}
              </Link>
            ))}
            <span className="my-2 block h-px bg-border" />
            <Link
              to="/pengumuman"
              search={{ cabang: currentId }}
              onClick={close}
              className="flex min-h-11 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon icon={Megaphone01Icon} size={16} />
              Pengumuman
            </Link>
            <Link
              to="/siswa/login"
              onClick={close}
              className="flex min-h-11 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon icon={Login03Icon} size={16} />
              Portal
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
