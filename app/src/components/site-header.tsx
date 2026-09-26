import { Menu } from "@base-ui/react/menu";
import { Login03Icon } from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { Icon } from "#/components/ui/icon";

/** Tujuan login staf. Panitia memakai halaman scanner (kode panitia). */
const PORTALS = [
  { to: "/penguji/login", label: "Portal Penguji", hint: "Kode penguji" },
  { to: "/scanner/login", label: "Portal Panitia", hint: "Kode panitia" },
  { to: "/admin/login", label: "Portal Admin", hint: "Kode + password" },
] as const;

export function SiteHeader({ currentId }: { currentId: string }) {
  return (
    <header className="border-b bg-background">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium"
      >
        Lewati ke konten
      </a>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Link
          to="/"
          search={{ cabang: currentId, jenjang: "" }}
          className="flex shrink-0 items-center gap-2"
        >
          <img
            src="/logo-alwildan.svg"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0"
          />
          <span className="leading-tight">
            <span className="block text-sm font-bold">Tes Masuk Bersama</span>
            <span className="block text-xs text-muted-foreground">
              AL-WILDAN ISLAMIC SCHOOL
            </span>
          </span>
        </Link>
        {/* ponytail: satu-satunya dropdown di app; pakai primitif Base UI
            langsung daripada bikin ui/dropdown-menu.tsx yang belum dibutuhkan. */}
        <Menu.Root>
          <Menu.Trigger className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium transition-[color,background-color,scale] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] data-[popup-open]:bg-accent">
            <Icon icon={Login03Icon} size={16} />
            Portal
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner
              align="end"
              sideOffset={6}
              className="isolate z-50"
            >
              <Menu.Popup className="min-w-52 rounded-xl border bg-popover p-1 text-popover-foreground shadow-md outline-none">
                {PORTALS.map((p) => (
                  <Menu.LinkItem
                    key={p.to}
                    render={<Link to={p.to} />}
                    className="flex cursor-default flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-sm font-medium outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    {p.label}
                    <span className="text-xs font-normal text-muted-foreground">
                      {p.hint}
                    </span>
                  </Menu.LinkItem>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </header>
  );
}
