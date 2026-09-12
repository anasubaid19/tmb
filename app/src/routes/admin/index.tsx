import {
  createFileRoute,
  type ErrorComponentProps,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LogoutButton } from "#/components/auth-ui";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
  type AdminDashboard,
  getAdminDashboardFn,
  registerSiswaFn,
  setPengumumanFn,
  setStatusFn,
} from "#/lib/admin";
import { type AttendanceEvent, getFeedFn } from "#/lib/attendance";
import { sessionFnOr } from "#/lib/auth";
import { CONFIG_KEYS, setConfigFn } from "#/lib/site";

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

function AdminPage() {
  const data = Route.useLoaderData();
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard Admin</h1>
        <LogoutButton />
      </div>
      <Tabs defaultValue="monitor">
        <TabsList>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
          <TabsTrigger value="rekap">Rekap</TabsTrigger>
          <TabsTrigger value="daftar">Daftar</TabsTrigger>
          <TabsTrigger value="pengaturan">Pengaturan</TabsTrigger>
        </TabsList>
        <TabsContent value="monitor">
          <MonitorTab data={data} />
        </TabsContent>
        <TabsContent value="rekap">
          <RekapTab data={data} />
        </TabsContent>
        <TabsContent value="daftar">
          <DaftarTab data={data} />
        </TabsContent>
        <TabsContent value="pengaturan">
          <PengaturanTab data={data} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

/* ---------------- Monitor ---------------- */

/** Grafik batang kedatangan per jam (WIB), div murni, tanpa lib chart. */
function ArrivalChart({ events }: { events: AttendanceEvent[] }) {
  const buckets = useMemo(() => {
    const map = new Map<number, { siswa: number; penguji: number }>();
    for (const e of events) {
      const h = new Date(e.ts + 7 * 3600_000).getUTCHours();
      const b = map.get(h) ?? { siswa: 0, penguji: 0 };
      if (e.tipe === "penguji") b.penguji += 1;
      else b.siswa += 1;
      map.set(h, b);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [events]);
  const max = Math.max(1, ...buckets.map(([, b]) => b.siswa + b.penguji));

  if (buckets.length === 0)
    return (
      <p className="px-4 pb-4 text-sm text-muted-foreground">
        Belum ada data kedatangan hari ini.
      </p>
    );
  return (
    <div>
      <div className="flex h-36 items-end gap-2 px-4">
        {buckets.map(([h, b]) => (
          <div key={h} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-semibold tabular-nums">
              {b.siswa + b.penguji}
            </span>
            <div className="flex h-28 w-full items-end overflow-hidden rounded-t-md">
              <div
                className="flex w-full flex-col justify-end transition-[height] duration-300 ease-out"
                style={{
                  height: `${Math.max(8, ((b.siswa + b.penguji) / max) * 100)}%`,
                }}
              >
                {b.penguji > 0 ? (
                  <div
                    className="w-full bg-emerald-500"
                    style={{
                      height: `${(b.penguji / (b.siswa + b.penguji)) * 100}%`,
                    }}
                  />
                ) : null}
                <div className="w-full flex-1 bg-primary" />
              </div>
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {String(h).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-4 px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-primary" /> Siswa
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-emerald-500" />{" "}
          Penguji
        </span>
      </div>
    </div>
  );
}

function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.start();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
    setTimeout(() => void ctx.close(), 500);
  } catch {
    /* audio tidak tersedia */
  }
}

function MonitorTab({ data }: { data: AdminDashboard }) {
  const [arrived, setArrived] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<
    { ts: number; nama: string; tipe: string }[]
  >([]);
  const [today, setToday] = useState<AttendanceEvent[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const soundRef = useRef(false);
  const flightRef = useRef(false);
  soundRef.current = soundOn;

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
        if (soundRef.current) beep();
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
            <p className="text-2xl font-bold text-primary">
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
            <p className="text-2xl font-bold text-primary">
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
          <Switch checked={soundOn} onCheckedChange={setSoundOn} />
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
                    <span className="text-xs tabular-nums text-muted-foreground">
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
        <div className="space-y-4">
          <Card className="border-amber-300">
            <CardHeader>
              <CardTitle className="text-base">
                Siswa belum hadir ({siswaBelum.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {siswaBelum.slice(0, 15).map((w) => (
                  <li key={w.id} className="px-4 py-1.5 text-sm">
                    {w.nama}{" "}
                    <span className="text-muted-foreground">· {w.kode}</span>
                  </li>
                ))}
              </ul>
              {siswaBelum.length > 15 ? (
                <p className="px-4 py-2 text-xs text-muted-foreground">
                  +{siswaBelum.length - 15} lainnya (lihat tab Rekap)
                </p>
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
                {pengujiBelum.map((p) => (
                  <li key={p.kode} className="px-4 py-1.5 text-sm">
                    {p.nama}{" "}
                    <span className="text-muted-foreground">
                      · {p.dinilai} dinilai
                    </span>
                  </li>
                ))}
              </ul>
              {pengujiBelum.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  Semua penguji sudah hadir.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Rekap ---------------- */

function RekapTab({ data }: { data: AdminDashboard }) {
  const router = useRouter();
  const [cabangId, setCabangId] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

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
      toast.error(err instanceof Error ? err.message : "Gagal.");
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
                <TableHead>Foto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Kelulusan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <p className="font-medium">{w.nama}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.kode} · {w.kelasTujuan}
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
                  <TableCell>{data.fotoAda[w.id] ? "✓" : "-"}</TableCell>
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
                      {busy === `st-${w.id}` ? "…" : w.statusUjian}
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
        {rows.length} siswa · Status “selesai” membuka nilai untuk wali.
      </p>
    </div>
  );
}

/* ---------------- Daftar on-the-spot ---------------- */

function DaftarTab({ data }: { data: AdminDashboard }) {
  const [hasil, setHasil] = useState<{
    kode: string;
    nama: string;
    qr: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    setBusy(true);
    try {
      const r = await registerSiswaFn({
        data: {
          nama: get("nama"),
          noHp: get("noHp"),
          cabangId: get("cabangId"),
          jenjang: get("jenjang"),
          kelasTujuan: get("kelasTujuan"),
          asalSekolah: get("asalSekolah"),
        },
      });
      setHasil({ kode: r.kode, nama: r.nama, qr: r.qr });
      e.currentTarget.reset();
      toast.success(`${r.nama} terdaftar.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mendaftar.");
    } finally {
      setBusy(false);
    }
  };

  if (hasil) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendaftaran berhasil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <img
            src={hasil.qr}
            alt={`QR ${hasil.kode}`}
            className="size-48 rounded-lg border"
          />
          <p className="font-mono text-2xl font-bold tracking-widest">
            {hasil.kode}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasil.nama}. Langsung bisa login via no. HP + scan QR ini.
          </p>
          <Button type="button" onClick={() => setHasil(null)}>
            Daftar lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daftar on-the-spot</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nama" className="mb-1 block text-sm font-medium">
              Nama siswa *
            </label>
            <Input id="nama" name="nama" required />
          </div>
          <div>
            <label htmlFor="noHp" className="mb-1 block text-sm font-medium">
              No. HP wali *
            </label>
            <Input id="noHp" name="noHp" type="tel" required />
          </div>
          <div>
            <label
              htmlFor="cabangId"
              className="mb-1 block text-sm font-medium"
            >
              Cabang *
            </label>
            <Select name="cabangId" required>
              <SelectTrigger id="cabangId">
                <SelectValue placeholder="Pilih cabang" />
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
          <div>
            <label htmlFor="jenjang" className="mb-1 block text-sm font-medium">
              Jenjang
            </label>
            <Input id="jenjang" name="jenjang" placeholder="mis. SD" />
          </div>
          <div>
            <label
              htmlFor="kelasTujuan"
              className="mb-1 block text-sm font-medium"
            >
              Kelas tujuan
            </label>
            <Input id="kelasTujuan" name="kelasTujuan" placeholder="mis. 1" />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="asalSekolah"
              className="mb-1 block text-sm font-medium"
            >
              Asal sekolah
            </label>
            <Input id="asalSekolah" name="asalSekolah" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : "Daftarkan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ---------------- Pengaturan (CMS) ---------------- */

const KEY_LABEL: Record<string, string> = {
  show_jadwal: "Tampilkan jadwal",
  show_kelas: "Tampilkan kelas",
  show_materi: "Tampilkan materi",
  show_denah: "Tampilkan denah",
  show_penguji: "Tampilkan penguji",
  show_pengumuman: "Tampilkan pengumuman (teaser)",
  countdown_enabled: "Aktifkan hitung mundur",
  countdown_at: "Waktu hitung mundur",
  umumkan_hasil: "Buka pengumuman hasil (PUBLIK)",
};

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
          {CONFIG_KEYS.map((key) => {
            const cur = valueFor(key);
            const isBool = key !== "countdown_at";
            return (
              <div
                key={key}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${
                  key === "umumkan_hasil" ? "bg-red-50" : ""
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
                </div>
                {isBool ? (
                  <Switch
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
                      defaultValue={cur}
                      placeholder="2026-09-19T07:00:00+07:00"
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
