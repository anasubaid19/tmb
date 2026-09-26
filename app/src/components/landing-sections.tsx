import {
  BookOpen01Icon,
  Calendar03Icon,
  Location01Icon,
  Megaphone01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Modal } from "#/components/ui/dialog";
import { FilterSortDropdown } from "#/components/ui/filter-sort-dropdown";
import { Icon } from "#/components/ui/icon";
import { Input } from "#/components/ui/input";
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
  // ponytail: denah ditampilkan langsung dari berkas SVG asli (denah resmi
  // 3 lantai). Rekreasi interaktif lama dilepas karena kotak di SVG tidak
  // seragam, jadi hasilnya selalu meleset di beberapa ruangan.
  // Baris `denah` hanya dipakai untuk catatan/alamat tambahan.
  const [buka, setBuka] = useState(false);
  const catatan = data.denah
    .map((d) => d.keterangan)
    .filter(Boolean)
    .join(" ");
  return (
    <Section id="denah" title="Denah Lokasi" icon={Location01Icon}>
      <div className="overflow-x-auto rounded-xl border bg-card p-2 sm:p-3">
        <button
          type="button"
          onClick={() => setBuka(true)}
          aria-haspopup="dialog"
          className="block w-full cursor-zoom-in"
        >
          <img
            src="/denah-ruangan-tes-bersama.svg"
            alt="Denah ruangan tes bersama, 3 lantai: LT.1 dan LT.2 (SD, SMP & SMA tiap sesi terjadwal); LT.3 khusus Ikhwan SD, SMP & SMA. Ketuk untuk membuka ukuran penuh."
            loading="lazy"
            decoding="async"
            className="mx-auto w-full max-w-3xl"
          />
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Ketuk gambar untuk membuka ukuran penuh (bisa di-zoom).
      </p>
      {catatan || data.current.alamat ? (
        <p className="mt-3 text-pretty text-sm text-muted-foreground">
          {[catatan, data.current.alamat].filter(Boolean).join(" · ")}
        </p>
      ) : null}
      <Modal
        open={buka}
        onOpenChange={setBuka}
        title="Denah ruangan"
        description="Geser atau cubit untuk memperbesar."
        wide
      >
        {/* ponytail: contain + max-h agar seluruh denah muat dan selalu
            simetris di tengah; bukan cover yang memotong tepi. */}
        <img
          src="/denah-ruangan-tes-bersama.svg"
          alt="Denah ruangan tes bersama ukuran penuh"
          className="mx-auto max-h-[75vh] w-full object-contain"
        />
        <div className="mt-4 flex justify-start">
          <Button type="button" onClick={() => setBuka(false)}>
            Kembali
          </Button>
        </div>
      </Modal>
    </Section>
  );
}

/** Jenjang unik yang ada di satu cabang, terurut kanonis. */
function jenjangUnik(
  items: PengumumanData["cabang"][number]["items"],
): string[] {
  return [...new Set(items.map((i) => i.jenjang).filter(Boolean))].sort(
    (a, b) => jenjangRank(a) - jenjangRank(b) || a.localeCompare(b, "id"),
  );
}

