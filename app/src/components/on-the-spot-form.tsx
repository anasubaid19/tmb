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
 */
export function OnTheSpotForm({
  cabang,
}: {
  cabang: { id: string; nama: string }[];
}) {
  const [hasil, setHasil] = useState<{
    kode: string;
    nama: string;
    qr: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

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
          cabangId: get("cabangId"),
          jenjang: get("jenjang"),
          kelasTujuan: get("kelasTujuan"),
          asalSekolah: get("asalSekolah"),
        },
      });
      setHasil({ kode: r.kode, nama: r.nama, qr: r.qr });
      e.currentTarget.reset();
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
            <Input id="noHp" name="noHp" type="tel" required />
          </div>
          <div>
            <label
              htmlFor="cabangId"
              className="mb-1 block text-sm font-medium"
            >
              Cabang *
            </label>
            <Select name="cabangId" required>
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
            <Input id="kelasTujuan" name="kelasTujuan" placeholder="mis. 1" />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="asalSekolah"
              className="mb-1 block text-sm font-medium"
            >
              Asal sekolah
            </label>
            <Input id="asalSekolah" name="asalSekolah" />
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
