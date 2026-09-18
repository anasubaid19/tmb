import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SoalMarkdown } from "#/components/soal-markdown";
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
import { Textarea } from "#/components/ui/textarea";
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

/** Panel soal + penilaian — dipakai halaman nilai per siswa (semua materi).
 *  Menumpuk 1 kolom di HP, 2 kolom di desktop. */
export function PenilaianPanel({
  siswa,
  materiId,
  jadwalLabel,
  existing,
  gformUrl,
  gformQr,
  onClose,
  onSaved,
}: {
  siswa: Pick<RosterSiswa, "id" | "kode" | "nama" | "jenjang" | "kelasTujuan">;
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
