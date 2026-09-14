import { Login03Icon } from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { Icon } from "#/components/ui/icon";

/** Label tab pendek kapital, mis. AW1 → "AL-WILDAN 1". */
export function shortCabang(nama: string, id: string) {
  const n = id.replace(/\D/g, "");
  return n ? `AL-WILDAN ${n}` : nama.toUpperCase();
}

/** Nama cabang lengkap kapital, mis. "Al-Wildan 1 Gading Serpong" → "AL-WILDAN ISLAMIC SCHOOL 1 GADING SERPONG". */
export function fullCabang(nama: string) {
  return nama.replace(/^al-wildan/i, "AL-WILDAN ISLAMIC SCHOOL").toUpperCase();
}

export function SiteHeader({ currentId }: { currentId: string }) {
  return (
    <header className="border-b bg-white">
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
        <Link
          to="/siswa/login"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium transition-[color,background-color,scale] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
        >
          <Icon icon={Login03Icon} size={16} />
          Portal
        </Link>
      </div>
    </header>
  );
}
