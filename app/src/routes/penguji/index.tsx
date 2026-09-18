import { Camera01Icon } from "@hugeicons/core-free-icons";
import {
  createFileRoute,
  type ErrorComponentProps,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { Html5Qrcode } from "html5-qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LogoutButton } from "#/components/auth-ui";
import { SoalMarkdown } from "#/components/soal-markdown";
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
  ASPEK_ARAB,
  gradeArab,
  gradeArabLabel,
  isArabJenjang,
} from "#/lib/nilai-arabic";
import { isAspekJenjang } from "#/lib/nilai-english";
import { ASPEK_ORTU, gradeOrtu, gradeOrtuLabel } from "#/lib/nilai-ortu";
import {
  getArabAspekFn,
  getOrtuAspekFn,
  getPengujiDashboardFn,
  type RosterSiswa,
  saveArabFn,
  saveNilaiFn,
  saveOrtuFn,
} from "#/lib/penguji";
import {
  bacaSurahFn,
  daftarSurahFn,
  type SurahArab,
  type SurahInfo,
} from "#/lib/quran";
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
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cabangId, setCabangId] = useState("");
  const [sort, setSort] = useState<"nama" | "kode">("nama");
  const [aktif, setAktif] = useState<RosterSiswa | null>(null);
  const [scan, setScan] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // ponytail: panel inline (bukan popup) — scroll ke panel saat siswa dipilih.
  // Fokus ikut dipindah agar SR mengumumkan panel; gerak smooth dimatikan
  // bila pengguna memilih reduced-motion.
  useEffect(() => {
    if (!aktif) return;
    const el = panelRef.current;
    if (!el) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  }, [aktif]);

  // ponytail: tanpa pilih jadwal & tanpa filter kelas — konteks = jadwal
  // pertama, roster = semua siswa (penguji menguji semua siswa).
  const jadwal = data.jadwal[0];

  // ponytail: M2 (English+santri, SMP/SMA) dinilai di halaman khusus;
  // SD + materi lain tetap panel inline.
  const bukaSiswa = (w: RosterSiswa): void => {
    if (jadwal?.materiId === "M2" && isAspekJenjang(w.jenjang)) {
      void navigate({
        to: "/penguji/nilai/$siswaId",
        params: { siswaId: w.id },
      });
    } else {
      setAktif(w);
    }
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

          {aktif && jadwal ? (
            <div
              ref={panelRef}
              tabIndex={-1}
              className="scroll-mt-4 outline-none"
            >
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

/** 4 aspek Arab 1–25 + total jumlah & grade otomatis (M3, SMP/SMA). */
function ArabAspek({ siswaId }: { siswaId: string }) {
  const [nilai, setNilai] = useState<string[]>(["", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let hidup = true;
    setNilai(["", "", "", ""]);
    getArabAspekFn({ data: { siswaId } })
      .then((v) => {
        if (hidup) setNilai(v);
      })
      .catch(() => {});
    return () => {
      hidup = false;
    };
  }, [siswaId]);

  const angka = nilai.map(Number);
  const lengkap = angka.every((n) => Number.isInteger(n) && n >= 1 && n <= 25);
  const total = lengkap ? angka.reduce((a, b) => a + b, 0) : null;

  const simpan = async (): Promise<void> => {
    if (!lengkap) {
      setError("Isi keempat aspek dengan angka 1–25.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const r = await saveArabFn({
        data: {
          siswaId,
          pd: nilai[0],
          kelancaran: nilai[1],
          kejelasan: nilai[2],
          adab: nilai[3],
        },
      });
      toast.success(
        `Tersimpan: total ${r.total} (${gradeArabLabel(gradeArab(r.total))}).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Aspek Arab (1–25)</p>
        {total !== null ? (
          <p className="text-sm font-semibold tabular-nums">
            Total {total} · {gradeArab(total)} (
            {gradeArabLabel(gradeArab(total))})
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {ASPEK_ARAB.map((d, i) => (
          <div key={d.key}>
            <label
              htmlFor={`arab-${d.key}`}
              className="mb-1 block text-xs font-medium"
            >
              {d.label}
            </label>
            <Input
              id={`arab-${d.key}`}
              inputMode="decimal"
              placeholder="1–25"
              value={nilai[i]}
              onChange={(e) =>
                setNilai(nilai.map((v, j) => (j === i ? e.target.value : v)))
              }
            />
          </div>
        ))}
      </div>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={busy || !lengkap}
        onClick={() => void simpan()}
        className="mt-2"
      >
        {busy ? "Menyimpan…" : "Simpan aspek"}
      </Button>
    </div>
  );
}

/** 5 aspek interview orang tua + total & grade otomatis (M5, semua jenjang).
 *  Catatan bebas tetap di field terpisah (kolom nilai_ortu tak disentuh). */
function OrtuAspek({ siswaId }: { siswaId: string }) {
  const [nilai, setNilai] = useState<string[]>(["", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let hidup = true;
    setNilai(["", "", "", "", ""]);
    getOrtuAspekFn({ data: { siswaId } })
      .then((v) => {
        if (hidup) setNilai(v);
      })
      .catch(() => {});
    return () => {
      hidup = false;
    };
  }, [siswaId]);

  const angka = nilai.map(Number);
  const lengkap = angka.every((n) => Number.isInteger(n) && n >= 1 && n <= 5);
  const total = lengkap ? angka.reduce((a, b) => a + b, 0) : null;

  const simpan = async (): Promise<void> => {
    if (!lengkap) {
      setError("Isi kelima aspek dengan angka 1–5.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const r = await saveOrtuFn({
        data: {
          siswaId,
          ibadah: nilai[0],
          akhlak: nilai[1],
          polaasuh: nilai[2],
          belajar: nilai[3],
          gadget: nilai[4],
        },
      });
      toast.success(
        `Tersimpan: total ${r.total} (${gradeOrtuLabel(gradeOrtu(r.total))}).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Aspek interview</p>
        {total !== null ? (
          <p className="text-sm font-semibold tabular-nums">
            Total {total} · {gradeOrtu(total)} (
            {gradeOrtuLabel(gradeOrtu(total))})
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {ASPEK_ORTU.map((d, i) => (
          <div key={d.key}>
            <label
              htmlFor={`ortu-${d.key}`}
              className="mb-1 block text-xs font-medium"
            >
              {d.label}
            </label>
            <Input
              id={`ortu-${d.key}`}
              inputMode="numeric"
              placeholder="1–5"
              value={nilai[i]}
              onChange={(e) =>
                setNilai(nilai.map((v, j) => (j === i ? e.target.value : v)))
              }
            />
          </div>
        ))}
      </div>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={busy || !lengkap}
        onClick={() => void simpan()}
        className="mt-2"
      >
        {busy ? "Menyimpan…" : "Simpan aspek"}
      </Button>
    </div>
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
  const [mushaf, setMushaf] = useState(false);
  const kind = nilaiKindFor(materiId, siswa.jenjang);
  const soal = soalFor(materiId, siswa.jenjang);
  const isQuran = materiId.trim().toUpperCase() === "M4";

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
          {soal?.kind === "md" && soal.src ? (
            <SoalMarkdown src={soal.src} title={`Soal ${jadwalLabel}`} />
          ) : soal?.kind === "pdf" && soal.src ? (
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
          ) : isQuran && mushaf ? (
            <MushafPanel />
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
          {/* ponytail: M2 + SD tak punya tes English — aturan SD hanya
              Calistung + interview orangtua. */}
          {kind === "skor" &&
          materiId === "M2" &&
          !isAspekJenjang(siswa.jenjang) ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Jenjang SD hanya tes Calistung + interview orangtua.
            </p>
          ) : kind === "skor" && materiId === "M3" ? (
            isArabJenjang(siswa.jenjang) ? (
              <ArabAspek siswaId={siswa.id} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Tes Arab hanya untuk SMP/SMA.
              </p>
            )
          ) : kind === "skor" ? (
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
              <div className="sticky bottom-0 flex gap-2 bg-card pt-2">
                <Button
                  type="button"
                  onClick={() => void simpan(skor)}
                  disabled={busy}
                  className="flex-1"
                >
                  {busy ? "Menyimpan…" : "Simpan nilai"}
                </Button>
                {isQuran ? (
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={mushaf}
                    onClick={() => setMushaf((v) => !v)}
                  >
                    {mushaf ? "Tutup Mushaf" : "Buka Mushaf"}
                  </Button>
                ) : null}
              </div>
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
              {materiId === "M5" ? <OrtuAspek siswaId={siswa.id} /> : null}
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

/** Mushaf inline (Arab saja) — tampil di kartu Soal untuk materi Quran (M4),
 * dimuat hanya saat dibuka agar tak menambah request di halaman roster. */
function MushafPanel() {
  const [daftar, setDaftar] = useState<SurahInfo[]>([]);
  const [no, setNo] = useState("1");
  const [surah, setSurah] = useState<SurahArab | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    daftarSurahFn()
      .then(setDaftar)
      .catch(() => setError("Gagal memuat daftar surah."));
  }, []);

  useEffect(() => {
    if (!no) return;
    setLoading(true);
    setError("");
    bacaSurahFn({ data: { no: Number(no) } })
      .then(setSurah)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Gagal memuat surah."),
      )
      .finally(() => setLoading(false));
  }, [no]);

  const aktif = daftar.find((s) => String(s.no) === no);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium">
          {surah ? `Mushaf — ${surah.no}. ${surah.nama}` : "Mushaf"}
        </p>
        <p className="text-xs text-muted-foreground">
          Teks Arab dari UmmahAPI (tanpa terjemahan)
        </p>
      </div>
      <Select value={no} onValueChange={(v) => setNo(v ?? "1")}>
        <SelectTrigger aria-label="Pilih surah">
          <SelectValue placeholder="Pilih surah" />
        </SelectTrigger>
        <SelectContent>
          {daftar.map((s) => (
            <SelectItem key={s.no} value={String(s.no)}>
              {s.no}. {s.nama}
              {s.namaArab ? ` · ${s.namaArab}` : ""} ({s.totalAyah} ayat)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Memuat surah…
        </p>
      ) : surah ? (
        <div className="max-h-[60vh] space-y-5 overflow-y-auto lg:max-h-[70vh]">
          {aktif?.namaArab ? (
            <p dir="rtl" lang="ar" className="text-center text-2xl">
              {aktif.namaArab}
            </p>
          ) : null}
          {surah.ayat.map((a) => (
            <div key={a.nomor} className="flex flex-col gap-1">
              <p
                dir="rtl"
                lang="ar"
                className="text-right text-xl leading-loose"
              >
                {a.arab}
              </p>
              <p className="text-right text-xs text-muted-foreground">
                Ayat {a.nomor}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
