import { Megaphone01Icon } from "@hugeicons/core-free-icons";
import {
  createFileRoute,
  type ErrorComponentProps,
  Link,
} from "@tanstack/react-router";
import { SiteHeader } from "#/components/site-header";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent } from "#/components/ui/card";
import { Icon } from "#/components/ui/icon";
import { getPengumumanFn, getSiteDataFn } from "#/lib/site";

export const Route = createFileRoute("/pengumuman")({
  validateSearch: (search: Record<string, unknown>) => ({
    cabang: typeof search.cabang === "string" ? search.cabang : "",
  }),
  loaderDeps: ({ search }) => ({ cabang: search.cabang }),
  loader: async ({ deps }) => {
    const [site, umum] = await Promise.all([
      getSiteDataFn({ data: { cabangId: deps.cabang } }),
      getPengumumanFn({ data: { cabangId: deps.cabang } }),
    ]);
    return { site, umum };
  },
  errorComponent: PengumumanError,
  component: Pengumuman,
});

function PengumumanError({ error }: ErrorComponentProps) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <Card>
        <CardContent className="pt-6">
          <p className="font-semibold">Pengumuman belum dapat ditampilkan.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Silakan coba lagi atau hubungi panitia."}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function Pengumuman() {
  const { site, umum } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader
        cabang={site.cabang.filter((c) => c.landing)}
        currentId={site.current.id}
      />
      <main id="konten" className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="flex items-center gap-2 text-balance text-2xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon icon={Megaphone01Icon} size={20} />
          </span>
          Pengumuman Hasil
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {site.current.nama}
        </p>

        {!umum.open ? (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Hasil ujian belum diumumkan. Silakan kembali lagi nanti.
              </p>
            </CardContent>
          </Card>
        ) : umum.items.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Belum ada data kelulusan untuk cabang ini.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-6">
            <CardContent className="p-0">
              <ul className="divide-y">
                {umum.items.map((item) => {
                  const lulus = item.status.trim().toLowerCase() === "lulus";
                  return (
                    <li
                      key={`${item.cabang}-${item.nama}`}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{item.nama}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.cabang}
                        </p>
                      </div>
                      <Badge variant={lulus ? "success" : "destructive"}>
                        {lulus ? "Lulus" : "Tidak Lulus"}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-sm">
          <Link
            to="/"
            search={{ cabang: site.current.id }}
            className="text-primary hover:underline"
          >
            ← Kembali ke beranda
          </Link>
        </p>
      </main>
    </div>
  );
}
