import { Ticket01Icon } from "@hugeicons/core-free-icons";
import {
  createFileRoute,
  type ErrorComponentProps,
  Link,
  useRouter,
} from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Countdown } from "#/components/countdown";
import {
  DenahSection,
  JadwalSection,
  KelasSection,
  MateriSection,
  PengumumanSection,
} from "#/components/landing-sections";
import { SiteHeader } from "#/components/site-header";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { Icon } from "#/components/ui/icon";
import { getPengumumanFn, getSiteDataFn } from "#/lib/site";

export const Route = createFileRoute("/")({
  // ponytail: samakan TTL cache server 60 dtk — klik kembali <60 dtk instan,
  // tanpa loader roundtrip.
  staleTime: 60_000,
  pendingComponent: LandingPending,
  validateSearch: (search: Record<string, unknown>) => ({
    cabang: typeof search.cabang === "string" ? search.cabang : "",
  }),
  loaderDeps: ({ search }) => ({ cabang: search.cabang }),
  loader: async ({ deps }) => {
    const [data, umum] = await Promise.all([
      getSiteDataFn({ data: { cabangId: deps.cabang } }),
      getPengumumanFn({ data: { cabangId: deps.cabang } }),
    ]);
    return { data, umum };
  },
  errorComponent: LandingError,
  component: Landing,
});

function LandingError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    setBusy(true);
    try {
      await router.invalidate();
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6">
          <p className="font-semibold">Informasi belum dapat ditampilkan.</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Silakan coba lagi atau hubungi panitia."}
          </p>
          <Button type="button" onClick={retry} disabled={busy}>
            {busy ? "Memuat ulang…" : "Coba lagi"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

function LandingPending() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">Memuat informasi…</p>
    </main>
  );
}

function Landing() {
  const { data, umum } = Route.useLoaderData();
  const { cabang: cabangSearch } = Route.useSearch();
  const cfg = data.config;
  const showCountdown = cfg.countdownEnabled && cfg.countdownAt;
  // ?cabang= kosong = landing umum: jenjang dirangkum dari semua cabang.
  const general = !cabangSearch;
  const jenjangUmum = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const c of data.cabang) {
      for (const m of c.program.match(/\b(SD|SMP|SMA|TK|PG)\b/g) ?? []) {
        const up = m.toUpperCase();
        if (!seen.has(up)) {
          seen.add(up);
          order.push(up);
        }
      }
    }
    return order.length ? order.join(" · ") : "";
  }, [data.cabang]);
  const programText = general ? jenjangUmum : data.current.program;
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader currentId={data.current.id} />

      <main id="konten" className="mx-auto w-full max-w-5xl px-4 pb-16">
        <section className="py-10 text-center sm:py-14">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            AL-WILDAN ISLAMIC SCHOOL
          </p>
          <h1 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Tes Masuk Bersama
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
            Informasi jadwal, kelas, materi ujian, denah lokasi, dan penguji
            untuk seluruh cabang.
          </p>
          {programText ? (
            <p className="mx-auto mt-2 max-w-xl text-sm font-medium">
              {general ? `Jenjang: ${programText}` : programText}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/siswa/login"
              className="flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[color,background-color,scale] outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
            >
              <Icon icon={Ticket01Icon} size={18} />
              Portal Siswa
            </Link>
          </div>
          {showCountdown ? (
            <div className="mt-8 flex justify-center">
              <Countdown target={cfg.countdownAt} label="Hitung mundur" />
            </div>
          ) : null}
        </section>

        <div className="flex flex-col gap-10">
          {cfg.showPengumuman ? <PengumumanSection umum={umum} /> : null}
          {cfg.showJadwal ? (
            <JadwalSection data={data} compact={general} />
          ) : null}
          {cfg.showKelas ? <KelasSection data={data} /> : null}
          {cfg.showMateri ? <MateriSection data={data} /> : null}
          {cfg.showDenah ? <DenahSection data={data} /> : null}
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-muted-foreground">
          <span>Tes Masuk Bersama — AL-WILDAN ISLAMIC SCHOOL</span>
          <nav className="flex gap-4">
            <Link
              to="/penguji/login"
              className="transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Penguji
            </Link>
            <Link
              to="/scanner/login"
              className="transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Panitia
            </Link>
            <Link
              to="/admin/login"
              className="transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Admin
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
