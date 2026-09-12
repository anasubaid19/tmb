import {
  BookOpen01Icon,
  Calendar03Icon,
  Location01Icon,
  Megaphone01Icon,
  UserCheck01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Icon } from "#/components/ui/icon";
import type { SiteData } from "#/lib/site";

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

export function JadwalSection({ data }: { data: SiteData }) {
  return (
    <Section id="jadwal" title="Jadwal Ujian" icon={Calendar03Icon}>
      {data.jadwal.length === 0 ? (
        <p className="text-pretty text-sm text-muted-foreground">
          Jadwal belum dipublikasikan.
        </p>
      ) : (
        <>
          {/* ponytail: mobile = kartu tumpuk (tabel 6 kolom terjepit di HP);
          tabel hanya sm ke atas. */}
          <div className="flex flex-col gap-3 sm:hidden">
            {data.jadwal.map((j) => (
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
                    {[
                      "Tanggal",
                      "Sesi",
                      "Materi",
                      "Kelas",
                      "Ruang",
                      "Penguji",
                    ].map((h) => (
                      <th key={h} className="px-4 py-2.5 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.jadwal.map((j) => (
                    <tr key={j.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-medium">{j.tanggal}</td>
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

export function KelasSection({ data }: { data: SiteData }) {
  return (
    <Section id="kelas" title="Kelas" icon={BookOpen01Icon}>
      {data.kelas.length === 0 ? (
        <p className="text-pretty text-sm text-muted-foreground">
          Data kelas belum dipublikasikan.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.kelas.map((k) => (
            <Card key={k.id}>
              <CardHeader>
                <CardTitle className="text-base">{k.nama}</CardTitle>
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
  return (
    <Section id="denah" title="Denah Lokasi" icon={Location01Icon}>
      {data.denah.length === 0 ? (
        <p className="text-pretty text-sm text-muted-foreground">
          Denah belum dipublikasikan.
          {data.current.alamat ? ` Alamat: ${data.current.alamat}` : ""}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.denah.map((d) => (
            <Card key={d.id} className="overflow-hidden">
              {d.imageUrl ? (
                <img
                  src={d.imageUrl}
                  alt={d.judul}
                  className="aspect-video w-full object-cover outline outline-1 -outline-offset-1 outline-black/10"
                  loading="lazy"
                />
              ) : null}
              <CardHeader>
                <CardTitle className="text-base">{d.judul}</CardTitle>
              </CardHeader>
              {d.keterangan ? (
                <CardContent>
                  <p className="text-pretty text-sm text-muted-foreground">
                    {d.keterangan}
                  </p>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}

export function PengujiSection({ data }: { data: SiteData }) {
  return (
    <Section id="penguji" title="Penguji" icon={UserCheck01Icon}>
      {data.penguji.length === 0 ? (
        <p className="text-pretty text-sm text-muted-foreground">
          Daftar penguji belum dipublikasikan.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {data.penguji.map((p) => (
            <Badge
              key={p.id}
              variant="secondary"
              className="px-3 py-1.5 text-sm"
            >
              {p.nama}
            </Badge>
          ))}
        </div>
      )}
    </Section>
  );
}

export function PengumumanTeaser({
  open,
  cabangId,
}: {
  open: boolean;
  cabangId: string;
}) {
  return (
    <Section id="pengumuman" title="Pengumuman Hasil" icon={Megaphone01Icon}>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <p className="text-pretty text-sm text-muted-foreground">
            {open
              ? "Hasil ujian sudah diumumkan. Lihat daftar kelulusan."
              : "Hasil ujian belum diumumkan. Pantau halaman ini."}
          </p>
          <Link
            to="/pengumuman"
            search={{ cabang: cabangId }}
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-[color,background-color,scale] outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
          >
            {open ? "Lihat Hasil" : "Ke Halaman Pengumuman"}
          </Link>
        </CardContent>
      </Card>
    </Section>
  );
}
