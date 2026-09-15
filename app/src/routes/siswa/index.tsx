import { Ticket01Icon } from "@hugeicons/core-free-icons";
import {
  createFileRoute,
  type ErrorComponentProps,
  redirect,
} from "@tanstack/react-router";
import { LogoutButton } from "#/components/auth-ui";
import { Countdown } from "#/components/countdown";
import {
  FitWidth,
  LembarValidasiDocument,
} from "#/components/lembar-validasi-document";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Icon } from "#/components/ui/icon";
import { Skeleton } from "#/components/ui/skeleton";
import { sessionFn } from "#/lib/auth";
import { getLembarFn, type LembarData } from "#/lib/lembar";
import { getSiswaDashboardFn } from "#/lib/siswa";
import { getSiteDataFn } from "#/lib/site";

export const Route = createFileRoute("/siswa/")({
  beforeLoad: async () => {
    const s = await sessionFn();
    if (s?.role !== "siswa") throw redirect({ to: "/siswa/login" });
    return { session: s };
  },
  loader: async ({ context }) => {
    const [dash, site] = await Promise.all([
      getSiswaDashboardFn(),
      getSiteDataFn({ data: { cabangId: context.session.cabangId ?? "" } }),
    ]);
    // ponytail: lembar dimuat di loader agar langsung tampil inline —
    // tanpa tombol, tanpa overlay cetak. Gagal = null, portal tetap tampil.
    let lembar: LembarData | null = null;
    if (dash.selesai || dash.materiSelesai.length > 0) {
      try {
        lembar = await getLembarFn({ data: { siswaId: dash.id } });
      } catch {
        lembar = null;
      }
    }
    return { dash, site, lembar };
  },
  pendingComponent: SiswaPending,
  errorComponent: SiswaError,
  component: SiswaDashboard,
});

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success"> = {
  belum: "secondary",
  terdaftar: "secondary",
  hadir: "warning",
  selesai: "success",
};

function SiswaPending() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-40 w-full" />
    </main>
  );
}

function SiswaError({ error }: ErrorComponentProps) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <Card>
        <CardContent className="pt-6">
          <p className="font-semibold">Dashboard belum dapat ditampilkan.</p>
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

function SiswaDashboard() {
  const { dash, site, lembar } = Route.useLoaderData();
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{dash.nama}</h1>
          <p className="text-sm text-muted-foreground">
            {dash.jenjang} · Kelas tujuan {dash.kelasTujuan} ·{" "}
            {dash.programJurusan}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[dash.statusUjian] ?? "secondary"}>
            {dash.statusUjian}
          </Badge>
          <LogoutButton />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon icon={Ticket01Icon} size={18} />
            E-Ticket Ujian
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <img
            src={dash.qr}
            alt={`QR kehadiran ${dash.kode}`}
            className="size-48 rounded-lg border"
          />
          <p className="font-mono text-2xl font-bold tracking-widest">
            {dash.kode}
          </p>
          <p className="text-xs text-muted-foreground">
            Tunjukkan QR ini ke panitia saat tiba. Screenshot halaman ini
            sebagai cadangan.
          </p>
        </CardContent>
      </Card>

      {site.config.countdownEnabled && site.config.countdownAt ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Countdown
              target={site.config.countdownAt}
              label="Ujian dimulai dalam"
            />
          </CardContent>
        </Card>
      ) : null}

      {dash.materiSelesai.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Materi Selesai</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tanda materi yang sudah diuji oleh penguji.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {dash.materiSelesai.map((m) => (
              <div
                key={m.label}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <img
                  src={m.qr}
                  alt={`QR penguji ${m.pengujiNama}`}
                  className="size-14 rounded border"
                />
                <div>
                  <p className="font-semibold">{m.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.pengujiKode ? `${m.pengujiKode} · ` : ""}
                    {m.pengujiNama}
                  </p>
                </div>
                <Badge variant="success" className="ml-auto">
                  Selesai
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {site.config.showJadwal && site.jadwal.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jadwal Ujian</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {site.jadwal.map((j) => (
                <li key={j.id} className="px-4 py-2.5 text-sm">
                  <p className="font-semibold">
                    {j.materi}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {j.kelas}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {j.tanggal} · {j.sesi} · Ruang {j.ruang}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {site.config.showDenah && site.denah.length > 0
        ? site.denah.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle className="text-base">{d.judul}</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={d.imageUrl}
                  alt={d.judul}
                  className="w-full rounded-lg border"
                />
                {d.keterangan ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {d.keterangan}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))
        : null}

      {lembar ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lembar Validasi Ujian</CardTitle>
            <p className="text-sm text-muted-foreground">
              Berita acara serah terima hasil ujian: checklist tes + paraf
              penguji dan validasi interview orang tua.
            </p>
          </CardHeader>
          <CardContent>
            <FitWidth>
              <LembarValidasiDocument data={lembar} />
            </FitWidth>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