/** Blok atas landing: statistik per jenjang + poin "Keterangan:" dari file F_4. */
function PengumumanInfo({ umum }: { umum: PengumumanData }) {
  if (umum.statistik.length === 0 && umum.keterangan.length === 0) return null;
  return (
    <div className="mb-3 space-y-3">
      {umum.statistik.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {umum.statistik.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm"
            >
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-semibold tabular-nums">{s.jumlah}</span>
            </span>
          ))}
          {umum.totalPeserta > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              Total peserta
              <span className="font-semibold tabular-nums">
                {umum.totalPeserta}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}
      {umum.keterangan.length > 0 ? (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          <ul className="flex list-disc flex-col gap-1.5 pl-4">
            {umum.keterangan.map((k) => (
              <li key={k} className="text-pretty">
                {k.replace(/^\d+[.)]?\s*/, "")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function PengumumanSection({
  umum,
  cabang = "",
  jenjang = "",
  onChange,
}: {
  umum: PengumumanData;
  /** Cabang aktif (dari ?cabang=). Kosong = tab pertama. */
  cabang?: string;
  /** Filter jenjang aktif (dari ?jenjang=). Kosong = semua jenjang. */
  jenjang?: string;
  onChange?: (next: { cabang?: string; jenjang?: string }) => void;
}) {
  const [q, setQ] = useState("");
  // ponytail: pengumuman disembunyikan di balik tombol (state lokal, reset tiap
  // buka halaman) — netral, tanpa menyorot cabang mana pun lebih dulu.
  const [dibuka, setDibuka] = useState(false);

  if (!umum.open) {
    return (
      <Section id="pengumuman" title="Pengumuman Hasil" icon={Megaphone01Icon}>
        <Card>
          <CardContent className="pt-6">
            <p className="text-pretty text-sm text-muted-foreground">
              {umum.openAt
                ? `Hasil ujian akan diumumkan otomatis pada ${formatWaktu(umum.openAt)} WIB.`
                : "Hasil ujian belum diumumkan. Silakan kembali lagi nanti."}
            </p>
          </CardContent>
        </Card>
      </Section>
    );
  }

  if (!dibuka) {
    return (
      <Section id="pengumuman" title="Pengumuman Hasil" icon={Megaphone01Icon}>
        <PengumumanInfo umum={umum} />
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <p className="text-pretty text-sm text-muted-foreground">
              {umum.total} peserta dinyatakan lulus dari {umum.cabang.length}{" "}
              cabang. Buka untuk melihat daftar kelulusan dan memilih cabang.
            </p>
            <Button type="button" onClick={() => setDibuka(true)}>
              <Icon icon={Megaphone01Icon} size={18} />
              Buka Pengumuman
            </Button>
          </CardContent>
        </Card>
      </Section>
    );
  }

  const current = umum.cabang.find((c) => c.id === cabang) ?? umum.cabang[0];
  const daftar = jenjangUnik(current.items);
  const aktifJenjang = daftar.includes(jenjang) ? jenjang : "";

  return (
    <Section id="pengumuman" title="Pengumuman Hasil" icon={Megaphone01Icon}>
      <PengumumanInfo umum={umum} />
      <Card>
        <CardContent className="space-y-3 pt-6">
          {/* ponytail: dua dropdown gaya native-select (bukan tablist) — 16+
              cabang & banyak jenjang tak muat di HP. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <FilterSortDropdown
              label="Cabang"
              value={current.id}
              options={umum.cabang.map((c) => ({
                id: c.id,
                label: tabLabel(c.id, c.nama),
              }))}
              onValueChange={(o) => {
                // Ganti cabang → reset jenjang + pencarian (konteks berbeda).
                setQ("");
                onChange?.({ cabang: o.id, jenjang: "" });
              }}
              className="w-full sm:w-56"
              triggerAriaLabel="Pilih cabang"
              menuAriaLabel="Daftar cabang"
            />
            {daftar.length > 1 ? (
              <FilterSortDropdown
                label="Jenjang"
                value={aktifJenjang}
                options={["Semua", ...daftar].map((v) => ({
                  id: v === "Semua" ? "" : v,
                  label: v,
                }))}
                onValueChange={(o) => onChange?.({ jenjang: o.id })}
                className="w-full sm:w-44"
                triggerAriaLabel="Pilih jenjang"
                menuAriaLabel="Daftar jenjang"
              />
            ) : null}
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama…"
              aria-label="Cari nama siswa"
              className="h-12 w-full sm:ml-auto sm:w-56"
            />
          </div>
          <PengumumanTabel items={current.items} q={q} jenjang={aktifJenjang} />
        </CardContent>
      </Card>
      <p className="mt-2 text-xs text-muted-foreground">
        Total {umum.total} peserta lulus dari {umum.cabang.length} cabang. Pilih
        cabang lalu cari nama ananda.
      </p>
    </Section>
  );
}

function PengumumanTabel({
  items,
  q,
  jenjang = "",
}: {
  items: PengumumanData["cabang"][number]["items"];
  q: string;
  /** "" = semua jenjang. */
  jenjang?: string;
}) {
  const cari = q.trim().toLowerCase();
  const filtered = items
    .map((item, i) => ({ item, no: i + 1 }))
    .filter(({ item }) => {
      if (jenjang && item.jenjang !== jenjang) return false;
      return !cari || item.nama.toLowerCase().includes(cari);
    });
  if (filtered.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {items.length === 0
          ? "Belum ada data kelulusan untuk cabang ini."
          : cari
            ? `Tidak ada nama yang cocok dengan “${q}”${jenjang ? ` di jenjang ${jenjang}` : ""}.`
            : `Tidak ada data untuk jenjang ${jenjang}.`}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            <th className="w-12 py-2 pr-3 font-medium">No</th>
            <th className="py-2 pr-3 font-medium">Nama Lengkap</th>
            <th className="py-2 pr-3 font-medium">Jenjang</th>
            <th className="py-2 pr-3 font-medium">Kelas</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filtered.map(({ item, no }) => {
            const status = item.status.trim().toLowerCase();
            return (
              <tr key={`${no}-${item.nama}`}>
                <td className="py-2 pr-3 text-muted-foreground tabular-nums">
                  {no}
                </td>
                <td className="py-2 pr-3 font-medium">
                  {item.nama}
                  {item.remarks ? (
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {item.remarks}
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-3">{item.jenjang || "-"}</td>
                <td className="py-2 pr-3">{item.kelas || "-"}</td>
                <td className="py-2">
                  <Badge
                    variant={
                      status === "lulus"
                        ? "success"
                        : status === "tes_lanjutan"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {status === "lulus"
                      ? "Lulus"
                      : status === "tes_lanjutan"
                        ? "Tes Lanjutan"
                        : "Tidak Lulus"}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Label tab kanonis: id "AW3" → "AL-WILDAN 3" (fallback ke nama cabang). */
function tabLabel(id: string, nama: string): string {
  const m = id.match(/^AW0*(\d+)$/i);
  if (m) return `AL-WILDAN ${Number(m[1])}`;
  return nama || id;
}

function formatWaktu(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}
