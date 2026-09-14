import {
  createFileRoute,
  type ErrorComponentProps,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LogoutButton } from "#/components/auth-ui";
import { LembarPrintOverlay } from "#/components/lembar-validasi-document";
import { OnTheSpotForm } from "#/components/on-the-spot-form";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Modal } from "#/components/ui/dialog";
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
  type AdminJadwal,
  type AdminSiswa,
  getAdminDashboardFn,
  saveGasConfigFn,
  saveJadwalFn,
  setJadwalTampilFn,
  setPengumumanFn,
  setStatusFn,
} from "#/lib/admin";
import { type AttendanceEvent, getFeedFn } from "#/lib/attendance";
import { sessionFnOr } from "#/lib/auth";
import {
  deleteInterviewFotoFn,
  getLembarFn,
  LEMBAR_FOTO_MAX,
  type LembarData,
  saveInterviewLembarFn,
  uploadInterviewFotoFn,
} from "#/lib/lembar";
import { CONFIG_KEYS, setConfigFn } from "#/lib/site";
import { compressImage } from "#/lib/utils";

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

function AdminPage() {
  const data = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
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
              Terhubung ke Google Sheet
              <span className="ml-1 opacity-70">({data.gas.source})</span>
            </Badge>
          ) : (
            <Badge variant="warning">Mode mock — belum terhubung</Badge>
          )}
          <LogoutButton />
        </div>
      </div>
      <Tabs defaultValue="monitor">
        <TabsList>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
          <TabsTrigger value="rekap">Rekap</TabsTrigger>
          <TabsTrigger value="jadwal">Jadwal</TabsTrigger>
          <TabsTrigger value="daftar">Daftar</TabsTrigger>
          <TabsTrigger value="pengaturan">Pengaturan</TabsTrigger>
        </TabsList>
        <TabsContent value="monitor">
          <MonitorTab data={data} />
        </TabsContent>
        <TabsContent value="rekap">
          <RekapTab data={data} />
        </TabsContent>
        <TabsContent value="jadwal">
          <JadwalTab data={data} />
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
                      {p.materi
                        ? ` · ${data.materi.find((m) => m.id === p.materi)?.nama ?? p.materi}`
                        : ""}
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
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => setLembarSiswa(w)}
                    >
                      Lembar
                    </Button>
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
      toast.error(err instanceof Error ? err.message : "Gagal.");
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
  const [busy, setBusy] = useState(false);
  const kelasOpts = data.kelas.filter((k) => k.cabangId === cabangId);
  const pengujiOpts = data.penguji.filter((p) => p.cabangId === cabangId);
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
          sesi: get("sesi"),
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
            <Input
              id="j-sesi"
              name="sesi"
              required
              defaultValue={awal?.sesi}
              placeholder="Sesi 1 (07.30–08.30)"
            />
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
      toast.error(err instanceof Error ? err.message : "Gagal.");
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
                <p>
                  Tervalidasi oleh{" "}
                  <span className="font-semibold">{lembar.interview.nama}</span>{" "}
                  ({lembar.interview.kode}).
                </p>
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
              disabled={busy || !lembar || !!lembar.interview}
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
                      className="absolute right-1 top-1 h-6 px-2 text-xs"
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

/** Kartu Koneksi GAS — URL+token deploy, disimpan lokal di server. */
function GasConnectionCard({
  gas,
}: {
  gas: {
    connected: boolean;
    source: "env" | "file" | "none";
    url: string;
    tokenMasked: string;
  };
}) {
  const router = useRouter();
  const [url, setUrl] = useState(gas.url);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  const simpan = async () => {
    if (!url.trim() || !token.trim()) {
      toast.error("Isi URL dan token dulu.");
      return;
    }
    setBusy(true);
    try {
      await saveGasConfigFn({ data: { url: url.trim(), token: token.trim() } });
      toast.success("Koneksi GAS tersimpan. App beralih ke produksi.");
      setToken("");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">Koneksi GAS (Database)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Status:</span>
          {gas.connected ? (
            <Badge variant="success">Produksi (GAS aktif)</Badge>
          ) : (
            <Badge variant="warning">Mock (data contoh)</Badge>
          )}
          {gas.source !== "none" ? (
            <span className="text-xs text-muted-foreground">
              sumber: {gas.source === "env" ? ".env" : "file server"} · token{" "}
              {gas.tokenMasked || "-"}
            </span>
          ) : null}
        </div>
        <div>
          <label htmlFor="gas-url" className="mb-1 block text-sm font-medium">
            URL deploy Apps Script
          </label>
          <Input
            id="gas-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/XXXX/exec"
            className="font-mono text-xs"
          />
        </div>
        <div>
          <label htmlFor="gas-token" className="mb-1 block text-sm font-medium">
            API token
          </label>
          <Input
            id="gas-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={
              gas.connected
                ? "•••••••• (kosongkan — token lama tetap)"
                : "Isi API_TOKEN"
            }
            className="font-mono text-xs"
          />
        </div>
        <Button type="button" onClick={simpan} disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan & aktifkan"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Tersimpan lokal di server (server/gas-settings.json), bukan di
          spreadsheet. Setelah disimpan, app langsung beralih dari mode mock ke
          produksi.
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
      <GasConnectionCard gas={data.gas} />
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
            const isBool = key !== "countdown_at" && key !== "math_gform_url";
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
