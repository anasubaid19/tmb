import { Camera01Icon } from "@hugeicons/core-free-icons";
import {
  createFileRoute,
  type ErrorComponentProps,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { Html5Qrcode } from "html5-qrcode";
import { useCallback, useMemo, useRef, useState } from "react";
import { LogoutButton } from "#/components/auth-ui";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
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
import { sessionFnOr } from "#/lib/auth";
import { getPengujiDashboardFn, type RosterSiswa } from "#/lib/penguji";
import { NILAI_SELESAI, nilaiKindFor } from "#/lib/soal";

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
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cabangId, setCabangId] = useState("");
  const [sort, setSort] = useState<"nama" | "kode">("nama");
  const [scan, setScan] = useState(false);

  // ponytail: tanpa pilih jadwal & tanpa filter kelas — konteks = jadwal
  // pertama, roster = semua siswa (penguji menguji semua siswa).
  const jadwal = data.jadwal[0];

  // ponytail: semua penilaian lewat halaman khusus (soal + aspek + tombol
  // kembali); panel inline dihapus.
  const bukaSiswa = (w: RosterSiswa): void => {
    void navigate({
      to: "/penguji/nilai/$siswaId",
      params: { siswaId: w.id },
    });
  };

  const roster = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = data.roster.filter((w) => {
      if (cabangId && w.cabangId !== cabangId) return false;
      if (q && !`${w.nama} ${w.kode}`.toLowerCase().includes(q)) return false;
      return true;
    });
    // ponytail: filter() selalu array baru — aman di-sort langsung.
    rows.sort((a, b) =>
      sort === "kode"
        ? a.kode.localeCompare(b.kode, "id", { numeric: true })
        : a.nama.localeCompare(b.nama, "id"),
    );
    return rows;
  }, [data.roster, cabangId, query, sort]);

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
          {[
            data.tugasRuang && `Ruang ${data.tugasRuang}`,
            data.tugasSesi,
          ].filter(Boolean).length > 0 ? (
            <p className="mt-1 text-sm font-medium tabular-nums">
              {[data.tugasRuang && `Ruang ${data.tugasRuang}`, data.tugasSesi]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Plotting ruang & sesi belum diisi, hubungi admin.
            </p>
          )}
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
          {jadwal?.materiDeskripsi ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm">
              <span className="font-semibold">Bahan: </span>
              {jadwal.materiDeskripsi}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground tabular-nums">
            {dinilai}/{roster.length} siswa dinilai
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Cari nama / kode siswa…"
              aria-label="Cari nama atau kode siswa"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select
              value={cabangId}
              onValueChange={(v) => setCabangId(v ?? "")}
            >
              {" "}
              <SelectTrigger
                aria-label="Filter cabang"
                className="sm:max-w-96 sm:flex-1"
              >
                {/* ponytail: label dari map sendiri — Value bawaan hanya
                    menampilkan nilai mentah (id) sampai popup dibuka. */}
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
            <Select
              value={sort}
              onValueChange={(v) => setSort(v === "kode" ? "kode" : "nama")}
            >
              <SelectTrigger
                aria-label="Urutkan daftar"
                className="sm:max-w-48"
              >
                <SelectValue>
                  {(v: string | null) =>
                    v === "kode" ? "No. urut (kode)" : "Alfabet (nama)"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nama">Alfabet (nama)</SelectItem>
                <SelectItem value="kode">No. urut (kode)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
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
                      <TableHead className="w-10">No</TableHead>
                      <TableHead className="whitespace-normal">Siswa</TableHead>
                      <TableHead>Ruang</TableHead>
                      <TableHead>Hadir</TableHead>
                      <TableHead className="text-right">Skor</TableHead>
                      <TableHead className="sticky right-0 bg-card text-right">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.map((w, i) => {
                      const n = jadwal
                        ? data.nilai[`${jadwal.materiId}__${w.id}`]
                        : undefined;
                      const kind = jadwal
                        ? nilaiKindFor(jadwal.materiId, w.jenjang)
                        : "skor";
                      return (
                        <TableRow key={w.id}>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {i + 1}
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            <p className="font-medium">{w.nama}</p>
                            <p className="text-xs text-muted-foreground">
                              {w.kode} · {w.kelasTujuan}
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
                            {/* ponytail: hijau (success) khusus status
                                kelulusan ujian; kehadiran pakai primer agar
                                satu warna = satu makna. */}
                            <Badge variant={w.hadir ? "default" : "secondary"}>
                              {w.hadir ? "Hadir" : "Belum"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {n === NILAI_SELESAI ? "✓" : n || "-"}
                          </TableCell>
                          <TableCell className="sticky right-0 bg-card text-right">
                            <Button
                              type="button"
                              variant={n ? "outline" : "default"}
                              onClick={() => bukaSiswa(w)}
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
            bukaSiswa(w);
          }}
          onClose={() => setScan(false)}
        />
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
