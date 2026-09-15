import { Camera01Icon } from "@hugeicons/core-free-icons";
import {
  createFileRoute,
  type ErrorComponentProps,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { Html5Qrcode } from "html5-qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  getPengujiDashboardFn,
  type RosterSiswa,
  saveNilaiFn,
} from "#/lib/penguji";
import { NILAI_SELESAI, nilaiKindFor, soalFor } from "#/lib/soal";

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

function PengujiDashboard() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [jadwalId, setJadwalId] = useState(data.jadwal[0]?.id ?? "");
  const [scopeSemua, setScopeSemua] = useState(false);
  const [query, setQuery] = useState("");
  const [aktif, setAktif] = useState<RosterSiswa | null>(null);
  const [scan, setScan] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // ponytail: panel inline (bukan popup) — scroll ke panel saat siswa dipilih.
  useEffect(() => {
    if (aktif) panelRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aktif]);

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
    ? roster.filter((w) => data.nilai[`${jadwal.materiId}__${w.id}`]).length
    : 0;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{data.nama}</h1>
          <p className="text-sm text-muted-foreground">
            Kode {data.kode} · Menguji: {data.materiDiampu} ·{" "}
            {data.roster.length} siswa
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
                    <SelectItem key={j.id || j.materiId} value={j.id}>
                      {j.materi} · {j.kelas} · {j.sesi || "belum dijadwalkan"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {jadwal ? (
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    {jadwal.tanggal
                      ? `${jadwal.tanggal} · ${jadwal.sesi} · Ruang ${jadwal.ruang} · Kelas ${jadwal.kelas}`
                      : "Belum dijadwalkan — Anda tetap bisa menilai siswa."}
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!jadwal}
                onClick={() => setScan(true)}
              >
                <Icon icon={Camera01Icon} size={16} />
                Scan QR siswa
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="px-2 py-0 sm:px-4">
              {/* ponytail: tabel geser horizontal di HP, panel soal menumpuk. */}
              <div className="overflow-x-auto">
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
                        ? data.nilai[`${jadwal.materiId}__${w.id}`]
                        : undefined;
                      const kind = jadwal
                        ? nilaiKindFor(jadwal.materiId, w.jenjang)
                        : "skor";
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
                            {n === NILAI_SELESAI ? "✓" : n || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant={n ? "outline" : "default"}
                              onClick={() => setAktif(w)}
                            >
                              {n
                                ? "Ubah"
                                : kind === "selesai"
                                  ? "Tandai"
                                  : "Nilai"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {roster.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Tidak ada siswa yang cocok.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}

      {scan && jadwal ? (
        <ScanModal
          roster={data.roster}
          onPick={(w) => {
            setScan(false);
            setAktif(w);
          }}
          onClose={() => setScan(false)}
        />
      ) : null}
      {aktif && jadwal ? (
        <div ref={panelRef} className="scroll-mt-4">
          <PenilaianPanel
            key={`${jadwal.materiId}__${aktif.id}`}
            siswa={aktif}
            materiId={jadwal.materiId}
            jadwalLabel={`${jadwal.materi} · ${jadwal.kelas}`}
            existing={data.nilai[`${jadwal.materiId}__${aktif.id}`]}
            gformUrl={data.gformUrl}
            gformQr={data.gformQr}
            onClose={() => setAktif(null)}
            onSaved={() => {
              void router.invalidate();
            }}
          />
        </div>
      ) : null}
    </main>
  );
}

/** Scan QR tiket siswa → langsung buka modal nilai miliknya. */
function ScanModal({
  roster,
  onPick,
  onClose,
}: {
  roster: RosterSiswa[];
  onPick: (w: RosterSiswa) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  // ponytail: onPick inline selalu baru → simpan di ref agar kamera tak restart.
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);

  // ponytail: Modal dirender via Portal (mount async) → useEffect bisa jalan
  // sebelum #qr-nilai ada di DOM. Mulai scanner dari ref callback div.
  // useCallback agar ref tak detach/attach tiap render (stop saat tak jalan = throw).
  const attach = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) {
        const sc = scannerRef.current;
        scannerRef.current = null;
        startedRef.current = false;
        if (sc) {
          try {
            void sc.stop().catch(() => {});
          } catch {
            /* scanner tak pernah jalan (kamera ditolak) — abaikan */
          }
        }
        return;
      }
      if (startedRef.current) return;
      startedRef.current = true;
      const scanner = new Html5Qrcode("qr-nilai");
      scannerRef.current = scanner;
      void scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (text) => {
            const kode = text.trim().toUpperCase();
            const cocok = roster.find((w) => w.kode.toUpperCase() === kode);
            if (cocok) pickRef.current(cocok);
            else setError(`Kode ${kode} tidak ada di daftar siswa.`);
          },
          () => {},
        )
        .catch(() =>
          setError(
            "Kamera tidak dapat diakses. Buka via HTTPS dan izinkan kamera.",
          ),
        );
    },
    [roster],
  );

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Scan QR siswa"
      description="Arahkan kamera ke QR tiket siswa"
    >
      {/* ponytail: container selalu ter-render dgn ukuran nyata (lihat scanner). */}
      <div className="relative w-full overflow-hidden rounded-lg bg-black">
        <div
          id="qr-nilai"
          ref={attach}
          className="w-full"
          style={{ aspectRatio: "4 / 3", minHeight: 220 }}
        />
      </div>
      {error ? (
        <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}

/** Panel inline soal (kiri) + penilaian (kanan) — bukan popup.
 * Menumpuk 1 kolom di HP, 2 kolom di desktop. */
function PenilaianPanel({
  siswa,
  materiId,
  jadwalLabel,
  existing,
  gformUrl,
  gformQr,
  onClose,
  onSaved,
}: {
  siswa: RosterSiswa;
  materiId: string;
  jadwalLabel: string;
  existing?: string;
  gformUrl: string;
  gformQr: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [skor, setSkor] = useState(existing ?? "");
  const [busy, setBusy] = useState(false);
  const kind = nilaiKindFor(materiId, siswa.jenjang);
  const soal = soalFor(materiId, siswa.jenjang);

  const simpan = async (value: string) => {
    if (!value.trim()) {
      toast.error(
        kind === "catatan"
          ? "Isi catatan terlebih dahulu."
          : "Isi skor terlebih dahulu.",
      );
      return;
    }
    setBusy(true);
    try {
      await saveNilaiFn({ data: { materiId, siswaId: siswa.id, skor: value } });
      toast.success(
        kind === "selesai"
          ? `${siswa.nama} ditandai sudah ujian.`
          : `Nilai ${siswa.nama} tersimpan.`,
      );
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Soal — {jadwalLabel}</CardTitle>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </CardHeader>
        <CardContent>
          {soal?.kind === "pdf" && soal.src ? (
            <iframe
              src={soal.src}
              title={`Soal ${jadwalLabel}`}
              className="h-[60vh] w-full rounded-md border lg:h-[70vh]"
            />
          ) : soal?.kind === "form" ? (
            gformQr ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <img
                  src={gformQr}
                  alt="QR Google Form Math"
                  className="size-48 rounded-lg border sm:size-64"
                />
                <p className="text-sm text-muted-foreground">
                  Scan QR untuk membuka Google Form Math
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(gformUrl, "_blank", "noopener")}
                >
                  Buka Google Form
                </Button>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                URL Google Form belum diisi admin (CMS → URL Google Form Math).
              </p>
            )
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {soal?.note ?? "Tidak ada berkas soal untuk materi/jenjang ini."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{siswa.nama}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {siswa.kode} · {siswa.kelasTujuan} · {siswa.jenjang}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {kind === "skor" ? (
            <>
              <div>
                <label
                  htmlFor="skor"
                  className="mb-1 block text-sm font-medium"
                >
                  Skor (0–100)
                </label>
                <Input
                  id="skor"
                  inputMode="decimal"
                  placeholder="mis. 85"
                  value={skor}
                  onChange={(e) => setSkor(e.target.value)}
                />
                {existing && existing !== NILAI_SELESAI ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tersimpan: {existing}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                onClick={() => void simpan(skor)}
                disabled={busy}
              >
                {busy ? "Menyimpan…" : "Simpan nilai"}
              </Button>
            </>
          ) : kind === "selesai" ? (
            existing === NILAI_SELESAI ? (
              <Badge variant="success" className="w-fit">
                ✓ Sudah ujian via Google Form
              </Badge>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Siswa mengerjakan Math via Google Form — tandai bila sudah
                  selesai.
                </p>
                <Button
                  type="button"
                  onClick={() => void simpan(NILAI_SELESAI)}
                  disabled={busy}
                >
                  {busy ? "Menyimpan…" : "Tandai sudah ujian"}
                </Button>
              </>
            )
          ) : (
            <>
              <div>
                <label
                  htmlFor="catatan"
                  className="mb-1 block text-sm font-medium"
                >
                  Catatan penguji
                </label>
                <Textarea
                  id="catatan"
                  rows={5}
                  placeholder="Tulis hasil wawancara orangtua…"
                  value={skor}
                  onChange={(e) => setSkor(e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={() => void simpan(skor)}
                disabled={busy}
              >
                {busy ? "Menyimpan…" : "Simpan catatan"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
