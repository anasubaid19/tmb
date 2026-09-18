import { Menu } from "@base-ui/react/menu";
import {
  Chart02Icon,
  Logout01Icon,
  MoreVerticalIcon,
  ScanIcon,
  UserAdd01Icon,
  VolumeHighIcon,
} from "@hugeicons/core-free-icons";
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { Html5Qrcode } from "html5-qrcode";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { OnTheSpotForm } from "#/components/on-the-spot-form";
import { ResultDialog } from "#/components/scanner/result-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Icon } from "#/components/ui/icon";
import { Input } from "#/components/ui/input";
import { Progress } from "#/components/ui/progress";
import { Switch } from "#/components/ui/switch";
import { getRegisterContextFn } from "#/lib/admin";
import {
  type AttendanceEvent,
  getFeedFn,
  getStatsFn,
  recordAttendanceFn,
} from "#/lib/attendance";
import { sessionFnOr } from "#/lib/auth";
import { logoutApi } from "#/lib/auth-client";
import { beep, setMuted as setAudioMuted, unlockAudio } from "#/lib/beep";
import { cn } from "#/lib/utils";
import { wibTime } from "#/lib/waktu";

export const Route = createFileRoute("/scanner/")({
  beforeLoad: async () => {
    const s = await sessionFnOr({ data: { role: "panitia" } });
    if (s?.role !== "panitia" && s?.role !== "admin")
      throw redirect({ to: "/scanner/login" });
    return { session: s };
  },
  loader: async () => getRegisterContextFn(),
  component: ScannerPage,
});

interface ScanOutcome {
  kode?: string;
  nama?: string;
  tipe?: string;
  duplicate?: boolean;
  error?: string;
}

interface Stats {
  siswaHadir: number;
  pengujiHadir: number;
  siswaTotal: number;
  pengujiTotal: number;
  grafik: { jam: string; siswa: number; penguji: number }[];
}

type View = "scanner" | "daftar" | "monitoring";
type CamState = "off" | "starting" | "on" | "denied";

/** ponytail: 3 area workstation — pola bottom-nav reuse admin/index.tsx. */
const NAV: { value: View; label: string; icon: typeof ScanIcon }[] = [
  { value: "scanner", label: "Scanner", icon: ScanIcon },
  { value: "daftar", label: "Daftar", icon: UserAdd01Icon },
  { value: "monitoring", label: "Monitoring", icon: Chart02Icon },
];

