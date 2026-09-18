import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { registerSiswaFn } from "#/lib/admin";
import { JENJANG_PILIHAN } from "#/lib/kode";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

/**
 * Form daftar on-the-spot — dipakai admin (tab Daftar) & panitia
 * (halaman scanner). Hasil: kode + QR aktif, langsung bisa login/scan.
 *
 * `kelas`/`program` opsional: kalau diisi, Kelas & Program jadi dropdown
 * (cascading per cabang); kalau tidak, fallback ke text input seperti dulu.
 */
export function OnTheSpotForm({
  cabang,
  kelas = [],
  program = [],
}: {
  cabang: { id: string; nama: string }[];
  kelas?: { id: string; nama: string; cabangId: string }[];
  program?: string[];
}) {
  const [hasil, setHasil] = useState<{
    kode: string;
    nama: string;
    qr: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  // ponytail: cabang dikontrol agar dropdown Kelas bisa difilter per cabang.
  const [cabangId, setCabangId] = useState("");
  const kelasOpts = kelas.filter((k) => k.cabangId === cabangId);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    setBusy(true);
    try {
      const r = await registerSiswaFn({
        data: {
          nama: get("nama"),
          noHp: get("noHp"),
          email: get("email"),
          cabangId: get("cabangId"),
          jenjang: get("jenjang"),
          kelasTujuan: get("kelasTujuan"),
          programJurusan: get("programJurusan"),
        },
      });
      setHasil({ kode: r.kode, nama: r.nama, qr: r.qr });
      e.currentTarget.reset();
      setCabangId("");
      toast.success(`${r.nama} terdaftar.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mendaftar.");
    } finally {
      setBusy(false);
    }
  };

  if (hasil) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendaftaran berhasil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <img
            src={hasil.qr}
            alt={`QR ${hasil.kode}`}
            className="size-48 rounded-lg border"
          />
          <p className="font-mono text-2xl font-bold tracking-widest">
            {hasil.kode}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasil.nama}. Langsung bisa login via no. HP + scan QR ini.
          </p>
          <Button type="button" onClick={() => setHasil(null)}>
            Daftar lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daftar on-the-spot</CardTitle>
        <p className="text-sm text-muted-foreground">
          Untuk peserta yang belum terdaftar sebelumnya.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nama" className="mb-1 block text-sm font-medium">
              Nama siswa *
            </label>
            <Input id="nama" name="nama" required />
          </div>
          <div>
            <label htmlFor="noHp" className="mb-1 block text-sm font-medium">
              No. HP wali *
            </label>
            <Input
              id="noHp"
              name="noHp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email wali
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nama@email.com"
            />
          </div>
          <div>
            <label
              htmlFor="cabangId"
              className="mb-1 block text-sm font-medium"
            >
              Cabang *
            </label>
            <Select
              name="cabangId"
              required
              value={cabangId}
              onValueChange={(v) => setCabangId(v ?? "")}
            >
              <SelectTrigger id="cabangId">
                <SelectValue placeholder="Pilih cabang" />
              </SelectTrigger>
              <SelectContent>
                {cabang.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="jenjang" className="mb-1 block text-sm font-medium">
              Jenjang *
            </label>
            <Select name="jenjang" required>
              <SelectTrigger id="jenjang">
                <SelectValue placeholder="Pilih jenjang" />
              </SelectTrigger>
              <SelectContent>
                {JENJANG_PILIHAN.map((j) => (
                  <SelectItem key={j} value={j}>
                    {j}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label
              htmlFor="kelasTujuan"
              className="mb-1 block text-sm font-medium"
            >
              Kelas tujuan
            </label>
            {kelas.length > 0 ? (
              // ponytail: key = reset pilihan kelas saat cabang diganti.
              <Select key={cabangId} name="kelasTujuan" disabled={!cabangId}>
                <SelectTrigger id="kelasTujuan">
                  <SelectValue
                    placeholder={cabangId ? "Pilih kelas" : "Pilih cabang dulu"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {kelasOpts.map((k) => (
                    <SelectItem key={k.id} value={k.nama}>
                      {k.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input id="kelasTujuan" name="kelasTujuan" placeholder="mis. 1" />
            )}
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="programJurusan"
              className="mb-1 block text-sm font-medium"
            >
              Program jurusan
            </label>
            {program.length > 0 ? (
              <Select name="programJurusan">
                <SelectTrigger id="programJurusan">
                  <SelectValue placeholder="Pilih program/jurusan" />
                </SelectTrigger>
                <SelectContent>
                  {program.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="programJurusan"
                name="programJurusan"
                placeholder="mis. FULLDAY · INTER"
              />
            )}
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : "Daftarkan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
