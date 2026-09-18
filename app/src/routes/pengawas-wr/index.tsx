import { Camera01Icon } from "@hugeicons/core-free-icons";
import {
  createFileRoute,
  type ErrorComponentProps,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LogoutButton } from "#/components/auth-ui";
import { ScanSiswaModal } from "#/components/scan-siswa-modal";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { sessionFnOr } from "#/lib/auth";
import {
  getPengawasWrFn,
  type PengawasWrSiswa,
  savePengawasWrFn,
} from "#/lib/pengawas-wr";
import { NILAI_SELESAI } from "#/lib/soal";

export const Route = createFileRoute("/pengawas-wr/")({
  beforeLoad: async () => {
    const s = await sessionFnOr({ data: { role: "panitia" } });
    if (s?.role !== "panitia" && s?.role !== "admin")
      throw redirect({ to: "/scanner/login" });
    return { session: s };
  },
  loader: async () => getPengawasWrFn(),
  pendingComponent: PengawasWrPending,
  errorComponent: PengawasWrError,
  component: PengawasWrDashboard,
});

function PengawasWrPending() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </main>
  );
}

function PengawasWrError({ error }: ErrorComponentProps) {
  const navigate = useNavigate();
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
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void navigate({ to: "/scanner" })}
          >
            ← Kembali
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

function PengawasWrDashboard() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cabangId, setCabangId] = useState("");
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState("");

  const roster = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.roster.filter((w) => {
      if (cabangId && w.cabangId !== cabangId) return false;
      if (q && !`${w.nama} ${w.kode}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data.roster, cabangId, query]);

  const selesai = roster.filter((w) => w.math === NILAI_SELESAI).length;

  const tandai = async (w: PengawasWrSiswa): Promise<void> => {
    setBusy(w.id);
    try {
      await savePengawasWrFn({ data: { siswaId: w.id } });
      toast.success(`${w.nama} ditandai selesai ujian Math.`);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menandai.");
    } finally {
      setBusy("");
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Pengawas WR — Math</h1>
          <p className="text-base font-semibold">{data.nama}</p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {data.kode}
            {data.tugas ? (
              <Badge variant="secondary">{data.tugas}</Badge>
            ) : null}
          </p>
          {[data.ruang, data.sesi].filter(Boolean).length > 0 ? (
            <p className="mt-1 text-sm font-medium tabular-nums">
              {[data.ruang, data.sesi].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <LogoutButton />
      </div>

      <p className="rounded-md bg-muted px-3 py-2 text-sm">
        Tandai siswa SMP/SMA yang sudah menyelesaikan ujian Math (written test).
        Nama Anda tampil di kolom paraf lembar validasi.
      </p>
      <p className="text-sm text-muted-foreground tabular-nums">
        {selesai}/{roster.length} siswa selesai
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Cari nama / kode siswa…"
          aria-label="Cari nama atau kode siswa"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={cabangId} onValueChange={(v) => setCabangId(v ?? "")}>
          <SelectTrigger
            aria-label="Filter cabang"
            className="sm:max-w-96 sm:flex-1"
          >
            <SelectValue>
              {(v: string | null) =>
                v
                  ? (data.cabang.find((c) => c.id === v)?.nama ?? v)
                  : "Semua cabang"
              }
            </SelectValue>
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setScan(true)}
        >
          <Icon icon={Camera01Icon} size={16} />
          Scan QR siswa
        </Button>
      </div>

      <Card>
        <CardContent className="px-2 py-0 sm:px-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">No</TableHead>
                  <TableHead className="whitespace-normal">Siswa</TableHead>
                  <TableHead>Ruang</TableHead>
                  <TableHead>Hadir</TableHead>
                  <TableHead className="text-right">Math</TableHead>
                  <TableHead className="sticky right-0 bg-card text-right">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((w, i) => {
                  const sudah = w.math === NILAI_SELESAI;
                  return (
                    <TableRow key={w.id}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium">{w.nama}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.kode} · {w.kelasTujuan} · {w.jenjang}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium tabular-nums">
                          {w.ruangTes || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {w.sesi || ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={w.hadir ? "default" : "secondary"}>
                          {w.hadir ? "Hadir" : "Belum"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {sudah ? "✓" : w.math || "-"}
                      </TableCell>
                      <TableCell className="sticky right-0 bg-card text-right">
                        {sudah ? (
                          <Badge variant="success">Selesai</Badge>
                        ) : (
                          <Button
                            type="button"
                            disabled={busy === w.id}
                            onClick={() => void tandai(w)}
                          >
                            {busy === w.id ? "Menyimpan…" : "Tandai selesai"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {roster.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Tidak ada siswa SMP/SMA yang cocok.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {scan ? (
        <ScanSiswaModal
          roster={data.roster}
          onPick={(w) => {
            setScan(false);
            if (w.math === NILAI_SELESAI) {
              toast.info(`${w.nama} sudah ditandai selesai.`);
              return;
            }
            void tandai(w);
          }}
          onClose={() => setScan(false)}
        />
      ) : null}
    </main>
  );
}
