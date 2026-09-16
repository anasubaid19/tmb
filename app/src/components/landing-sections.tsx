import {
  BookOpen01Icon,
  Calendar03Icon,
  Location01Icon,
  Megaphone01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useMemo } from "react";
import { DenahPlan } from "#/components/denah-plan";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Icon } from "#/components/ui/icon";
import type { PengumumanData, SiteData } from "#/lib/site";

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: IconSvgElement;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-4 flex items-center gap-2 text-balance text-xl font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon icon={icon} size={18} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function JadwalSection({
  data,
  compact = false,
}: {
  data: SiteData;
  /** landing umum (?cabang= kosong): hanya Tanggal + Sesi, tanpa detail. */
  compact?: boolean;
}) {
  // ponytail: compact = skema kanonik dari tabel `sesi` (Sesi 1–3 + jenjang +
  // waktu), bukan baris jadwal (Sesi 3 tak punya baris jadwal). Tanggal tampil
  // sekali di atas, diambil dari baris jadwal yang ada.
  const tanggalUnik = compact
    ? [...new Set(data.jadwal.map((j) => j.tanggal))].filter(Boolean)
    : [];
  const rows = compact ? [] : data.jadwal;
  const heads = compact
    ? ["Sesi", "Jenjang", "Waktu"]
    : ["Tanggal", "Sesi", "Materi", "Kelas", "Ruang", "Penguji"];
  return (
    <Section id="jadwal" title="Jadwal Ujian" icon={Calendar03Icon}>
      {data.jadwal.length === 0 ? (
        <p className="text-pretty text-sm text-muted-foreground">
          Jadwal belum dipublikasikan.
        </p>
      ) : (
        <>
          {compact && tanggalUnik.length > 0 ? (
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              {tanggalUnik.join(" · ")}
            </p>
          ) : null}
          {/* ponytail: mobile = kartu tumpuk (tabel 6 kolom terjepit di HP);
          tabel hanya sm ke atas. */}
          <div className="flex flex-col gap-3 sm:hidden">
            {compact
              ? data.sesi.map((s) => (
                  <Card key={s.sesi}>
                    <CardContent className="space-y-1 pt-6 text-sm">
                      <p className="font-semibold">
                        {s.sesi} · {s.jenjang}
                      </p>
                      <p className="text-muted-foreground">{s.waktu}</p>
                    </CardContent>
                  </Card>
                ))
              : rows.map((j) => (
                  <Card key={j.id}>
                    <CardContent className="space-y-1 pt-6 text-sm">
                      <p className="font-semibold">
                        {j.materi} · {j.kelas}
                      </p>
                      <p className="text-muted-foreground">
                        {j.tanggal} · {j.sesi}
                      </p>
                      <p className="text-muted-foreground">
                        Ruang {j.ruang} · {j.penguji}
                      </p>
                    </CardContent>
                  </Card>
                ))}
          </div>
          <Card className="hidden sm:block">
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground">
                    {heads.map((h) => (
                      <th key={h} className="px-4 py-2.5 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compact
                    ? data.sesi.map((s) => (
                        <tr key={s.sesi} className="border-b last:border-0">
                          <td className="px-4 py-2.5 font-medium">{s.sesi}</td>
                          <td className="px-4 py-2.5">{s.jenjang}</td>
                          <td className="px-4 py-2.5">{s.waktu}</td>
                        </tr>
                      ))
                    : rows.map((j) => (
                        <tr key={j.id} className="border-b last:border-0">
                          <td className="px-4 py-2.5 font-medium">
                            {j.tanggal}
                          </td>
                          <td className="px-4 py-2.5">{j.sesi}</td>
                          <td className="px-4 py-2.5">{j.materi}</td>
                          <td className="px-4 py-2.5">{j.kelas}</td>
                          <td className="px-4 py-2.5">{j.ruang}</td>
                          <td className="px-4 py-2.5">{j.penguji}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </Section>
  );
}

/** Kelas pindahan = rentang (mis. "2–5") atau 8/11 (SMP/SMA pindahan). */
function isKelasPindahan(nama: string): boolean {
  const n = nama.toLowerCase().replace("kelas", "").trim();
  if (n.includes("–") || n.includes("-")) return true;
  return n.trim() === "8" || n.trim() === "11";
}

/** Urutan jenjang dari terkecil: Kinder → SD → SMP → SMA. */
const JENJANG_ORDER = ["PG", "TK", "TK-A", "TK-B", "SD", "SMP", "SMA"];

function jenjangRank(j: string): number {
  const idx = JENJANG_ORDER.findIndex((x) => j.toUpperCase().startsWith(x));
  return idx === -1 ? JENJANG_ORDER.length : idx;
}

export function KelasSection({ data }: { data: SiteData }) {
  const kelas = useMemo(
    () =>
      [...data.kelas].sort(
        (a, b) =>
          jenjangRank(a.jenjang) - jenjangRank(b.jenjang) ||
          a.nama.localeCompare(b.nama, "id", { numeric: true }),
      ),
    [data.kelas],
  );
  return (
    <Section id="kelas" title="Kelas & Jenjang" icon={BookOpen01Icon}>
      {kelas.length === 0 ? (
        <p className="text-pretty text-sm text-muted-foreground">
          Data kelas belum dipublikasikan.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kelas.map((k) => (
            <Card key={k.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{k.nama}</CardTitle>
                  {isKelasPindahan(k.nama) ? (
                    <Badge variant="warning">Pindahan</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{k.jenjang || "Umum"}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}

export function MateriSection({ data }: { data: SiteData }) {
  return (
    <Section id="materi" title="Materi Ujian" icon={BookOpen01Icon}>
      {data.materi.length === 0 ? (
        <p className="text-pretty text-sm text-muted-foreground">
          Materi belum dipublikasikan.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.materi.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-6">
                <div>
                  <p className="font-semibold">{m.nama}</p>
                  {m.deskripsi ? (
                    <p className="text-pretty text-sm text-muted-foreground">
                      {m.deskripsi}
                    </p>
                  ) : null}
                </div>
                {m.durasi ? <Badge variant="outline">{m.durasi}</Badge> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}

export function DenahSection({ data }: { data: SiteData }) {
  // ponytail: denah kini komponen interaktif global (bukan gambar per-cabang);
  // baris `denah` hanya dipakai untuk catatan/alamat tambahan.
  const catatan = data.denah
    .map((d) => d.keterangan)
    .filter(Boolean)
    .join(" ");
  return (
    <Section id="denah" title="Denah Lokasi" icon={Location01Icon}>
      <DenahPlan />
      {catatan || data.current.alamat ? (
        <p className="mt-3 text-pretty text-sm text-muted-foreground">
          {[catatan, data.current.alamat].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </Section>
  );
}

export function PengumumanSection({ umum }: { umum: PengumumanData }) {
  return (
    <Section id="pengumuman" title="Pengumuman Hasil" icon={Megaphone01Icon}>
      {!umum.open ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-pretty text-sm text-muted-foreground">
              Hasil ujian belum diumumkan. Silakan kembali lagi nanti.
            </p>
          </CardContent>
        </Card>
      ) : umum.items.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-pretty text-sm text-muted-foreground">
              Belum ada data kelulusan untuk cabang ini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {umum.items.map((item) => {
                const lulus = item.status.trim().toLowerCase() === "lulus";
                return (
                  <li
                    key={`${item.cabang}-${item.nama}`}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{item.nama}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.cabang}
                      </p>
                    </div>
                    <Badge variant={lulus ? "success" : "destructive"}>
                      {lulus ? "Lulus" : "Tidak Lulus"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </Section>
  );
}
