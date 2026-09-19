import { Menu } from "@base-ui/react/menu";
import {
  Logout01Icon,
  MoreVerticalIcon,
  ScanIcon,
  VolumeHighIcon,
} from "@hugeicons/core-free-icons";
import {
  createFileRoute,
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
import {
  KopiDialog,
  type KopiDialogState,
} from "#/components/scanner/kopi-dialog";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Icon } from "#/components/ui/icon";
import { Input } from "#/components/ui/input";
import { Switch } from "#/components/ui/switch";
import { sessionFnOr } from "#/lib/auth";
import { logoutApi } from "#/lib/auth-client";
import { beep, setMuted as setAudioMuted, unlockAudio } from "#/lib/beep";
import {
  claimKopiFn,
  getKopiFeedFn,
  type KopiEvent,
  peekKopiFn,
} from "#/lib/kopi";
import { labelVarian, type VarianKopi } from "#/lib/kopi-meta";
import { wibTime } from "#/lib/waktu";

export const Route = createFileRoute("/barista/")({
  beforeLoad: async () => {
    const s = await sessionFnOr({ data: { role: "barista" } });
    if (s?.role !== "barista" && s?.role !== "admin")
      throw redirect({ to: "/barista/login" });
    return { session: s };
  },
  component: BaristaPage,
});

type CamState = "off" | "starting" | "on" | "denied";

function BaristaPage() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const router = useRouter();
  const [camState, setCamState] = useState<CamState>("off");
  const [dialog, setDialog] = useState<KopiDialogState | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [recent, setRecent] = useState<KopiEvent[]>([]);
  const [total, setTotal] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // ponytail: kunci scan selama dialog terbuka — kamera tak menimpa pilihan.
  const busyRef = useRef(false);

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

  const keluar = useCallback(async () => {
    if (!window.confirm("Yakin keluar dari akun?")) return;
    try {
      await logoutApi();
      await router.invalidate();
      await navigate({ to: "/", search: { cabang: "" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal keluar.");
    }
  }, [navigate, router]);

  const closeDialog = useCallback(() => {
    setDialog(null);
    busyRef.current = false;
  }, []);

  const submitKode = useCallback(async (kode: string) => {
    if (busyRef.current || !kode.trim()) return;
    busyRef.current = true;
    const k = kode.trim().toUpperCase();
    setDialog({ phase: "loading", kode: k });
    try {
      const st = await peekKopiFn({ data: { kode: k } });
      if (st.sisa <= 0) {
        beep("error");
        setDialog({ phase: "empty", kode: st.kode, nama: st.nama });
      } else {
        beep("success");
        setDialog({
          phase: "choose",
          kode: st.kode,
          nama: st.nama,
          sisa: st.sisa,
        });
      }
    } catch (err) {
      beep("error");
      setDialog({
        phase: "error",
        message: err instanceof Error ? err.message : "Scan gagal.",
      });
    }
  }, []);

  const onClaim = useCallback(
    async (items: VarianKopi[]) => {
      if (dialog?.phase !== "choose" || claiming) return;
      const { kode, nama } = dialog;
      setClaiming(true);
      try {
        const r = await claimKopiFn({ data: { kode, items } });
        beep("success");
        setDialog({ phase: "done", kode, nama, items, sisa: r.sisa });
      } catch (err) {
        beep("error");
        setDialog({
          phase: "error",
          message: err instanceof Error ? err.message : "Gagal menyimpan.",
        });
      } finally {
        setClaiming(false);
      }
    },
    [dialog, claiming],
  );

  const startCamera = useCallback(async () => {
    unlockAudio();
    if (scannerRef.current) return;
    setCamState("starting");
    try {
      const scanner = new Html5Qrcode("kopi-reader");
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

  useEffect(() => {
    let alive = true;
    let lastTs = 0;
    const tick = async () => {
      try {
        const events = await getKopiFeedFn({ data: { since: lastTs } });
        if (!alive || events.length === 0) return;
        lastTs = Math.max(...events.map((e) => e.ts));
        setTotal((n) => n + events.length);
        setRecent((prev) => [...events.slice().reverse(), ...prev].slice(0, 8));
      } catch {
        /* poll berikutnya mencoba lagi */
      }
    };
    void tick();
    const timer = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(timer);
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

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="flex flex-1 items-center justify-center gap-2 text-center text-xl font-bold">
            <Icon icon={ScanIcon} size={22} />
            Scanner Barista
          </h1>
          <Menu.Root>
            <Menu.Trigger
              aria-label="Menu barista"
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
          <p className="text-sm text-muted-foreground">{session.sub}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan QR Siswa</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {/* ponytail: #kopi-reader selalu ter-render ukuran nyata —
                html5-qrcode mengukur video saat start(). */}
            <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-black">
              <div
                id="kopi-reader"
                className="w-full"
                style={{ aspectRatio: "1 / 1" }}
              />
              {camState === "on" ? (
                <>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-4 rounded-lg border-2 border-white/70"
                  />
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
                        Izinkan kamera melalui pengaturan browser kemudian coba
                        kembali.
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
                onCheckedChange={(v) => void (v ? startCamera() : stopCamera())}
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
                Berikan Kopi
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Kopi diberikan ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">
                Belum ada kopi diambil hari ini.
              </p>
            ) : (
              <ul className="divide-y">
                {recent.map((e) => (
                  <li
                    key={`${e.ts}-${e.kode}-${e.jenis}`}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {e.nama || e.kode}
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {labelVarian(e.jenis)}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {e.olehNama || e.oleh}
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

      <KopiDialog
        state={dialog}
        busy={claiming}
        onClaim={(items) => void onClaim(items)}
        onClose={closeDialog}
      />
    </main>
  );
}
