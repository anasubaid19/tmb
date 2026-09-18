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
import { PenilaianPanel } from "#/components/penilaian-panel";
import { AspekBlok, SantriFields } from "#/components/santri-aspek";
import { SoalMarkdown } from "#/components/soal-markdown";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { sessionFnOr } from "#/lib/auth";
import {
  ASPEK_ENGLISH,
  gradeEnglish,
  isAspekJenjang,
  isAspekValid,
} from "#/lib/nilai-english";
import { getNilaiSiswaFn, saveAspekFn } from "#/lib/penguji";
import { soalFor } from "#/lib/soal";

export const Route = createFileRoute("/penguji/nilai/$siswaId")({
  beforeLoad: async () => {
    const s = await sessionFnOr({ data: { role: "penguji" } });
    if (s?.role !== "penguji") throw redirect({ to: "/penguji/login" });
    return { session: s };
  },
  loader: async ({ params }) => getNilaiSiswaFn({ data: params }),
  pendingComponent: NilaiPending,
  errorComponent: NilaiError,
  component: NilaiPage,
});

function NilaiPending() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <p className="text-sm text-muted-foreground">Memuat data penilaian…</p>
    </main>
  );
}

function NilaiError({ error }: ErrorComponentProps) {
  const navigate = useNavigate();
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Gagal memuat."}
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigate({ to: "/penguji" })}
        >
          ← Kembali
        </Button>
      </div>
    </main>
  );
}

function NilaiPage() {
  const siswa = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const soal = soalFor("M2", siswa.jenjang);
  // ponytail: aspek English+santri hanya M2 + SMP/SMA; materi lain memakai
  // panel generik yang sama (soal + input + aspek Arab/Ortu + Mushaf).
  const aspekM2 = siswa.materiId === "M2" && isAspekJenjang(siswa.jenjang);

  // ponytail: kembali ke riwayat bila datang dari roster; fallback dasbor.
  const kembali = (): void => {
    if (window.history.length > 1) window.history.back();
    else void navigate({ to: "/penguji" });
  };

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" onClick={kembali}>
          ← Kembali
        </Button>
        <LogoutButton variant="ghost" />
      </div>
      <div>
        <h1 className="text-xl font-bold">{siswa.nama}</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {siswa.kode} · {siswa.jenjang}
          {siswa.ruangTes ? ` · Ruang ${siswa.ruangTes}` : ""}
          {siswa.sesi ? ` · ${siswa.sesi}` : ""}
        </p>
      </div>

      {aspekM2 ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Soal English — {siswa.jenjang}
              </CardTitle>{" "}
              {soal?.pdfDownload ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    window.open(soal.pdfDownload, "_blank", "noopener")
                  }
                >
                  Unduh PDF
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {soal?.kind === "md" && soal.src ? (
                <SoalMarkdown
                  src={soal.src}
                  title={`Soal English ${siswa.jenjang}`}
                />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {soal?.note ?? "Tidak ada soal untuk jenjang ini."}
                </p>
              )}
            </CardContent>
          </Card>
          <AspekForm
            siswaId={siswa.id}
            awalEnglish={siswa.english}
            awalSantri={siswa.santri}
          />
        </>
      ) : siswa.materiId === "M2" ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Jenjang SD hanya tes Calistung (soal cetak di meja) + interview
            orangtua — tidak ada penilaian English di sini.
          </CardContent>
        </Card>
      ) : (
        <PenilaianPanel
          siswa={{
            id: siswa.id,
            kode: siswa.kode,
            nama: siswa.nama,
            jenjang: siswa.jenjang,
            kelasTujuan: siswa.kelasTujuan,
          }}
          materiId={siswa.materiId}
          jadwalLabel={`${siswa.materiNama} · ${siswa.kelasLabel}`}
          existing={siswa.existingNilai}
          gformUrl={siswa.gformUrl}
          gformQr={siswa.gformQr}
          onSaved={() => {
            void router.invalidate();
          }}
        />
      )}
    </main>
  );
}

function AspekForm({
  siswaId,
  awalEnglish,
  awalSantri,
}: {
  siswaId: string;
  awalEnglish: [string, string, string, string];
  awalSantri: [string, string, string, string];
}) {
  const [english, setEnglish] = useState<string[]>([...awalEnglish]);
  const [santri, setSantri] = useState<string[]>([...awalSantri]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const valid = useMemo(
    () => [...english, ...santri].every((v) => v === "" || isAspekValid(v)),
    [english, santri],
  );
  const lengkap = [...english, ...santri].every(
    (v) => v !== "" && isAspekValid(v),
  );

  const simpan = async (): Promise<void> => {
    if (!lengkap) {
      setError("Isi kedelapan aspek dengan angka 1–5.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const r = await saveAspekFn({
        data: {
          siswaId,
          english_fluency: english[0],
          english_vocab: english[1],
          english_critical: english[2],
          english_expression: english[3],
          santri_sholat: santri[0],
          santri_quran: santri[1],
          santri_mapel: santri[2],
          santri_ortu: santri[3],
        },
      });
      toast.success(
        `Tersimpan: English ${r.totalEnglish} (${gradeEnglish(r.totalEnglish)}), santri ${r.totalSantri} (${gradeEnglish(r.totalSantri)}).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <AspekBlok
        judul="English (4 aspek)"
        defs={ASPEK_ENGLISH}
        nilai={english}
        setNilai={setEnglish}
      />
      <SantriFields nilai={santri} setNilai={setSantri} />
      {!valid ? (
        <p className="text-sm text-destructive">
          Aspek diisi angka 1–5 (atau dikosongkan bila belum dinilai).
        </p>
      ) : null}
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
        {busy ? "Menyimpan…" : "Simpan nilai"}
      </Button>
    </div>
  );
}
