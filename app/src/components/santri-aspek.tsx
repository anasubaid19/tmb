import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SoalMarkdown } from "#/components/soal-markdown";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import {
  ASPEK_SANTRI,
  type AspekDef,
  gradeEnglish,
  gradeLabel,
} from "#/lib/nilai-english";
import { getSantriAspekFn, saveSantriFn } from "#/lib/penguji";

/** Blok input aspek generik (dipakai English + santri). */
export function AspekBlok({
  judul,
  defs,
  nilai,
  setNilai,
}: {
  judul: string;
  defs: AspekDef[];
  nilai: string[];
  setNilai: (v: string[]) => void;
}) {
  const angka = nilai.map((v) => Number(v));
  const lengkap = angka.every((n) => Number.isInteger(n) && n >= 1 && n <= 5);
  const total = lengkap ? angka.reduce((a, b) => a + b, 0) : null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{judul}</CardTitle>
        {total !== null ? (
          <p className="text-sm font-semibold tabular-nums">
            Total {total} · {gradeEnglish(total)} (
            {gradeLabel(gradeEnglish(total))})
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {defs.map((d, i) => (
          <div key={d.key}>
            <label
              htmlFor={`aspek-${d.key}`}
              className="mb-1 block text-sm font-medium"
            >
              {d.label}
            </label>
            <Input
              id={`aspek-${d.key}`}
              name={d.key}
              inputMode="numeric"
              placeholder="1–5"
              defaultValue={nilai[i]}
              onChange={(e) =>
                setNilai(nilai.map((v, j) => (j === i ? e.target.value : v)))
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Kartu pertanyaan + input 4 aspek santri (controlled, tanpa tombol simpan).
 * Dipakai alur English (M2) — penyimpanan ikut save induk.
 * ponytail: soal opsional (default tertutup) — begitu dibuka, field nilai ikut
 * tampil; tertutup = keduanya tersembunyi.
 */
export function SantriFields({
  nilai,
  setNilai,
  lihat,
  onToggle,
}: {
  nilai: string[];
  setNilai: (v: string[]) => void;
  lihat: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">
            Pertanyaan interview santri
          </CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={onToggle}>
            {lihat ? "Sembunyikan soal" : "Soal santri (opsional)"}
          </Button>
        </CardHeader>
        {lihat ? (
          <CardContent>
            <SoalMarkdown
              src="/soal/santri.md"
              title="Pertanyaan interview santri"
            />
          </CardContent>
        ) : null}
      </Card>
      {lihat ? (
        <AspekBlok
          judul="Interview santri (4 aspek)"
          defs={ASPEK_SANTRI}
          nilai={nilai}
          setNilai={setNilai}
        />
      ) : null}
    </>
  );
}

/**
 * Interview santri mandiri (pertanyaan + 4 aspek + simpan sendiri).
 * Dipakai alur Arabic (M3). Nilai tersimpan di kolom nilai_santri_*
 * yang sama dengan English — satu interview per siswa.
 */
export function SantriAspek({ siswaId }: { siswaId: string }) {
  const [nilai, setNilai] = useState<string[]>(["", "", "", ""]);
  const [lihat, setLihat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let hidup = true;
    setNilai(["", "", "", ""]);
    getSantriAspekFn({ data: { siswaId } })
      .then((v) => {
        if (hidup) setNilai(v);
      })
      .catch(() => {});
    return () => {
      hidup = false;
    };
  }, [siswaId]);

  const lengkap =
    nilai.every((v) => v !== "") &&
    nilai.map(Number).every((n) => Number.isInteger(n) && n >= 1 && n <= 5);

  const simpan = async (): Promise<void> => {
    if (!lengkap) {
      setError("Isi keempat aspek santri dengan angka 1–5.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const r = await saveSantriFn({
        data: {
          siswaId,
          santri_sholat: nilai[0],
          santri_quran: nilai[1],
          santri_mapel: nilai[2],
          santri_ortu: nilai[3],
        },
      });
      toast.success(
        `Santri tersimpan: ${r.totalSantri} (${gradeEnglish(r.totalSantri)}).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <SantriFields
        nilai={nilai}
        setNilai={setNilai}
        lihat={lihat}
        onToggle={() => setLihat((v) => !v)}
      />
      {lihat ? (
        <>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            disabled={busy || !lengkap}
            onClick={() => void simpan()}
          >
            {busy ? "Menyimpan…" : "Simpan santri"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
