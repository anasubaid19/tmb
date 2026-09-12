import { Camera01Icon } from "@hugeicons/core-free-icons";
import {
  createFileRoute,
  type ErrorComponentProps,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LogoutButton } from "#/components/auth-ui";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Textarea } from "#/components/ui/textarea";
import { sessionFnOr } from "#/lib/auth";
import {
  getFotoFn,
  getPengujiDashboardFn,
  type RosterSiswa,
  saveNilaiFn,
  uploadFotoFn,
} from "#/lib/penguji";

export const Route = createFileRoute("/penguji/")({
  beforeLoad: async () => {
    const s = await sessionFnOr({ data: { role: "penguji" } });
    if (s?.role !== "penguji") throw redirect({ to: "/penguji/login" });
    return { session: s };
  },
  loader: async () => getPengujiDashboardFn(),
  pendingComponent: PengujiPending,
  errorComponent: PengujiError,
  component: PengujiDashboard,
});

function PengujiPending() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </main>
  );
}

function PengujiError({ error }: ErrorComponentProps) {
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

/** Kompres foto ke JPEG ≤1024px di HP sebelum upload. */
async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1024;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Browser tidak mendukung kompresi gambar.");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

function PengujiDashboard() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [jadwalId, setJadwalId] = useState(data.jadwal[0]?.id ?? "");
  const [scopeSemua, setScopeSemua] = useState(false);
  const [query, setQuery] = useState("");
  const [aktif, setAktif] = useState<RosterSiswa | null>(null);

  const jadwal = data.jadwal.find((j) => j.id === jadwalId) ?? data.jadwal[0];
  const kelasSaya = useMemo(
    () => new Set(data.jadwal.map((j) => j.kelas)),
    [data.jadwal],
  );

  const roster = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.roster.filter((w) => {
      if (!scopeSemua && !kelasSaya.has(w.kelasTujuan)) return false;
      if (q && !`${w.nama} ${w.kode}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data.roster, scopeSemua, kelasSaya, query]);

  const dinilai = jadwal
    ? roster.filter((w) => data.nilai[`${jadwal.id}__${w.id}`]).length
    : 0;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{data.nama}</h1>
          <p className="text-sm text-muted-foreground">
            Kode {data.kode} · {data.roster.length} siswa
          </p>
        </div>
        <LogoutButton />
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <img
            src={data.qr}
            alt={`QR kehadiran ${data.kode}`}
            className="size-24 rounded-lg border"
          />
          <div>
            <p className="font-semibold">QR Kehadiran Saya</p>
            <p className="text-sm text-muted-foreground">
              Tunjukkan ke panitia scanner saat tiba di lokasi.
            </p>
          </div>
        </CardContent>
      </Card>

      {data.jadwal.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Belum ada jadwal menguji untuk Anda. Hubungi admin.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jadwal Menguji</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Select
                value={jadwal?.id ?? ""}
                onValueChange={(v) => setJadwalId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jadwal" />
                </SelectTrigger>
                <SelectContent>
                  {data.jadwal.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.materi} · {j.kelas} · {j.sesi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {jadwal ? (
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    {jadwal.tanggal} · {jadwal.sesi} · Ruang {jadwal.ruang} ·
                    Kelas {jadwal.kelas}
                  </p>
                  {jadwal.materiDeskripsi ? (
                    <p className="mt-1 rounded-md bg-muted px-3 py-2">
                      <span className="font-semibold">Bahan: </span>
                      {jadwal.materiDeskripsi}
                    </p>
                  ) : null}
                  <p className="mt-1 text-muted-foreground">
                    {dinilai}/{roster.length} siswa dinilai
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Cari nama / kode siswa…"
              aria-label="Cari nama atau kode siswa"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:max-w-xs"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant={scopeSemua ? "outline" : "default"}
                size="sm"
                onClick={() => setScopeSemua(false)}
              >
                Kelas saya
              </Button>
              <Button
                type="button"
                variant={scopeSemua ? "default" : "outline"}
                size="sm"
                onClick={() => setScopeSemua(true)}
              >
                Semua
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="px-2 py-0 sm:px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Siswa</TableHead>
                    <TableHead>Hadir</TableHead>
                    <TableHead className="text-right">Skor</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((w) => {
                    const n = jadwal
                      ? data.nilai[`${jadwal.id}__${w.id}`]
                      : undefined;
                    return (
                      <TableRow key={w.id}>
                        <TableCell>
                          <p className="font-medium">{w.nama}</p>
                          <p className="text-xs text-muted-foreground">
                            {w.kode} · {w.kelasTujuan}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={w.hadir ? "success" : "secondary"}>
                            {w.hadir ? "Hadir" : "Belum"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {n?.skor || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant={n ? "outline" : "default"}
                            onClick={() => setAktif(w)}
                          >
                            {n ? "Ubah" : "Nilai"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {roster.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Tidak ada siswa yang cocok.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}

      {aktif && jadwal ? (
        <NilaiModal
          siswa={aktif}
          jadwalId={jadwal.id}
          jadwalLabel={`${jadwal.materi} · ${jadwal.kelas}`}
          existing={data.nilai[`${jadwal.id}__${aktif.id}`]}
          onClose={() => setAktif(null)}
          onSaved={() => {
            setAktif(null);
            void router.invalidate();
          }}
        />
      ) : null}
    </main>
  );
}

function NilaiModal({
  siswa,
  jadwalId,
  jadwalLabel,
  existing,
  onClose,
  onSaved,
}: {
  siswa: RosterSiswa;
  jadwalId: string;
  jadwalLabel: string;
  existing?: {
    nilaiId: string;
    skor: string;
    catatan: string;
    adaFoto: boolean;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [skor, setSkor] = useState(existing?.skor ?? "");
  const [catatan, setCatatan] = useState(existing?.catatan ?? "");
  const [foto, setFoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lihatFoto = async () => {
    if (!existing) return;
    try {
      const r = await getFotoFn({ data: { nilaiId: existing.nilaiId } });
      if (r.dataUrl) setFoto(r.dataUrl);
      else toast.error("File foto tidak ditemukan di server.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat foto.");
    }
  };

  const pilihFoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      setFoto(await compressImage(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Foto gagal diproses.");
    }
  };

  const simpan = async () => {
    if (!skor.trim() && !foto) {
      toast.error("Isi skor atau tambahkan foto.");
      return;
    }
    setBusy(true);
    try {
      if (skor.trim())
        await saveNilaiFn({
          data: { jadwalId, siswaId: siswa.id, skor, catatan },
        });
      if (foto?.startsWith("data:"))
        await uploadFotoFn({
          data: { jadwalId, siswaId: siswa.id, dataUrl: foto },
        });
      toast.success(`Nilai ${siswa.nama} tersimpan.`);
      onSaved();
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
      title={siswa.nama}
      description={jadwalLabel}
    >
      <div className="flex flex-col gap-3 pt-2">
        <div>
          <label htmlFor="skor" className="mb-1 block text-sm font-medium">
            Skor (0–100)
          </label>
          <Input
            id="skor"
            inputMode="decimal"
            placeholder="mis. 85"
            value={skor}
            onChange={(e) => setSkor(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="catatan" className="mb-1 block text-sm font-medium">
            Catatan
          </label>
          <Textarea
            id="catatan"
            placeholder="Catatan penilaian (opsional)"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium">Foto arsip</span>
          {foto ? (
            <img
              src={foto}
              alt="Pratinjau foto"
              className="mb-2 max-h-48 rounded-lg border"
            />
          ) : existing?.adaFoto ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={lihatFoto}
              className="mb-2"
            >
              <Icon icon={Camera01Icon} size={16} />
              Lihat foto tersimpan
            </Button>
          ) : null}
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => void pilihFoto(e.target.files?.[0])}
          />
        </div>
        <Button type="button" onClick={simpan} disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan nilai"}
        </Button>
      </div>
    </Modal>
  );
}
