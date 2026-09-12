import { ScanIcon } from "@hugeicons/core-free-icons";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Html5Qrcode } from "html5-qrcode";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { LogoutButton } from "#/components/auth-ui";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Icon } from "#/components/ui/icon";
import { Input } from "#/components/ui/input";
import {
  type AttendanceEvent,
  getFeedFn,
  getStatsFn,
  recordAttendanceFn,
} from "#/lib/attendance";
import { sessionFnOr } from "#/lib/auth";

export const Route = createFileRoute("/scanner/")({
  beforeLoad: async () => {
    const s = await sessionFnOr({ data: { role: "panitia" } });
    if (s?.role !== "panitia" && s?.role !== "admin")
      throw redirect({ to: "/scanner/login" });
    return { session: s };
  },
  component: ScannerPage,
});

interface ScanOutcome {
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
            Belum ada kedatangan hari ini.
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
  const [cameraOn, setCameraOn] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [recent, setRecent] = useState<AttendanceEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);

  const submitKode = useCallback(async (kode: string) => {
    if (busyRef.current || !kode.trim()) return;
    busyRef.current = true;
    try {
      const r = await recordAttendanceFn({ data: { kode } });
      setOutcome({ nama: r.nama, tipe: r.tipe, duplicate: r.duplicate });
    } catch (err) {
      setOutcome({ error: err instanceof Error ? err.message : "Scan gagal." });
    } finally {
      setTimeout(() => {
        busyRef.current = false;
      }, 1500);
    }
  }, []);

  const startCamera = useCallback(async () => {
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
      setCameraOn(true);
    } catch {
      setOutcome({
        error: "Kamera tidak dapat diakses. Buka via HTTPS dan izinkan kamera.",
      });
    }
  }, [submitKode]);

  const stopCamera = useCallback(async () => {
    try {
      await scannerRef.current?.stop();
    } catch {
      /* abaikan */
    }
    scannerRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(
    () => () => {
      void scannerRef.current?.stop().catch(() => {});
    },
    [],
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
    const form = new FormData(e.currentTarget);
    const kode = String(form.get("kode") ?? "");
    e.currentTarget.reset();
    void submitKode(kode);
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6 lg:max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Icon icon={ScanIcon} size={22} />
            Scanner Kehadiran
          </h1>
          <p className="text-sm text-muted-foreground">{session.sub}</p>
        </div>
        <LogoutButton />
      </div>

      {stats ? (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {stats.siswaHadir}
                <span className="text-sm font-normal text-muted-foreground">
                  /{stats.siswaTotal}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Siswa hadir · AW1/AW3/AW4
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {stats.pengujiHadir}
                <span className="text-sm font-normal text-muted-foreground">
                  /{stats.pengujiTotal}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">Penguji hadir</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scan QR</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* ponytail: #qr-reader selalu ter-render dgn ukuran nyata, html5-qrcode
              mengukur video saat start(); container display:none → lebar 0 → tak ada preview. */}
              <div className="relative w-full overflow-hidden rounded-lg bg-black">
                <div
                  id="qr-reader"
                  className="w-full"
                  style={{ aspectRatio: "4 / 3", minHeight: 220 }}
                />
                {!cameraOn ? (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-muted text-sm text-muted-foreground">
                    Kamera mati
                  </div>
                ) : null}
              </div>
              {cameraOn ? (
                <Button type="button" variant="outline" onClick={stopCamera}>
                  Matikan kamera
                </Button>
              ) : (
                <Button type="button" onClick={startCamera}>
                  Nyalakan kamera
                </Button>
              )}
              <form onSubmit={submitManual} className="flex gap-2">
                <Input
                  name="kode"
                  aria-label="Kode manual"
                  placeholder="mis. AW4-A001"
                  className="min-w-0"
                />
                <Button type="submit">Catat</Button>
              </form>
              {outcome ? (
                outcome.error ? (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {outcome.error}
                  </p>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold">{outcome.nama}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {outcome.tipe}
                      </p>
                    </div>
                    <Badge variant={outcome.duplicate ? "warning" : "success"}>
                      {outcome.duplicate ? "Sudah tercatat" : "Tercatat"}
                    </Badge>
                  </div>
                )
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-3">
          {stats ? <GrafikKedatangan grafik={stats.grafik} /> : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Terakhir tercatat</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  Belum ada scan. Daftar terisi otomatis tiap ada kedatangan.
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
                        {new Date(e.ts).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
