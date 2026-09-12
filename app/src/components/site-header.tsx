import { Login03Icon, Megaphone01Icon } from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
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
  return (
    <header className="border-b bg-white">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium"
      >
        Lewati ke konten
      </a>
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          to="/"
          search={{ cabang: currentId }}
          className="flex items-center gap-2"
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
        <nav className="flex flex-wrap items-center gap-1">
          {cabang.map((c) => (
            <Link
              key={c.id}
              to="/"
              search={{ cabang: c.id }}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-[color,background-color,scale] outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]",
                c.id === currentId
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {shortCabang(c.nama, c.id)}
            </Link>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <Link
            to="/pengumuman"
            search={{ cabang: currentId }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium transition-[color,background-color,scale] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
          >
            <Icon icon={Megaphone01Icon} size={16} />
            Pengumuman
          </Link>
          <Link
            to="/siswa/login"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium transition-[color,background-color,scale] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
          >
            <Icon icon={Login03Icon} size={16} />
            Portal
          </Link>
        </nav>
      </div>
    </header>
  );
}
