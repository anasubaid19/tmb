import { Ticket01Icon } from "@hugeicons/core-free-icons";
import {
  createFileRoute,
  type ErrorComponentProps,
  Link,
} from "@tanstack/react-router";
import { Countdown } from "#/components/countdown";
import {
  DenahSection,
  JadwalSection,
  KelasSection,
  MateriSection,
  PengujiSection,
  PengumumanTeaser,
} from "#/components/landing-sections";
import { fullCabang, SiteHeader } from "#/components/site-header";
import { Card, CardContent } from "#/components/ui/card";
import { Icon } from "#/components/ui/icon";
import { getSiteDataFn } from "#/lib/site";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    cabang: typeof search.cabang === "string" ? search.cabang : "",
  }),
  loaderDeps: ({ search }) => ({ cabang: search.cabang }),
  loader: ({ deps }) => getSiteDataFn({ data: { cabangId: deps.cabang } }),
  errorComponent: LandingError,
  component: Landing,
});

function LandingError({ error }: ErrorComponentProps) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <Card>
        <CardContent className="pt-6">
          <p className="font-semibold">Informasi belum dapat ditampilkan.</p>
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

function Landing() {
  const data = Route.useLoaderData();
  const cfg = data.config;
  const showCountdown = cfg.countdownEnabled && cfg.countdownAt;
  // Landing hanya menampilkan 3 sekolah utama (AW1/AW3/AW4).
  const cabangUtama = data.cabang.filter((c) => c.landing);
  // Ujian semua cabang terpusat di cabang portal (AW3).
  const pusat = data.cabang.find((c) => c.portal)?.nama ?? data.current.nama;
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader cabang={cabangUtama} currentId={data.current.id} />

      <main id="konten" className="mx-auto w-full max-w-5xl px-4 pb-16">
        <section className="py-10 text-center sm:py-14">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            {fullCabang(data.current.nama)}
          </p>
          <h1 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Tes Masuk Bersama
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Informasi jadwal, kelas, materi ujian, denah lokasi, dan penguji,
            terpusat di {fullCabang(pusat)}.
          </p>
          {data.current.program ? (
            <p className="mx-auto mt-2 max-w-xl text-sm font-medium">
              {data.current.program}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/siswa/login"
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Icon icon={Ticket01Icon} size={18} />
              Portal Siswa
            </Link>
            <Link
              to="/pengumuman"
              search={{ cabang: data.current.id }}
              className="rounded-md border border-input px-5 py-2.5 text-sm font-semibold hover:bg-accent"
            >
              Pengumuman Hasil
            </Link>
          </div>
          {showCountdown ? (
            <div className="mt-8 flex justify-center">
              <Countdown target={cfg.countdownAt} label="Hitung mundur" />
            </div>
          ) : null}
        </section>

        <div className="flex flex-col gap-10">
          {cfg.showJadwal ? <JadwalSection data={data} /> : null}
          {cfg.showKelas ? <KelasSection data={data} /> : null}
          {cfg.showMateri ? <MateriSection data={data} /> : null}
          {cfg.showDenah ? <DenahSection data={data} /> : null}
          {cfg.showPenguji ? <PengujiSection data={data} /> : null}
          {cfg.showPengumuman ? (
            <PengumumanTeaser
              open={cfg.umumkanHasil}
              cabangId={data.current.id}
            />
          ) : null}
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-muted-foreground">
          <span>Tes Masuk Bersama — AL-WILDAN ISLAMIC SCHOOL</span>
          <nav className="flex gap-4">
            <Link to="/penguji/login" className="hover:text-foreground">
              Penguji
            </Link>
            <Link to="/scanner/login" className="hover:text-foreground">
              Panitia
            </Link>
            <Link to="/admin/login" className="hover:text-foreground">
              Admin
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
