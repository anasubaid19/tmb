import { Megaphone01Icon, Ticket01Icon } from "@hugeicons/core-free-icons";
import {
  createFileRoute,
  type ErrorComponentProps,
  redirect,
} from "@tanstack/react-router";
import { LogoutButton } from "#/components/auth-ui";
import {
  FitWidth,
  LembarValidasiDocument,
} from "#/components/lembar-validasi-document";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Icon } from "#/components/ui/icon";
import { Skeleton } from "#/components/ui/skeleton";
import { sessionFnOr } from "#/lib/auth";
import { getLembarFn, type LembarData } from "#/lib/lembar";
import { getSiswaDashboardFn } from "#/lib/siswa";
import { getSiteDataFn } from "#/lib/site";

export const Route = createFileRoute("/siswa/")({
  beforeLoad: async () => {
    const s = await sessionFnOr({ data: { role: "siswa" } });
    if (s?.role !== "siswa") throw redirect({ to: "/siswa/login" });
    return { session: s };
  },
  loader: async ({ context }) => {
    const [dash, site] = await Promise.all([
      getSiswaDashboardFn({ data: { siswaId: context.session.sub } }),
      getSiteDataFn({ data: { cabangId: context.session.cabangId ?? "" } }),
    ]);
    // ponytail: lembar selalu dimuat (bukan hanya saat selesai) agar peserta
    // bisa lihat/print berita acara kapan pun. Gagal = null, portal tetap tampil.
    let lembar: LembarData | null = null;
    try {
      lembar = await getLembarFn({ data: { siswaId: dash.id } });
    } catch {
      lembar = null;
    }
    return { dash, site, lembar };
  },
  pendingComponent: SiswaPending,
  errorComponent: SiswaError,
  component: SiswaDashboard,
});

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
          {/* ponytail: kehadiran pakai primer (konvensi: hijau khusus
              kelulusan), dibaca dari tabel kedatangan via loader. */}
          <Badge variant={dash.hadir ? "default" : "secondary"}>
            {dash.hadir ? "Hadir" : "Belum hadir"}
          </Badge>
          <LogoutButton />
        </div>
      </div>

      {dash.hasil ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon icon={Megaphone01Icon} size={20} />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-pretty">
                {dash.hasil.status === "tes_lanjutan"
                  ? "Ananda masuk daftar Tes Lanjutan"
                  : "Selamat, ananda dinyatakan LULUS!"}
              </p>
              {dash.hasil.remarks ? (
                <p className="mt-1 text-sm text-muted-foreground text-pretty">
                  {dash.hasil.remarks}
                </p>
              ) : null}
            </div>
            <Badge
              variant={
                dash.hasil.status === "tes_lanjutan" ? "warning" : "success"
              }
            >
              {dash.hasil.status === "tes_lanjutan" ? "Tes Lanjutan" : "Lulus"}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon icon={Ticket01Icon} size={18} />
            E-Ticket Ujian
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 text-center">
          {dash.qr ? (
            <img
              src={dash.qr}
              alt={`QR kehadiran ${dash.kode}`}
              className="size-48 rounded-lg border"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              QR belum tersedia — hubungi panitia.
            </p>
          )}
          <p className="font-mono text-2xl font-bold tracking-widest">
            {dash.kode}
          </p>
          <p className="text-xs text-muted-foreground">
            Tunjukkan QR ini ke panitia saat tiba. Screenshot halaman ini
            sebagai cadangan.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jadwal & Ruang Tes</CardTitle>
        </CardHeader>
        <CardContent>
          {dash.ruangTes ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Sesi</dt>
                <dd className="font-medium">
                  {dash.sesi || "-"} · {dash.pukul || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tanggal</dt>
                <dd className="font-medium">{dash.tanggal || "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ruang tes Ananda</dt>
                <dd className="font-medium">
                  {dash.ruangTes}
                  {dash.lantaiTes ? ` · ${dash.lantaiTes}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ruang orang tua</dt>
                <dd className="font-medium">
                  {dash.ruangOrtu || "-"}
                  {dash.lantaiOrtu ? ` · ${dash.lantaiOrtu}` : ""}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ruang tes belum diumumkan, cek lagi mendekati hari-H atau hubungi
              panitia.
            </p>
          )}
        </CardContent>
      </Card>

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
                {m.qr ? (
                  <img
                    src={m.qr}
                    alt={`QR penguji ${m.pengujiNama}`}
                    className="size-14 rounded border"
                  />
                ) : null}
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
