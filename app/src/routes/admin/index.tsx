import {
  Building01Icon,
  Calendar01Icon,
  Chart02Icon,
  Clock01Icon,
  DashboardSquare01Icon,
  Database01Icon,
  ListViewIcon,
  Menu01Icon,
  Settings01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import {
  createFileRoute,
  type ErrorComponentProps,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { DataTab } from "#/components/admin-data-tab";
import { LogoutButton } from "#/components/auth-ui";
import { LembarPrintOverlay } from "#/components/lembar-validasi-document";
import { OnTheSpotForm } from "#/components/on-the-spot-form";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "#/components/ui/chart";
import { Modal } from "#/components/ui/dialog";
import { Icon } from "#/components/ui/icon";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { Switch } from "#/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Tabs, TabsContent } from "#/components/ui/tabs";
import {
  type AdminDashboard,
  type AdminJadwal,
  type AdminSesi,
  type AdminSiswa,
  exportBackupFn,
  exportKehadiranFn,
  exportNilaiFn,
  exportPanitiaFn,
  exportPengujiFn,
  getAdminDashboardFn,
  getDiagFn,
  hapusNilaiFn,
  hapusSesiFn,
  importControlFn,
  importPanitiaFn,
  importPengujiFn,
  resetPanitiaFn,
  resetPengujiFn,
  resetSiswaFn,
  saveJadwalFn,
  saveSesiFn,
  setJadwalTampilFn,
  setPengumumanFn,
  setSesiTampilFn,
  setStatusFn,
} from "#/lib/admin";
import {
  type AttendanceEvent,
  getFeedFn,
  hapusKehadiranFn,
} from "#/lib/attendance";
import { sessionFnOr } from "#/lib/auth";
import { beep } from "#/lib/beep";
import { DB_TABLES } from "#/lib/db-schema";
import { downloadFile } from "#/lib/download-file";
import {
  deleteInterviewFotoFn,
  getLembarFn,
  LEMBAR_FOTO_MAX,
  type LembarData,
  saveInterviewLembarFn,
  uploadInterviewFotoFn,
} from "#/lib/lembar";
import {
  CONFIG_KEYS,
  isTrue,
  SESI_UJIAN,
  sesiLabel,
  setConfigFn,
} from "#/lib/site";
import { compressImage } from "#/lib/utils";
import { wibTime } from "#/lib/waktu";

export const Route = createFileRoute("/admin/")({
  beforeLoad: async () => {
    const s = await sessionFnOr({ data: { role: "admin" } });
    if (s?.role !== "admin") throw redirect({ to: "/admin/login" });
    return { session: s };
  },
  loader: async () => getAdminDashboardFn(),
  pendingComponent: AdminPending,
  errorComponent: AdminError,
  component: AdminPage,
});

function AdminPending() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </main>
  );
}

function AdminError({ error }: ErrorComponentProps) {
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
          <p className="font-semibold">Dashboard belum dapat ditampilkan.</p>
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

/** 5 tab utama bottom-navbar mobile + 4 tab di menu. Alasan: Monitor +
 *  Daftar = alat hari-H; Rekap/Data/Impor = cek & unduh; sisanya konfigurasi
 *  yang jarang dibuka di HP. */
const NAV_UTAMA = [
  { value: "monitor", label: "Monitor", icon: DashboardSquare01Icon },
  { value: "rekap", label: "Rekap", icon: Chart02Icon },
  { value: "daftar", label: "Daftar", icon: ListViewIcon },
  { value: "data", label: "Data", icon: Database01Icon },
  { value: "impor", label: "Impor", icon: Upload01Icon },
] as const;

const NAV_MENU = [
  { value: "jadwal", label: "Jadwal", icon: Calendar01Icon },
  { value: "sesi", label: "Sesi", icon: Clock01Icon },
  { value: "cabang", label: "Cabang", icon: Building01Icon },
  { value: "pengaturan", label: "Pengaturan", icon: Settings01Icon },
] as const;

/** Sidebar desktop = gabungan semua tab (mobile tetap bottom-nav + Menu). */
const NAV_SIDEBAR = [...NAV_UTAMA, ...NAV_MENU] as const;

function AdminPage() {
  const data = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const [tab, setTab] = useState("monitor");
  const [menu, setMenu] = useState(false);
  const [rail, setRail] = useState(false);
  return (
    <div className="mx-auto flex w-full max-w-[1500px] gap-6 px-4 py-6 pb-28 md:pb-6">
      <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] shrink-0 md:block">
        <nav
          aria-label="Navigasi admin"
          className={`flex h-full flex-col gap-1 overflow-y-auto rounded-2xl border bg-card p-2 transition-[width] ${
            rail ? "w-16" : "w-56"
          }`}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={rail ? "Bentangkan menu" : "Ciutkan menu"}
            aria-expanded={!rail}
            className="justify-start"
            onClick={() => setRail((v) => !v)}
          >
            <Icon icon={Menu01Icon} size={18} />
            {rail ? null : <span>Menu</span>}
          </Button>
          {NAV_SIDEBAR.map((t) => {
            const aktif = tab === t.value;
            return (
              <button
                key={t.value}
                type="button"
                aria-current={aktif ? "page" : undefined}
                title={t.label}
                onClick={() => setTab(t.value)}
                className={`flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm font-medium transition-colors ${
                  aktif
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                } ${rail ? "justify-center" : ""}`}
              >
                <Icon icon={t.icon} size={20} />
                {rail ? null : <span className="truncate">{t.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Dashboard Admin</h1>
            <p className="text-sm text-muted-foreground">
              {session?.nama ?? "Admin"} ({session?.sub ?? "-"})
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data.gas.connected ? (
              <Badge variant="success">
                Terhubung ke PostgreSQL
                <span className="ml-1 opacity-70">({data.gas.source})</span>
              </Badge>
            ) : (
              <Badge variant="warning">Mode mock — belum terhubung</Badge>
            )}
            <LogoutButton />
          </div>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsContent value="monitor">
            <MonitorTab data={data} />
          </TabsContent>
          <TabsContent value="rekap">
            <RekapTab data={data} />
          </TabsContent>
          <TabsContent value="jadwal">
            <JadwalTab data={data} />
          </TabsContent>
          <TabsContent value="sesi">
            <SesiTab data={data} />
          </TabsContent>
          <TabsContent value="daftar">
            <DaftarTab data={data} />
          </TabsContent>
          <TabsContent value="data">
            <DataTab data={data} />
          </TabsContent>
          <TabsContent value="cabang">
            <CabangTab data={data} />
          </TabsContent>
          <TabsContent value="impor">
            <ImporTab />
          </TabsContent>
          <TabsContent value="pengaturan">
            <PengaturanTab data={data} />
          </TabsContent>
        </Tabs>
        {/* ponytail: navbar bawah khusus mobile — 5 tab + Menu; desktop tetap
          tablist atas. Padding safe-area agar tak tertutup gesture bar. */}
        <nav
          aria-label="Navigasi admin"
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <div className="grid grid-cols-6">
            {NAV_UTAMA.map((t) => {
              const aktif = tab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-current={aktif ? "page" : undefined}
                  onClick={() => setTab(t.value)}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                    aktif ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon icon={t.icon} size={22} />
                  {t.label}
                </button>
              );
            })}
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setMenu(true)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                NAV_MENU.some((t) => t.value === tab)
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Icon icon={Menu01Icon} size={22} />
              Menu
            </button>
          </div>
        </nav>
        {menu ? (
          <Modal
            open
            onOpenChange={(o) => !o && setMenu(false)}
            title="Menu admin"
          >
            <div className="grid gap-2">
              {NAV_MENU.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  variant={tab === t.value ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => {
                    setTab(t.value);
                    setMenu(false);
                  }}
                >
                  <Icon icon={t.icon} size={18} />
                  {t.label}
                </Button>
              ))}
            </div>
          </Modal>
        ) : null}
      </main>
    </div>
  );
}

/* ---------------- Monitor ---------------- */

/** Grafik garis kedatangan per jam (WIB), 2 seri (Siswa + Penguji). */
const ARRIVAL_CONFIG = {
  siswa: { label: "Siswa", color: "var(--chart-1)" },
  penguji: { label: "Penguji", color: "var(--chart-2)" },
} satisfies ChartConfig;

function ArrivalChart({ events }: { events: AttendanceEvent[] }) {
  const data = useMemo(() => {
    const map = new Map<
      number,
      { jam: string; siswa: number; penguji: number }
    >();
    for (const e of events) {
      const h = new Date(e.ts + 7 * 3600_000).getUTCHours();
      const b = map.get(h) ?? {
        jam: String(h).padStart(2, "0"),
        siswa: 0,
        penguji: 0,
      };
      if (e.tipe === "penguji") b.penguji += 1;
      else b.siswa += 1;
      map.set(h, b);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b);
  }, [events]);
  const total = data.reduce((n, d) => n + d.siswa + d.penguji, 0);

  if (data.length === 0)
    return (
      <p className="px-4 pb-4 text-sm text-muted-foreground">
        Belum ada data kedatangan hari ini.
      </p>
    );
  return (
    <div
      role="img"
      aria-label={`Grafik kedatangan per jam: total ${total} kedatangan.`}
    >
      <ChartContainer className="h-64 px-4">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="jam"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={28}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-border)" }}
            content={(props) => (
              <ChartTooltipContent {...props} config={ARRIVAL_CONFIG} />
            )}
          />
          <Line
            dataKey="siswa"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            animationDuration={600}
          />
          <Line
            dataKey="penguji"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--chart-2)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            animationDuration={600}
          />
        </LineChart>
      </ChartContainer>
      <div className="flex justify-center gap-4 px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-(--chart-1)" />{" "}
          Siswa
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-(--chart-2)" />{" "}
          Penguji
        </span>
      </div>
    </div>
  );
}