/** Bar chart CSS murni gaya shadcn (tanpa dependensi chart). */
function GrafikKedatangan({ grafik }: { grafik: Stats["grafik"] }) {
  const max = Math.max(...grafik.map((g) => g.siswa + g.penguji), 0);
  const total = grafik.reduce((n, g) => n + g.siswa + g.penguji, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Grafik kedatangan per jam</CardTitle>
      </CardHeader>
      <CardContent>
        {max === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada kedatangan hari ini. Data akan muncul setelah peserta
            mulai check-in.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Siswa
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary/30" />
                Penguji
              </span>
              <span className="ml-auto tabular-nums">{total} tercatat</span>
            </div>
            <div
              className="flex h-36 items-stretch gap-1"
              role="img"
              aria-label={`Kedatangan per jam WIB, total ${total} hari ini`}
            >
              {grafik.map((g) => {
                const sub = g.siswa + g.penguji;
                return (
                  <div
                    key={g.jam}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1"
                  >
                    <div className="flex w-full flex-1 items-end">
                      {sub > 0 ? (
                        <div
                          className="flex w-full flex-col overflow-hidden rounded-sm"
                          style={{
                            height: `${Math.max((sub / max) * 100, 5)}%`,
                          }}
                        >
                          {g.penguji > 0 ? (
                            <div
                              className="w-full bg-primary/30"
                              style={{ height: `${(g.penguji / sub) * 100}%` }}
                            />
                          ) : null}
                          {g.siswa > 0 ? (
                            <div className="w-full flex-1 bg-primary" />
                          ) : null}
                        </div>
                      ) : (
                        <div className="h-px w-full bg-border" />
                      )}
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {g.jam.slice(0, 2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ScannerPage() {
  const { session } = Route.useRouteContext();
  const { cabang, kelas, program, tugas, ruang, sesi } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [view, setView] = useState<View>("scanner");
  const [camState, setCamState] = useState<CamState>("off");
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [recent, setRecent] = useState<AttendanceEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);

  // Init false supaya markup server & client identik; preferensi dibaca setelah
  // mount (localStorage tidak ada di SSR).
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("tmb_mute") === "true") setMuted(true);
  }, []);
  useEffect(() => {
    setAudioMuted(muted);
  }, [muted]);
  const toggleMute = useCallback(() => {
    setMuted((v) => {
      const next = !v;
      try {
        localStorage.setItem("tmb_mute", String(next));
      } catch {
        /* localStorage penuh/diblokir — abaikan */
      }
      return next;
    });
  }, []);

  // ponytail: alur keluar sama dgn LogoutButton (konfirmasi + invalidate);
  // ditulis di sini agar tampil sebagai baris menu ⋮, bukan tombol.
  const keluar = useCallback(async () => {
    if (!window.confirm("Yakin keluar dari akun?")) return;
    try {
      await logoutApi();
      await router.invalidate();
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal keluar.");
    }
  }, [navigate, router]);

  const submitKode = useCallback(async (kode: string) => {
    if (busyRef.current || !kode.trim()) return;
    busyRef.current = true;
    try {
      const r = await recordAttendanceFn({ data: { kode } });
      beep(r.duplicate ? "error" : "success");
      setOutcome({
        kode: kode.trim().toUpperCase(),
        nama: r.nama,
        tipe: r.tipe,
        duplicate: r.duplicate,
      });
    } catch (err) {
      beep("error");
      setOutcome({ error: err instanceof Error ? err.message : "Scan gagal." });
    } finally {
      setTimeout(() => {
        busyRef.current = false;
      }, 1500);
    }
  }, []);

  const startCamera = useCallback(async () => {
    // Gesture pengguna — satu-satunya kesempatan membuka kunci audio di iOS.
    unlockAudio();
    // ponytail: guard sinkron — ketuk ganda sebelum state update.
    if (scannerRef.current) return;
    setCamState("starting");
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          void submitKode(text);
        },
        () => {},
      );
      setCamState("on");
    } catch {
      beep("error");
      scannerRef.current = null;
      setCamState("denied");
    }
  }, [submitKode]);

  const stopCamera = useCallback(async () => {
    try {
      await scannerRef.current?.stop();
    } catch {
      /* abaikan */
    }
    scannerRef.current = null;
    setCamState("off");
  }, []);

  useEffect(
    () => () => {
      void scannerRef.current?.stop().catch(() => {});
    },
    [],
  );

  // ponytail: kamera mati saat pindah tab — #qr-reader ikut unmount dan
  // scan latar bikin beep misterius.
  const pindah = useCallback(
    (v: View) => {
      if (v !== "scanner") void stopCamera();
      setView(v);
    },
    [stopCamera],
  );

  useEffect(() => {
    let alive = true;
    let lastTs = 0;
    const tickFeed = async () => {
      try {
        const events = await getFeedFn({ data: { since: lastTs } });
        if (!alive || events.length === 0) return;
        lastTs = Math.max(...events.map((e) => e.ts));
        setRecent((prev) => [...events.slice().reverse(), ...prev].slice(0, 8));
      } catch {
        /* poll berikutnya mencoba lagi */
      }
    };
    const tickStats = async () => {
      try {
        const s = await getStatsFn();
        if (alive) setStats(s);
      } catch {
        /* poll berikutnya mencoba lagi */
      }
    };
    void tickFeed();
    void tickStats();
    const feedTimer = setInterval(tickFeed, 2000);
    const statsTimer = setInterval(tickStats, 10000);
    return () => {
      alive = false;
      clearInterval(feedTimer);
      clearInterval(statsTimer);
    };
  }, []);

  const submitManual = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    unlockAudio();
    const form = new FormData(e.currentTarget);
    const kode = String(form.get("kode") ?? "");
    e.currentTarget.reset();
    void submitKode(kode);
  };

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const terakhir = recent[0] ?? null;

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-6 pb-[max(6rem,env(safe-area-inset-bottom))] md:pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:max-w-5xl">
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="flex flex-1 items-center justify-center gap-2 text-center text-xl font-bold">
            <Icon icon={ScanIcon} size={22} />
            Scanner Kehadiran
          </h1>
          {/* ponytail: aksi sekunder di balik ⋮ (pola Menu reuse site-header);
              Keluar jangan lebih menonjol dari Scanner. */}
          <Menu.Root>
            <Menu.Trigger
              aria-label="Menu scanner"
              className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-accent"
            >
              <Icon icon={MoreVerticalIcon} size={20} />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner
                align="end"
                sideOffset={6}
                className="isolate z-50"
              >
                <Menu.Popup className="min-w-52 rounded-xl border bg-popover p-1 text-popover-foreground shadow-md outline-none">
                  <Menu.Item
                    onClick={toggleMute}
                    className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <Icon icon={VolumeHighIcon} size={16} />
                    {muted ? "Aktifkan suara" : "Matikan suara"}
                  </Menu.Item>
                  <Menu.LinkItem
                    render={<Link to="/pengawas-wr" />}
                    className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <Icon icon={UserAdd01Icon} size={16} />
                    Pengawas WR
                  </Menu.LinkItem>
                  <Menu.Item
                    onClick={() => void keluar()}
                    className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive outline-none select-none data-highlighted:bg-destructive/10"
                  >
                    <Icon icon={Logout01Icon} size={16} />
                    Keluar
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
        <div>
          <p className="text-base font-semibold">
            {session.nama || session.sub}
          </p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {session.sub}
            {tugas ? <Badge variant="secondary">{tugas}</Badge> : null}
          </p>
          {[ruang, sesi].filter(Boolean).length > 0 ? (
            <p className="mt-1 text-sm font-medium tabular-nums">
              {[ruang, sesi].filter(Boolean).join(" · ")}
            </p>
          ) : session.role === "panitia" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Plotting belum diisi, hubungi admin.
            </p>
          ) : null}
        </div>
      </div>

      {stats ? (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold tabular-nums text-primary">
                {stats.siswaHadir}
                <span className="text-sm font-normal text-muted-foreground">
                  /{stats.siswaTotal}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Siswa hadir · AW1/AW3/AW4
              </p>
              <Progress
                value={pct(stats.siswaHadir, stats.siswaTotal)}
                aria-label={`Siswa hadir ${pct(stats.siswaHadir, stats.siswaTotal)} persen`}
                className="mt-2"
              />
              <p className="mt-1 text-xs font-medium tabular-nums text-muted-foreground">
                {pct(stats.siswaHadir, stats.siswaTotal)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold tabular-nums text-primary">
                {stats.pengujiHadir}
                <span className="text-sm font-normal text-muted-foreground">
                  /{stats.pengujiTotal}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">Penguji hadir</p>
              <Progress
                value={pct(stats.pengujiHadir, stats.pengujiTotal)}
                aria-label={`Penguji hadir ${pct(stats.pengujiHadir, stats.pengujiTotal)} persen`}
                className="mt-2"
              />
              <p className="mt-1 text-xs font-medium tabular-nums text-muted-foreground">
                {pct(stats.pengujiHadir, stats.pengujiTotal)}%
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ponytail: tab atas khusus desktop; mobile pakai bottom-nav di bawah. */}
      <div
        role="tablist"
        aria-label="Area kerja scanner"
        className="mb-4 hidden justify-center md:flex"
      >
        <div className="inline-flex rounded-full bg-muted p-1">
          {NAV.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={view === t.value}
              onClick={() => pindah(t.value)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === t.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon icon={t.icon} size={16} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {view === "scanner" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scan QR</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* ponytail: #qr-reader selalu ter-render dgn ukuran nyata, html5-qrcode
              mengukur video saat start(); container display:none → lebar 0 → tak ada preview. */}
              <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-black">
                <div
                  id="qr-reader"
                  className="w-full"
                  style={{ aspectRatio: "1 / 1" }}
                />
                {camState === "on" ? (
                  <>
                    {/* bingkai sudut + garis scan */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-4 rounded-lg border-2 border-white/70"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-8 animate-[scan-y_2.2s_ease-in-out_infinite] motion-reduce:animate-none"
                    >
                      {" "}
                      <div className="h-0.5 w-full rounded bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.9)]" />
                    </div>
                    <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs font-medium text-white/90">
                      Arahkan QR ke dalam kotak
                    </p>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted px-6 text-center">
                    {camState === "starting" ? (
                      <p className="animate-pulse text-sm text-muted-foreground">
                        Menyiapkan kamera…
                      </p>
                    ) : camState === "denied" ? (
                      <>
                        <p className="text-sm font-semibold">
                          Akses kamera diperlukan
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Izinkan kamera melalui pengaturan browser kemudian
                          coba kembali.
                        </p>
                        <Button
                          type="button"
                          onClick={() => void startCamera()}
                          className="mt-1 min-h-11"
                        >
                          Coba Lagi
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold">
                          Kamera belum aktif
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ketuk Aktifkan Kamera untuk mulai.
                        </p>
                        <Button
                          type="button"
                          onClick={() => void startCamera()}
                          className="mt-1 min-h-11"
                        >
                          Aktifkan Kamera
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex min-h-11 items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm font-medium">Kamera</span>
                <Switch
                  aria-label="Kamera scanner"
                  checked={camState === "on"}
                  onCheckedChange={(v) =>
                    void (v ? startCamera() : stopCamera())
                  }
                  className="after:absolute after:-inset-3"
                />
              </div>
              <div
                aria-hidden
                className="flex items-center gap-3 text-xs text-muted-foreground"
              >
                <span className="h-px flex-1 bg-border" />
                atau
                <span className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={submitManual} className="flex gap-2">
                <Input
                  name="kode"
                  aria-label="Kode manual"
                  placeholder="mis. AW4-A001"
                  className="min-w-0"
                />
                <Button type="submit" className="shrink-0">
                  Catat Kehadiran
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              {terakhir ? (
                <>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {terakhir.nama ? terakhir.nama.charAt(0) : "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {terakhir.nama || terakhir.kode}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground capitalize">
                      Terakhir tercatat · {terakhir.kode} · {terakhir.tipe} ·{" "}
                      {wibTime(terakhir.ts)}
                    </span>
                  </span>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Belum ada scan hari ini.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {view === "daftar" ? (
        <OnTheSpotForm cabang={cabang} kelas={kelas} program={program} />
      ) : null}

      {view === "monitoring" ? (
        <div className="flex flex-col gap-4">
          {stats ? (
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold tabular-nums">
                    {stats.siswaTotal}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Siswa</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold tabular-nums text-primary">
                    {stats.siswaHadir}
                  </p>
                  <p className="text-xs text-muted-foreground">Sudah Hadir</p>
                  <p className="mt-1 text-xs font-medium tabular-nums text-muted-foreground">
                    {pct(stats.siswaHadir, stats.siswaTotal)}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold tabular-nums">
                    {stats.siswaTotal - stats.siswaHadir}
                  </p>
                  <p className="text-xs text-muted-foreground">Belum Hadir</p>
                  <p className="mt-1 text-xs font-medium tabular-nums text-muted-foreground">
                    {100 - pct(stats.siswaHadir, stats.siswaTotal)}%
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}
          {stats ? <GrafikKedatangan grafik={stats.grafik} /> : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Daftar Kedatangan Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  Belum ada kedatangan hari ini. Data akan muncul setelah
                  peserta mulai check-in.
                </p>
              ) : (
                <ul className="divide-y">
                  {recent.map((e) => (
                    <li
                      key={`${e.ts}-${e.kode}`}
                      className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                    >
                      <span className="font-medium">
                        {e.nama || e.kode}
                        {e.nama ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {e.kode}
                          </span>
                        ) : null}{" "}
                        <span className="font-normal text-muted-foreground capitalize">
                          · {e.tipe}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {wibTime(e.ts)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ponytail: bottom-nav mobile — pola reuse admin/index.tsx. */}
      <nav
        aria-label="Area kerja scanner"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-3">
          {NAV.map((t) => {
            const aktif = view === t.value;
            return (
              <button
                key={t.value}
                type="button"
                aria-current={aktif ? "page" : undefined}
                onClick={() => pindah(t.value)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                  aktif ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon icon={t.icon} size={22} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <ResultDialog result={outcome} onClose={() => setOutcome(null)} />
    </main>
  );
}
