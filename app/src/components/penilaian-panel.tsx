import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SantriAspek } from "#/components/santri-aspek";
import { SoalMarkdown } from "#/components/soal-markdown";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import {
  ASPEK_ARAB,
  gradeArab,
  gradeArabLabel,
  isArabJenjang,
} from "#/lib/nilai-arabic";
import {
  ASPEK_CALISTUNG,
  gradeCalistung,
  gradeCalistungLabel,
} from "#/lib/nilai-calistung";
import { isAspekJenjang } from "#/lib/nilai-english";
import { ASPEK_ORTU, gradeOrtu, gradeOrtuLabel } from "#/lib/nilai-ortu";
import {
  ASPEK_QURAN,
  gradeQuran,
  gradeQuranLabel,
  isQuranJenjang,
} from "#/lib/nilai-quran";
import {
  getArabAspekFn,
  getCalistungAspekFn,
  getOrtuAspekFn,
  getQuranAspekFn,
  type RosterSiswa,
  saveArabFn,
  saveCalistungFn,
  saveNilaiFn,
  saveOrtuFn,
  saveQuranFn,
} from "#/lib/penguji";
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

/** 3 aspek Calistung SD 1–20 + rata-rata & grade otomatis (M1, SD saja). */
function CalistungAspek({ siswaId }: { siswaId: string }) {
  const [nilai, setNilai] = useState<string[]>(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let hidup = true;
    setNilai(["", "", ""]);
    getCalistungAspekFn({ data: { siswaId } })
      .then((v) => {
        if (hidup) setNilai(v);
      })
      .catch(() => {});
    return () => {
      hidup = false;
    };
  }, [siswaId]);

  const angka = nilai.map(Number);
  const lengkap = angka.every((n) => Number.isInteger(n) && n >= 1 && n <= 20);
  const rata = lengkap
    ? Math.round((angka.reduce((a, b) => a + b, 0) / 3) * 100) / 100
    : null;

  const simpan = async (): Promise<void> => {
    if (!lengkap) {
      setError("Isi ketiga aspek dengan angka 1–20.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const r = await saveCalistungFn({
        data: {
          siswaId,
          membaca: nilai[0],
          menulis: nilai[1],
          menghitung: nilai[2],
        },
      });
      toast.success(
        `Tersimpan: rata-rata ${r.total} (${gradeCalistungLabel(gradeCalistung(r.total))}).`,
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
        <p className="text-sm font-semibold">Aspek Calistung (1–20)</p>
        {rata !== null ? (
          <p className="text-sm font-semibold tabular-nums">
            Rata-rata {rata} · {gradeCalistung(rata)} (
            {gradeCalistungLabel(gradeCalistung(rata))})
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        {ASPEK_CALISTUNG.map((d, i) => (
          <div key={d.key}>
            <label
              htmlFor={`calistung-${d.key}`}
              className="mb-1 block text-xs font-medium"
            >
              {d.label}
            </label>
            <Input
              id={`calistung-${d.key}`}
              inputMode="decimal"
              placeholder="1–20"
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

/** 3 aspek Quran 1–100 + rata-rata & grade otomatis (M4, SMP/SMA). */
function QuranAspek({ siswaId }: { siswaId: string }) {
  const [nilai, setNilai] = useState<string[]>(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let hidup = true;
    setNilai(["", "", ""]);
    getQuranAspekFn({ data: { siswaId } })
      .then((v) => {
        if (hidup) setNilai(v);
      })
      .catch(() => {});
    return () => {
      hidup = false;
    };
  }, [siswaId]);

  const angka = nilai.map(Number);
  const lengkap = angka.every((n) => Number.isFinite(n) && n >= 1 && n <= 100);
  const rata = lengkap
    ? Math.round((angka.reduce((a, b) => a + b, 0) / 3) * 100) / 100
    : null;

  const simpan = async (): Promise<void> => {
    if (!lengkap) {
      setError("Isi ketiga aspek dengan angka 1–100.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const r = await saveQuranFn({
        data: {
          siswaId,
          makharij: nilai[0],
          sifat: nilai[1],
          lancar: nilai[2],
        },
      });
      toast.success(
        `Tersimpan: rata-rata ${r.total} (${gradeQuranLabel(gradeQuran(r.total))}).`,
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
        <p className="text-sm font-semibold">Aspek Quran (1–100)</p>
        {rata !== null ? (
          <p className="text-sm font-semibold tabular-nums">
            Rata-rata {rata} · {gradeQuran(rata)} (
            {gradeQuranLabel(gradeQuran(rata))})
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        {ASPEK_QURAN.map((d, i) => (
          <div key={d.key}>
            <label
              htmlFor={`quran-${d.key}`}
              className="mb-1 block text-xs font-medium"
            >
              {d.label}
            </label>
            <Input
              id={`quran-${d.key}`}
              inputMode="decimal"
              placeholder="1–100"
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
  onSaved,
}: {
  siswa: Pick<RosterSiswa, "id" | "kode" | "nama" | "jenjang" | "kelasTujuan">;
  materiId: string;
  jadwalLabel: string;
  existing?: string;
  gformUrl: string;
  gformQr: string;
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
        <CardHeader>
          <CardTitle className="text-base">Soal — {jadwalLabel}</CardTitle>
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
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {soal?.note ?? "Tidak ada berkas soal untuk materi/jenjang ini."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Penilaian</CardTitle>
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
              <div className="space-y-4">
                <ArabAspek siswaId={siswa.id} />
                <SantriAspek siswaId={siswa.id} />
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Tes Arab hanya untuk SMP/SMA.
              </p>
            )
          ) : kind === "skor" && materiId === "M1" ? (
            siswa.jenjang.trim().toUpperCase() === "SD" ? (
              <CalistungAspek siswaId={siswa.id} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Tes Calistung hanya untuk SD.
              </p>
            )
          ) : kind === "skor" && materiId === "M4" ? (
            isQuranJenjang(siswa.jenjang) ? (
              <QuranAspek siswaId={siswa.id} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Tes Quran hanya untuk SMP/SMA.
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