function MonitorTab({ data }: { data: AdminDashboard }) {
  const [arrived, setArrived] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<
    { ts: number; kode: string; nama: string; tipe: string }[]
  >([]);
  const [today, setToday] = useState<AttendanceEvent[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  // ponytail: daftar belum-hadir ringkas (5 nama) + expand — kartu amber
  // 600px di HP bila penuh; alasan: pantau sekilas, detail via Rekap.
  const [expandSiswa, setExpandSiswa] = useState(false);
  const [expandPenguji, setExpandPenguji] = useState(false);
  const soundRef = useRef(false);
  const flightRef = useRef(false);
  soundRef.current = soundOn;

  // ponytail: hapus kehadiran salah-scan — khusus admin, per kode per hari
  // ini; daftar lokal ikut dibersihkan agar grafik & hitungan langsung benar.
  const hapusSatu = async (kode: string) => {
    if (!window.confirm(`Hapus catatan kehadiran hari ini untuk ${kode}?`))
      return;
    try {
      const r = await hapusKehadiranFn({ data: { kode } });
      setRecent((prev) => prev.filter((e) => e.kode !== kode));
      setToday((prev) => prev.filter((e) => e.kode !== kode));
      setArrived((prev) => {
        const next = new Set(prev);
        next.delete(kode);
        return next;
      });
      toast.success(`Kehadiran ${kode} dihapus (${r.hapus} baris).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  };

  useEffect(() => {
    let alive = true;
    let lastTs = 0;
    const tick = async () => {
      if (flightRef.current) return;
      flightRef.current = true;
      try {
        const events = await getFeedFn({ data: { since: lastTs } });
        if (!alive || events.length === 0) return;
        lastTs = Math.max(...events.map((e) => e.ts));
        setToday((prev) => [...prev, ...events]);
        setArrived((prev) => {
          const next = new Set(prev);
          for (const e of events) next.add(e.kode);
          return next;
        });
        setRecent((prev) =>
          [...events.slice().reverse(), ...prev].slice(0, 10),
        );
        if (soundRef.current) beep("success");
      } catch {
        /* poll berikutnya mencoba lagi */
      } finally {
        flightRef.current = false;
      }
    };
    void tick();
    const timer = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const siswaHadir = data.siswa.filter(
    (w) => w.hadir || arrived.has(w.kode),
  ).length;
  const pengujiHadir = data.penguji.filter(
    (p) => p.hadir || arrived.has(p.kode),
  ).length;
  const siswaBelum = data.siswa.filter((w) => !w.hadir && !arrived.has(w.kode));
  const pengujiBelum = data.penguji.filter(
    (p) => !p.hadir && !arrived.has(p.kode),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-primary">
              {siswaHadir}
              <span className="text-sm font-normal text-muted-foreground">
                /{data.siswa.length}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Siswa hadir</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-primary">
              {pengujiHadir}
              <span className="text-sm font-normal text-muted-foreground">
                /{data.penguji.length}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Penguji hadir</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kedatangan per jam (WIB)</CardTitle>
        </CardHeader>
        <CardContent className="px-2">
          <ArrivalChart events={today} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="font-semibold">Bunyi kedatangan</p>
            <p className="text-sm text-muted-foreground">
              Bunyi tiap ada scan baru (realtime).
            </p>
          </div>
          <Switch
            aria-label="Bunyi kedatangan"
            checked={soundOn}
            onCheckedChange={setSoundOn}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Baru tiba ({recent.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">
                Menunggu scan masuk…
              </p>
            ) : (
              <ul className="divide-y">
                {recent.map((e) => (
                  <li
                    key={`${e.ts}`}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {e.nama}{" "}
                      <span className="font-normal capitalize text-muted-foreground">
                        · {e.tipe}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {wibTime(e.ts)}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Hapus kehadiran ${e.nama || e.kode}`}
                        onClick={() => void hapusSatu(e.kode)}
                      >
                        Hapus
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="border-amber-300">
            <CardHeader>
              <CardTitle className="text-base">
                Siswa belum hadir ({siswaBelum.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {siswaBelum.slice(0, expandSiswa ? undefined : 5).map((w) => (
                  <li key={w.id} className="px-4 py-1.5 text-sm">
                    {w.nama}{" "}
                    <span className="text-muted-foreground">· {w.kode}</span>
                  </li>
                ))}
              </ul>
              {siswaBelum.length > 5 ? (
                <div className="px-4 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandSiswa((v) => !v)}
                  >
                    {expandSiswa
                      ? "Ringkas"
                      : `Tampilkan semua (${siswaBelum.length})`}
                  </Button>
                </div>
              ) : siswaBelum.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  Semua siswa sudah hadir.
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card className="border-amber-300">
            <CardHeader>
              <CardTitle className="text-base">
                Penguji belum hadir ({pengujiBelum.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {pengujiBelum
                  .slice(0, expandPenguji ? undefined : 5)
                  .map((p) => (
                    <li key={p.kode} className="px-4 py-1.5 text-sm">
                      {p.nama}{" "}
                      <span className="text-muted-foreground">
                        · {p.dinilai} dinilai
                        {p.materi
                          ? ` · ${data.materi.find((m) => m.id === p.materi)?.nama ?? p.materi}`
                          : ""}
                      </span>
                    </li>
                  ))}
              </ul>
              {pengujiBelum.length > 5 ? (
                <div className="px-4 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandPenguji((v) => !v)}
                  >
                    {expandPenguji
                      ? "Ringkas"
                      : `Tampilkan semua (${pengujiBelum.length})`}
                  </Button>
                </div>
              ) : pengujiBelum.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  Semua penguji sudah hadir.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
      <DiagBlock />
    </div>
  );
}

/**
 * Diagnostik Fase 1: bukti mentah browser → app → DB (build, koneksi,
 * kolom, hitungan, contoh baris). Hanya untuk investigasi — bukan fitur.
 */
function DiagBlock() {
  const [diag, setDiag] = useState<Awaited<
    ReturnType<typeof getDiagFn>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const muat = async () => {
    setBusy(true);
    setError("");
    try {
      setDiag(await getDiagFn());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Diagnostik (investigasi)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void muat()}
        >
          {busy ? "Memuat…" : diag ? "Muat ulang" : "Muat diagnostik"}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {diag ? (
          <dl className="grid gap-1 rounded-lg bg-muted p-3 tabular-nums">
            <div className="flex gap-2">
              <dt className="text-muted-foreground">fitur:</dt>
              <dd>{diag.fitur.join(" ")}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">db:</dt>
              <dd>
                {diag.db.connected ? "postgres" : "MOCK"} ({diag.db.source})
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">hitung:</dt>
              <dd>
                siswa {diag.hitung.siswa} · penguji {diag.hitung.penguji} ·
                panitia {diag.hitung.panitia}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">kolom:</dt>
              <dd>
                {Object.entries(diag.kolom)
                  .map(([k, v]) => `${k}=${v ? "ada" : "HILANG"}`)
                  .join(" ")}
              </dd>
            </div>
            {(["siswa", "penguji", "panitia"] as const).map((t) => (
              <div key={t} className="flex gap-2">
                <dt className="shrink-0 text-muted-foreground">{t}:</dt>
                <dd className="break-all">
                  {diag.contoh[t].length === 0
                    ? "(kosong)"
                    : diag.contoh[t]
                        .map((r) => {
                          const g = (k: string): string => {
                            const v = (r as Record<string, unknown>)[k];
                            return typeof v === "string" ||
                              typeof v === "number"
                              ? String(v)
                              : "";
                          };
                          return [
                            g("kode"),
                            g("nama"),
                            g("ruang") || g("ruang_tes"),
                            g("sesi"),
                          ]
                            .filter(Boolean)
                            .join("/");
                        })
                        .join(" | ")}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ---------------- Rekap ---------------- */

const STATUS_LABEL: Record<string, string> = {
  belum: "Belum",
  terdaftar: "Terdaftar",
  hadir: "Hadir",
  selesai: "Selesai",
};

function RekapTab({ data }: { data: AdminDashboard }) {
  const router = useRouter();
  const [cabangId, setCabangId] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [lembarSiswa, setLembarSiswa] = useState<AdminSiswa | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.siswa.filter((w) => {
      if (cabangId && w.cabangId !== cabangId) return false;
      if (q && !`${w.nama} ${w.kode}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data.siswa, cabangId, query]);

  const act = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(msg);
      await router.invalidate();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memproses. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={cabangId} onValueChange={(v) => setCabangId(v ?? "")}>
          <SelectTrigger className="sm:max-w-56">
            <SelectValue placeholder="Semua cabang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua cabang</SelectItem>
            {data.cabang.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Cari nama / kode…"
          aria-label="Cari nama atau kode"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>
      <Card>
        <CardContent className="px-2 py-0 sm:px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Siswa</TableHead>
                <TableHead>Hadir</TableHead>
                {data.materi.map((m) => (
                  <TableHead key={m.id} className="text-right">
                    {m.nama}
                  </TableHead>
                ))}
                <TableHead>Status</TableHead>
                <TableHead>Kelulusan</TableHead>
                <TableHead>Lembar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <p className="font-medium">{w.nama}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.kode} · {w.kelasTujuan}
                      {w.programJurusan ? ` · ${w.programJurusan}` : ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={w.hadir ? "success" : "secondary"}>
                      {w.hadir ? "Ya" : "Belum"}
                    </Badge>
                  </TableCell>
                  {data.materi.map((m) => (
                    <TableCell key={m.id} className="text-right tabular-nums">
                      {data.nilaiBySiswa[w.id]?.[m.id] ?? "-"}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        w.statusUjian === "selesai" ? "outline" : "default"
                      }
                      disabled={busy !== null}
                      onClick={() =>
                        act(
                          `st-${w.id}`,
                          () =>
                            setStatusFn({
                              data: {
                                siswaId: w.id,
                                status:
                                  w.statusUjian === "selesai"
                                    ? "belum"
                                    : "selesai",
                              },
                            }),
                          `${w.nama} → ${w.statusUjian === "selesai" ? "belum" : "selesai"}.`,
                        )
                      }
                    >
                      {busy === `st-${w.id}`
                        ? "…"
                        : (STATUS_LABEL[w.statusUjian] ?? w.statusUjian)}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={data.pengumuman[w.id] ?? ""}
                      onValueChange={(v) => {
                        if (!v) return;
                        void act(
                          `pg-${w.id}`,
                          () =>
                            setPengumumanFn({
                              data: {
                                siswaId: w.id,
                                cabangId: w.cabangId,
                                status: v,
                              },
                            }),
                          `Kelulusan ${w.nama} tersimpan.`,
                        );
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lulus">Lulus</SelectItem>
                        <SelectItem value="tidak_lulus">Tidak Lulus</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => setLembarSiswa(w)}
                      >
                        Lembar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={busy !== null}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Hapus SEMUA nilai ${w.nama} (${w.kode})? Baris siswa tetap ada, status kembali ke belum.`,
                            )
                          )
                            return;
                          void act(
                            `nv-${w.id}`,
                            () => hapusNilaiFn({ data: { siswaId: w.id } }),
                            `Nilai ${w.nama} dihapus.`,
                          );
                        }}
                      >
                        {busy === `nv-${w.id}` ? "…" : "Hapus nilai"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Tidak ada siswa yang cocok.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        {rows.length} siswa · Status “selesai” membuka lembar validasi untuk
        wali (nilai tetap internal).
      </p>
      {lembarSiswa ? (
        <LembarModal
          key={lembarSiswa.id}
          siswa={lembarSiswa}
          onClose={() => setLembarSiswa(null)}
        />
      ) : null}
    </div>
  );
}

/* ---------------- Jadwal (CMS landing) ---------------- */

function JadwalTab({ data }: { data: AdminDashboard }) {
  const router = useRouter();
  const [scope, setScope] = useState("");
  const [edit, setEdit] = useState<AdminJadwal | "baru" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(
    () => data.jadwal.filter((j) => !scope || j.cabangId === scope),
    [data.jadwal, scope],
  );

  const toggle = async (j: AdminJadwal, v: boolean) => {
    setBusy(`tw-${j.id}`);
    try {
      await setJadwalTampilFn({ data: { id: j.id, tampil: String(v) } });
      toast.success(v ? "Baris ditampilkan." : "Baris disembunyikan.");
      await router.invalidate();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal mengubah jadwal. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select value={scope} onValueChange={(v) => setScope(v ?? "")}>
          <SelectTrigger className="sm:max-w-56">
            <SelectValue placeholder="Semua cabang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua cabang</SelectItem>
            {data.cabang.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={() => setEdit("baru")}>
          Tambah jadwal
        </Button>
      </div>
      <Card>
        <CardContent className="px-2 py-0 sm:px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal · Sesi</TableHead>
                <TableHead>Materi · Kelas</TableHead>
                <TableHead>Ruang · Penguji</TableHead>
                <TableHead>Tampil</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((j) => (
                <TableRow key={j.id} className={j.tampil ? "" : "opacity-60"}>
                  <TableCell>
                    <p className="font-medium">{j.tanggal}</p>
                    <p className="text-xs text-muted-foreground">{j.sesi}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{j.materi}</p>
                    <p className="text-xs text-muted-foreground">{j.kelas}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{j.ruang || "-"}</p>
                    <p className="text-xs text-muted-foreground">{j.penguji}</p>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={j.tampil}
                      disabled={busy !== null}
                      aria-label={`Tampilkan baris ${j.materi} ${j.kelas}`}
                      onCheckedChange={(v) => void toggle(j, v)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => setEdit(j)}
                    >
                      Ubah
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Belum ada baris jadwal untuk cakupan ini.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Toggle “Tampil” langsung mengatur visibilitas baris di landing (≤ 60
        detik via cache).
      </p>
      {edit ? (
        <JadwalModal
          key={edit === "baru" ? "baru" : edit.id}
          awal={edit === "baru" ? null : edit}
          data={data}
          scopeDefault={scope}
          onClose={() => setEdit(null)}
        />
      ) : null}
    </div>
  );
}

function JadwalModal({
  awal,
  data,
  scopeDefault,
  onClose,
}: {
  awal: AdminJadwal | null;
  data: AdminDashboard;
  scopeDefault: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [cabangId, setCabangId] = useState(
    awal?.cabangId || scopeDefault || "AW3",
  );
  const [materiId, setMateriId] = useState(awal?.materiId ?? "");
  const [kelasId, setKelasId] = useState(awal?.kelasId ?? "");
  const [pengujiId, setPengujiId] = useState(awal?.pengujiId ?? "");
  // ponytail: sesi = skema tetap; baris lama berlabel custom tetap bisa dibuka.
  const SESI_OPTS = SESI_UJIAN.map(sesiLabel);
  const [sesi, setSesi] = useState(
    awal?.sesi && SESI_OPTS.includes(awal.sesi) ? awal.sesi : SESI_OPTS[0],
  );
  const sesiCustom = awal?.sesi && !SESI_OPTS.includes(awal.sesi);
  const [busy, setBusy] = useState(false);
  const kelasOpts = data.kelas.filter((k) => k.cabangId === cabangId);
  // ponytail: semua penguji menguji semua siswa — daftar penguji tak dibatasi cabang.
  const pengujiOpts = data.penguji;
  // ponytail: label trigger manual — item select (portal) tak terdaftar
  // saat popup tertutup sehingga SelectValue fallback ke id mentah.
  const labelOf = (opts: { id: string; nama: string }[], v: string) =>
    opts.find((o) => o.id === v)?.nama;
  const pickCabang = (v: string) => {
    setCabangId(v);
    setKelasId("");
    setPengujiId("");
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    setBusy(true);
    try {
      await saveJadwalFn({
        data: {
          id: awal?.id ?? "",
          cabangId,
          tanggal: get("tanggal"),
          sesi: sesi,
          materiId,
          kelasId,
          ruang: get("ruang"),
          pengujiId,
        },
      });
      toast.success("Jadwal tersimpan.");
      await router.invalidate();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={awal ? "Ubah jadwal" : "Tambah jadwal"}
      description="Baris baru langsung tampil di landing."
    >
      <form onSubmit={submit} className="grid gap-3">
        <div>
          <label htmlFor="j-cabang" className="mb-1 block text-sm font-medium">
            Cabang *
          </label>
          <Select value={cabangId} onValueChange={(v) => pickCabang(v ?? "")}>
            <SelectTrigger id="j-cabang">
              {labelOf(data.cabang, cabangId) ?? (
                <span className="text-muted-foreground">Pilih cabang</span>
              )}
            </SelectTrigger>
            <SelectContent>
              {data.cabang.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="j-tanggal"
              className="mb-1 block text-sm font-medium"
            >
              Tanggal *
            </label>
            <Input
              id="j-tanggal"
              name="tanggal"
              required
              defaultValue={awal?.tanggal}
              placeholder="Ahad, 20 Sep 2026"
            />
          </div>
          <div>
            <label htmlFor="j-sesi" className="mb-1 block text-sm font-medium">
              Sesi *
            </label>
            <Select value={sesi} onValueChange={(v) => setSesi(v ?? "")}>
              <SelectTrigger id="j-sesi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sesiCustom ? (
                  <SelectItem value={awal?.sesi ?? ""}>
                    {awal?.sesi} (lama)
                  </SelectItem>
                ) : null}
                {SESI_UJIAN.map((s) => (
                  <SelectItem key={s.sesi} value={sesiLabel(s)}>
                    {s.sesi} — {s.jenjang} ({s.waktu})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="j-materi"
              className="mb-1 block text-sm font-medium"
            >
              Materi *
            </label>
            <Select
              name="materiId"
              required
              value={materiId}
              onValueChange={(v) => setMateriId(v ?? "")}
            >
              <SelectTrigger id="j-materi">
                {labelOf(data.materi, materiId) ?? (
                  <span className="text-muted-foreground">Pilih materi</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {data.materi.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="j-kelas" className="mb-1 block text-sm font-medium">
              Kelas *
            </label>
            <Select
              name="kelasId"
              required
              value={kelasId}
              onValueChange={(v) => setKelasId(v ?? "")}
            >
              <SelectTrigger id="j-kelas">
                {labelOf(kelasOpts, kelasId) ?? (
                  <span className="text-muted-foreground">Pilih kelas</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {kelasOpts.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="j-ruang" className="mb-1 block text-sm font-medium">
              Ruang
            </label>
            <Input
              id="j-ruang"
              name="ruang"
              defaultValue={awal?.ruang}
              placeholder="A1"
            />
          </div>
          <div>
            <label
              htmlFor="j-penguji"
              className="mb-1 block text-sm font-medium"
            >
              Penguji
            </label>
            <Select
              name="pengujiId"
              value={pengujiId}
              onValueChange={(v) => setPengujiId(v ?? "")}
            >
              <SelectTrigger id="j-penguji">
                {labelOf(pengujiOpts, pengujiId) ?? (
                  <span className="text-muted-foreground">Pilih penguji</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {pengujiOpts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan"}
        </Button>
      </form>
    </Modal>
  );
}

/* ---------------- Skema sesi kanonik ---------------- */

function SesiTab({ data }: { data: AdminDashboard }) {
  const router = useRouter();
  const [scope, setScope] = useState("");
  const [edit, setEdit] = useState<AdminSesi | "baru" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // ponytail: baris global (cabang kosong) ikut tampil saat scope per-cabang.
  const rows = useMemo(
    () =>
      data.sesi.filter((s) => !scope || !s.cabangId || s.cabangId === scope),
    [data.sesi, scope],
  );
  const cabangOf = (id: string) =>
    id ? (data.cabang.find((c) => c.id === id)?.nama ?? id) : "Global";

  const toggle = async (s: AdminSesi, v: boolean) => {
    setBusy(`tw-${s.id}`);
    try {
      await setSesiTampilFn({ data: { id: s.id, tampil: String(v) } });
      toast.success(v ? "Sesi ditampilkan." : "Sesi disembunyikan.");
      await router.invalidate();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal mengubah sesi. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setBusy(null);
    }
  };

  const hapus = async (s: AdminSesi) => {
    const cakupan = s.cabangId ? cabangOf(s.cabangId) : "Global";
    if (
      !window.confirm(
        `Hapus permanen baris sesi ${s.sesi} (${s.jenjang}, ${cakupan})? Baris ini hilang dari landing dan tidak bisa dibatalkan.`,
      )
    )
      return;
    setBusy(`del-${s.id}`);
    try {
      await hapusSesiFn({ data: { id: s.id } });
      toast.success("Baris sesi dihapus.");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select value={scope} onValueChange={(v) => setScope(v ?? "")}>
          <SelectTrigger className="sm:max-w-56">
            <SelectValue placeholder="Semua cabang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua cabang</SelectItem>
            {data.cabang.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={() => setEdit("baru")}>
          Tambah sesi
        </Button>
      </div>
      <Card>
        <CardContent className="px-2 py-0 sm:px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sesi · Jenjang</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Cakupan</TableHead>
                <TableHead>Tampil</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id} className={s.tampil ? "" : "opacity-60"}>
                  <TableCell>
                    <p className="font-medium">{s.sesi}</p>
                    <p className="text-xs text-muted-foreground">{s.jenjang}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{s.waktu}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{cabangOf(s.cabangId)}</p>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={s.tampil}
                      disabled={busy !== null}
                      aria-label={`Tampilkan ${s.sesi}`}
                      onCheckedChange={(v) => void toggle(s, v)}
                    />
                  </TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => setEdit(s)}
                    >
                      Ubah
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={busy !== null}
                      onClick={() => void hapus(s)}
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Belum ada baris sesi untuk cakupan ini.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Baris Global dipakai semua cabang; baris per-cabang menimpanya. Toggle
        “Tampil” langsung mengatur visibilitas sesi di landing (≤ 60 detik via
        cache). Hapus berlaku langsung — baris global yang dihapus kembali ke
        jadwal bawaan (Sesi 1–3).
      </p>
      {edit ? (
        <SesiModal
          key={edit === "baru" ? "baru" : edit.id}
          awal={edit === "baru" ? null : edit}
          data={data}
          scopeDefault={scope}
          onClose={() => setEdit(null)}
        />
      ) : null}
    </div>
  );
}

function SesiModal({
  awal,
  data,
  scopeDefault,
  onClose,
}: {
  awal: AdminSesi | null;
  data: AdminDashboard;
  scopeDefault: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [cabangId, setCabangId] = useState(
    awal?.cabangId ?? scopeDefault ?? "",
  );
  // ponytail: sesi = skema tetap; baris lama berlabel custom tetap bisa dibuka.
  const SESI_NAMES: string[] = SESI_UJIAN.map((s) => s.sesi);
  const [sesi, setSesi] = useState(
    awal?.sesi && SESI_NAMES.includes(awal.sesi) ? awal.sesi : SESI_NAMES[0],
  );
  const sesiCustom = awal?.sesi && !SESI_NAMES.includes(awal.sesi);
  const kanonik = SESI_UJIAN.find((s) => s.sesi === sesi);
  const [jenjang, setJenjang] = useState(awal?.jenjang ?? "");
  const [waktu, setWaktu] = useState(awal?.waktu ?? "");
  const [busy, setBusy] = useState(false);
  const labelOf = (opts: { id: string; nama: string }[], v: string) =>
    opts.find((o) => o.id === v)?.nama;

  const pickSesi = (v: string) => {
    setSesi(v);
    const k = SESI_UJIAN.find((s) => s.sesi === v);
    // ponytail: ganti sesi = isi ulang default kanonik; admin edit lagi bila perlu.
    if (k && !awal) {
      setJenjang(k.jenjang);
      setWaktu(k.waktu);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveSesiFn({
        data: {
          id: awal?.id ?? "",
          cabangId,
          sesi,
          jenjang,
          waktu,
        },
      });
      toast.success("Sesi tersimpan.");
      await router.invalidate();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={awal ? "Ubah sesi" : "Tambah sesi"}
      description="Baris baru langsung tampil di landing."
    >
      <form onSubmit={submit} className="grid gap-3">
        <div>
          <label htmlFor="s-cabang" className="mb-1 block text-sm font-medium">
            Cakupan
          </label>
          <Select value={cabangId} onValueChange={(v) => setCabangId(v ?? "")}>
            <SelectTrigger id="s-cabang">
              {cabangId ? (
                labelOf(data.cabang, cabangId)
              ) : (
                <span>Global (semua cabang)</span>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Global (semua cabang)</SelectItem>
              {data.cabang.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="s-sesi" className="mb-1 block text-sm font-medium">
            Sesi *
          </label>
          <Select value={sesi} onValueChange={(v) => pickSesi(v ?? "")}>
            <SelectTrigger id="s-sesi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sesiCustom ? (
                <SelectItem value={awal?.sesi ?? ""}>
                  {awal?.sesi} (lama)
                </SelectItem>
              ) : null}
              {SESI_UJIAN.map((s) => (
                <SelectItem key={s.sesi} value={s.sesi}>
                  {s.sesi} — {s.jenjang} ({s.waktu})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="s-jenjang"
              className="mb-1 block text-sm font-medium"
            >
              Jenjang *
            </label>
            <Input
              id="s-jenjang"
              name="jenjang"
              required
              value={jenjang}
              onChange={(e) => setJenjang(e.target.value)}
              placeholder={kanonik?.jenjang ?? "SD"}
            />
          </div>
          <div>
            <label htmlFor="s-waktu" className="mb-1 block text-sm font-medium">
              Waktu *
            </label>
            <Input
              id="s-waktu"
              name="waktu"
              required
              value={waktu}
              onChange={(e) => setWaktu(e.target.value)}
              placeholder={kanonik?.waktu ?? "07.30–08.30"}
            />
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan"}
        </Button>
      </form>
    </Modal>
  );
}

/* ---------------- Lembar validasi ---------------- */

function LembarModal({
  siswa,
  onClose,
}: {
  siswa: AdminSiswa;
  onClose: () => void;
}) {
  const [lembar, setLembar] = useState<LembarData | null>(null);
  const [cetak, setCetak] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let hidup = true;
    getLembarFn({ data: { siswaId: siswa.id } })
      .then((d) => {
        if (hidup) setLembar(d);
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Gagal memuat."),
      );
    return () => {
      hidup = false;
    };
  }, [siswa.id]);

  const muatUlang = async () =>
    setLembar(await getLembarFn({ data: { siswaId: siswa.id } }));

  const aksi = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      await muatUlang();
      toast.success(msg);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memproses lembar. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const unggah = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      await aksi(
        () => uploadInterviewFotoFn({ data: { siswaId: siswa.id, dataUrl } }),
        "Foto interview tersimpan.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Foto gagal diproses.");
    }
  };

  return (
    <>
      <Modal
        open={!cetak}
        onOpenChange={(o) => !o && onClose()}
        title={`Lembar — ${siswa.nama}`}
        description={`${siswa.kode} · validasi interview orang tua oleh tim management`}
      >
        <div className="flex flex-col gap-3">
          <div className="text-sm">
            {lembar ? (
              lembar.interview ? (
                lembar.interview.sumber === "validasi" ? (
                  <p>
                    Tervalidasi oleh{" "}
                    <span className="font-semibold">
                      {lembar.interview.nama}
                    </span>{" "}
                    ({lembar.interview.kode}).
                  </p>
                ) : (
                  <p>
                    Diisi penguji{" "}
                    <span className="font-semibold">
                      {lembar.interview.nama}
                    </span>{" "}
                    ({lembar.interview.kode}). Belum divalidasi admin.
                  </p>
                )
              ) : (
                <p className="text-muted-foreground">
                  Belum divalidasi. Paraf halaman 2 masih kosong.
                </p>
              )
            ) : (
              <p className="text-muted-foreground">Memuat…</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={
                busy || !lembar || lembar.interview?.sumber === "validasi"
              }
              onClick={() =>
                void aksi(
                  () => saveInterviewLembarFn({ data: { siswaId: siswa.id } }),
                  "Interview orang tua tervalidasi.",
                )
              }
            >
              {busy ? "…" : "Tandai validasi"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!lembar}
              onClick={() => setCetak(true)}
            >
              Cetak lembar
            </Button>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium">
              Foto interview ({lembar?.fotos.length ?? 0}/{LEMBAR_FOTO_MAX})
            </span>
            {lembar && lembar.fotos.length > 0 ? (
              <div className="mb-2 flex gap-2">
                {lembar.fotos.map((f) => (
                  <div key={f.path} className="relative">
                    <img
                      src={f.dataUrl}
                      alt="Foto interview"
                      className="h-24 rounded-lg border object-cover"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      aria-label="Hapus foto"
                      className="absolute right-1 top-1 h-9 w-9 p-0"
                      disabled={busy}
                      onClick={() =>
                        void aksi(
                          () =>
                            deleteInterviewFotoFn({
                              data: { siswaId: siswa.id, fotoPath: f.path },
                            }),
                          "Foto dihapus.",
                        )
                      }
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            {/* ponytail: tanpa id stabil — key dari path server. */}
            <Input
              type="file"
              accept="image/*"
              aria-label="Unggah foto interview"
              disabled={busy || (lembar?.fotos.length ?? 0) >= LEMBAR_FOTO_MAX}
              onChange={(e) => {
                void unggah(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </Modal>
      {cetak && lembar ? (
        <LembarPrintOverlay data={lembar} onClose={() => setCetak(false)} />
      ) : null}
    </>
  );
}

/* ---------------- Daftar on-the-spot ---------------- */

function DaftarTab({ data }: { data: AdminDashboard }) {
  return <OnTheSpotForm cabang={data.cabang} />;
}

/* ---------------- Pengaturan (CMS) ---------------- */

const KEY_LABEL: Record<string, string> = {
  show_jadwal: "Tampilkan jadwal",
  show_kelas: "Tampilkan kelas",
  show_materi: "Tampilkan materi",
  show_denah: "Tampilkan denah",
  show_pengumuman: "Tampilkan pengumuman",
  countdown_enabled: "Aktifkan hitung mundur",
  countdown_at: "Waktu hitung mundur",
  umumkan_hasil: "Buka pengumuman hasil (PUBLIK)",
  math_gform_url: "URL Google Form Math (SMP/SMA)",
};

/** Keterangan tambahan untuk setting yang perilakunya perlu dijelaskan. */
const KEY_HINT: Record<string, string> = {
  show_kelas:
    "Data kelas berasal dari impor F_DATA CONTROL — belum ada editor kelas di CMS.",
  show_denah: "Denah memakai berkas SVG resmi (5 lantai), bukan per cabang.",
  math_gform_url:
    "Berlaku untuk cabang yang dipilih di Cakupan; Global dipakai sebagai cadangan.",
};

function ImporTab() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof importControlFn>
  > | null>(null);
  const [table, setTable] = useState("siswa");
  const [personil, setPersonil] = useState<{
    kind: string;
    inserted: number;
    updated: number;
    skipped: number;
    issues: { sheet: string; row: number | null; message: string }[];
  } | null>(null);

  const readFileUrl = (file: File): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Gagal membaca file."));
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.readAsDataURL(file);
    });

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError("");
    setSummary(null);
    if (file.size > 8 * 1024 * 1024) {
      setError("Ukuran file maksimal 8 MB.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readFileUrl(file);
      const result = await importControlFn({ data: { dataUrl } });
      setSummary(result);
      toast.success(
        `Impor selesai: ${result.inserted} baru, ${result.updated} diupdate.`,
      );
      await router.invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impor gagal.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onFilePersonil = async (
    file: File | null,
    kind: "penguji" | "panitia",
  ) => {
    if (!file) return;
    setError("");
    setPersonil(null);
    if (file.size > 8 * 1024 * 1024) {
      setError("Ukuran file maksimal 8 MB.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readFileUrl(file);
      const result =
        kind === "penguji"
          ? await importPengujiFn({ data: { dataUrl } })
          : await importPanitiaFn({ data: { dataUrl } });
      setPersonil({
        kind,
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped,
        issues: result.issues,
      });
      toast.success(
        `Impor ${kind} selesai: ${result.inserted} baru, ${result.updated} diupdate.`,
      );
      await router.invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impor gagal.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onExport = async (format: "csv" | "xlsx") => {
    setError("");
    setBusy(true);
    try {
      const result = await exportBackupFn({ data: { format, table } });
      downloadFile(result.filename, result.mime, result.content);
      toast.success(`Backup ${format.toUpperCase()} terunduh.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ekspor gagal.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onExportPersonil = async (kind: "penguji" | "panitia") => {
    setError("");
    setBusy(true);
    try {
      const result =
        kind === "penguji" ? await exportPengujiFn() : await exportPanitiaFn();
      downloadFile(result.filename, result.mime, result.content);
      toast.success(`Daftar ${kind} terunduh.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ekspor gagal.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onExportData = async (kind: "kedatangan" | "nilai") => {
    setError("");
    setBusy(true);
    try {
      const result =
        kind === "kedatangan"
          ? await exportKehadiranFn()
          : await exportNilaiFn();
      downloadFile(result.filename, result.mime, result.content);
      toast.success(
        kind === "kedatangan"
          ? "Data kedatangan terunduh."
          : "Data penilaian terunduh.",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ekspor gagal.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onResetSiswa = async () => {
    // ponytail: destruktif — konfirmasi ganda di klien; server tetap
    // mensyaratkan admin. Backup dulu via tombol di atas sebelum ini.
    if (
      !window.confirm(
        "HAPUS SELURUH data siswa + pengumuman + lembar + kedatangan? Tidak bisa dibatalkan. Pastikan backup sudah diunduh.",
      )
    )
      return;
    setError("");
    setBusy(true);
    try {
      const r = await resetSiswaFn();
      toast.success(
        `Dihapus: ${r.siswa} siswa, ${r.pengumuman} pengumuman, ${r.lembar} lembar, ${r.kedatangan} kedatangan.`,
      );
      await router.invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reset gagal.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onResetPenguji = async () => {
    if (
      !window.confirm(
        "HAPUS SELURUH data penguji + akun loginnya, dan kosongkan penugasan penguji di jadwal? Tidak bisa dibatalkan. Pastikan backup sudah diunduh.",
      )
    )
      return;
    setError("");
    setBusy(true);
    try {
      const r = await resetPengujiFn();
      toast.success(
        `Dihapus: ${r.penguji} penguji, ${r.users} akun, ${r.jadwal} penugasan jadwal dikosongkan.`,
      );
      await router.invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reset gagal.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onResetPanitia = async () => {
    if (
      !window.confirm(
        "HAPUS SELURUH akun panitia (usher/time keeper)? Tidak bisa dibatalkan. Pastikan backup sudah diunduh.",
      )
    )
      return;
    setError("");
    setBusy(true);
    try {
      const r = await resetPanitiaFn();
      toast.success(`Dihapus: ${r.panitia} akun panitia.`);
      await router.invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reset gagal.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Impor & Ekspor Data</CardTitle>{" "}
        <p className="text-sm text-muted-foreground">
          Upload file .xlsx. Baris yang cocok di-update di tempat, baris baru
          ditambah, status/nilai lama dan baris lain tidak dihapus.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="mb-1 text-sm font-medium">Data siswa</p>
          <Input
            type="file"
            aria-label="Unggah file .xlsx data siswa"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium">Data penguji</p>
            <Input
              type="file"
              aria-label="Unggah file .xlsx data penguji"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy}
              onChange={(e) =>
                void onFilePersonil(e.target.files?.[0] ?? null, "penguji")
              }
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Data panitia</p>
            <Input
              type="file"
              aria-label="Unggah file .xlsx data panitia"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy}
              onChange={(e) =>
                void onFilePersonil(e.target.files?.[0] ?? null, "panitia")
              }
            />
          </div>
        </div>
        {personil ? (
          <div className="space-y-2 text-sm">
            <p className="tabular-nums">
              Impor {personil.kind}: {personil.inserted} baru,{" "}
              {personil.updated} diupdate, {personil.skipped} dilewati.
            </p>
            {personil.issues.length > 0 ? (
              <ul className="max-h-48 space-y-1 overflow-auto rounded-lg border p-3 text-xs text-muted-foreground">
                {personil.issues.map((issue) => (
                  <li
                    key={`${issue.sheet}-${issue.row ?? "x"}-${issue.message}`}
                  >
                    {issue.sheet}
                    {issue.row ? ` baris ${issue.row}` : ""}: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {busy ? (
          <p className="text-sm text-muted-foreground">Memproses…</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-sm font-medium">Backup:</span>
          <Select value={table} onValueChange={(v) => setTable(v ?? "siswa")}>
            <SelectTrigger className="max-w-44">
              <SelectValue placeholder="Pilih tabel" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(DB_TABLES).map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void onExport("csv")}
          >
            Unduh CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void onExport("xlsx")}
          >
            Unduh XLSX semua tabel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void onExportPersonil("penguji")}
          >
            Unduh Penguji
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void onExportPersonil("panitia")}
          >
            Unduh Panitia
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void onExportData("kedatangan")}
          >
            Unduh Kedatangan
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void onExportData("nilai")}
          >
            Unduh Penilaian
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-sm font-medium text-destructive">
            Zona berbahaya:
          </span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={() => void onResetSiswa()}
          >
            Hapus semua data siswa
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={() => void onResetPenguji()}
          >
            Hapus semua data penguji
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={() => void onResetPanitia()}
          >
            Hapus semua data panitia
          </Button>
          <span className="text-xs text-muted-foreground">
            Wajib backup dulu. Dipakai sebelum impor ulang DATA
            (siswa/penguji/panitia).
          </span>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {summary ? (
          <div className="space-y-2 text-sm">
            <p className="tabular-nums">
              Cabang baru: {summary.cabangAdded} · Siswa baru:{" "}
              {summary.inserted} · Diupdate: {summary.updated} · Tidak berubah:{" "}
              {summary.unchanged} · Dilewati: {summary.skipped}
            </p>
            {summary.issues.length > 0 ? (
              <ul className="max-h-48 space-y-1 overflow-auto rounded-lg border p-3 text-xs text-muted-foreground">
                {summary.issues.map((issue) => (
                  <li
                    key={`${issue.sheet}-${issue.row ?? "x"}-${issue.message}`}
                  >
                    {issue.sheet}
                    {issue.row ? ` baris ${issue.row}` : ""}: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Kartu sumber data — PostgreSQL bila URL DB ada, mock bila belum. */
function DatabaseCard({
  db,
}: {
  db: {
    connected: boolean;
    source: "env" | "file" | "postgres" | "none";
  };
}) {
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">Sumber Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Status:</span>
          {db.connected ? (
            <Badge variant="success">Produksi (PostgreSQL aktif)</Badge>
          ) : (
            <Badge variant="warning">Mock (data contoh)</Badge>
          )}
          {db.source !== "none" ? (
            <span className="text-xs text-muted-foreground">
              sumber: {db.source === "postgres" ? "DATABASE_URL" : db.source}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Kredensial database dipegang lewat environment server
          (DATABASE_URL/POSTGRES_URL), bukan lewat UI. Isi URL tersebut lalu
          jalankan migrasi agar app beralih dari mode mock ke produksi.
        </p>
      </CardContent>
    </Card>
  );
}

function PengaturanTab({ data }: { data: AdminDashboard }) {
  const router = useRouter();
  const [scope, setScope] = useState("");

  const valueFor = (key: string) =>
    data.config.find((c) => c.key === key && c.cabangId === scope)?.value ?? "";

  const save = async (key: string, value: string) => {
    try {
      await setConfigFn({ data: { key, value, cabangId: scope } });
      toast.success(`${KEY_LABEL[key] ?? key} tersimpan.`);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    }
  };

  return (
    <div className="space-y-3">
      <DatabaseCard db={data.gas} />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Cakupan:</span>
        <Select value={scope} onValueChange={(v) => setScope(v ?? "")}>
          <SelectTrigger className="max-w-56">
            <SelectValue placeholder="Global (semua cabang)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Global (semua cabang)</SelectItem>
            {data.cabang.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {/* ponytail: uji_cabang punya tab Cabang sendiri, bukan di sini. */}
          {CONFIG_KEYS.filter((key) => key !== "uji_cabang").map((key) => {
            const cur = valueFor(key);
            const isBool = key !== "countdown_at" && key !== "math_gform_url";
            return (
              <div
                key={key}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${
                  key === "umumkan_hasil" ? "bg-destructive/10" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">
                    {KEY_LABEL[key] ?? key}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {key}
                    {cur ? ` · saat ini: ${cur}` : " · default"}
                  </p>
                  {KEY_HINT[key] ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {KEY_HINT[key]}
                    </p>
                  ) : null}
                </div>
                {isBool ? (
                  <Switch
                    aria-label={KEY_LABEL[key] ?? key}
                    checked={cur === "true" || cur === "1"}
                    onCheckedChange={(v) => void save(key, String(v))}
                  />
                ) : (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = new FormData(e.currentTarget).get("v");
                      void save(key, String(v ?? ""));
                    }}
                  >
                    <Input
                      name="v"
                      aria-label={KEY_LABEL[key] ?? key}
                      defaultValue={cur}
                      placeholder={
                        key === "math_gform_url"
                          ? "https://docs.google.com/forms/…"
                          : "2026-09-19T07:00:00+07:00"
                      }
                      className="w-56"
                    />
                    <Button type="submit" size="sm">
                      Simpan
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Perubahan berlaku ≤ 60 detik (cache). Override cabang mengalahkan
        global.
      </p>
    </div>
  );
}

/** Tab Cabang — toggle on/off per cabang: yang mati, siswanya keluar dari
 * roster penguji dan cabangnya hilang dari landing. */
function CabangTab({ data }: { data: AdminDashboard }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");

  const save = async (cabangId: string, value: boolean) => {
    setBusyId(cabangId);
    try {
      await setConfigFn({
        data: { key: "uji_cabang", value: String(value), cabangId },
      });
      toast.success("Status cabang tersimpan.");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cabang Diuji</CardTitle>
        <p className="text-sm text-muted-foreground">
          Nyalakan cabang yang ikut diuji. Cabang yang mati: siswanya tidak
          masuk roster penguji dan tidak tampil di landing.
        </p>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {data.cabang.map((c) => {
          const cur = data.config.find(
            (x) => x.key === "uji_cabang" && x.cabangId === c.id,
          )?.value;
          return (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <p className="text-sm font-semibold">{c.nama}</p>
              <Switch
                aria-label={`Ikutkan ${c.nama} dalam ujian`}
                checked={cur ? isTrue(cur) : true}
                disabled={busyId === c.id}
                onCheckedChange={(v) => void save(c.id, v)}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
