import { useRouter } from "@tanstack/react-router";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { Modal } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
  type AdminDashboard,
  type AdminMateri,
  type AdminPenguji,
  type AdminSiswa,
  hapusMateriFn,
  hapusPanitiaFn,
  hapusPengujiFn,
  hapusSiswaFn,
  saveMateriFn,
  savePanitiaFn,
  savePengujiFn,
  saveSiswaFn,
} from "#/lib/admin";
import { JENJANG_PILIHAN } from "#/lib/kode";
import { LEMBAR_TESTS } from "#/lib/lembar";
import { columnForMateri } from "#/lib/penguji";

const JK = ["LAKI-LAKI", "PEREMPUAN"];
const MAX_ROWS = 150;

/** CMS: edit manual data siswa / penguji / panitia (selain impor bulk). */
export function DataTab({ data }: { data: AdminDashboard }) {
  return (
    <Tabs defaultValue="siswa">
      <TabsList>
        <TabsTrigger value="siswa">Siswa</TabsTrigger>
        <TabsTrigger value="penguji">Penguji</TabsTrigger>
        <TabsTrigger value="panitia">Panitia</TabsTrigger>
        <TabsTrigger value="materi">Materi</TabsTrigger>
      </TabsList>
      <TabsContent value="siswa">
        <SiswaPanel data={data} />
      </TabsContent>
      <TabsContent value="penguji">
        <PengujiPanel data={data} />
      </TabsContent>
      <TabsContent value="panitia">
        <PanitiaPanel data={data} />
      </TabsContent>
      <TabsContent value="materi">
        <MateriPanel data={data} />
      </TabsContent>
    </Tabs>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

/* ---------------- Siswa ---------------- */

function SiswaPanel({ data }: { data: AdminDashboard }) {
  const router = useRouter();
  const [scope, setScope] = useState("");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<AdminSiswa | "baru" | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.siswa
      .filter((s) => !scope || s.cabangId === scope)
      .filter(
        (s) =>
          !needle ||
          s.nama.toLowerCase().includes(needle) ||
          s.kode.toLowerCase().includes(needle) ||
          s.noHp.toLowerCase().includes(needle) ||
          s.email.toLowerCase().includes(needle),
      )
      .slice(0, MAX_ROWS);
  }, [data.siswa, scope, q]);

  const hapus = async (s: AdminSiswa) => {
    if (
      !window.confirm(
        `Hapus permanen siswa ${s.nama} (${s.kode})? Nilai dan riwayatnya ikut terhapus dan tidak bisa dibatalkan.`,
      )
    )
      return;
    setBusy(true);
    try {
      await hapusSiswaFn({ data: { id: s.id } });
      toast.success("Siswa dihapus.");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={scope} onValueChange={(v) => setScope(v ?? "")}>
            <SelectTrigger className="sm:max-w-48">
              <SelectValue placeholder="Semua cabang" />
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
          <Input
            aria-label="Cari nama, kode, HP, atau email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama / kode / HP / email"
            className="sm:max-w-64"
          />
        </div>
        <Button type="button" onClick={() => setEdit("baru")}>
          Tambah siswa
        </Button>
      </div>
      <Card>
        <CardContent className="px-2 py-0 sm:px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Peserta</TableHead>
                <TableHead>Cabang · Jenjang</TableHead>
                <TableHead>Kelas · Jurusan</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>JK</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="font-medium">{s.nama}</p>
                    <p className="text-xs text-muted-foreground">{s.kode}</p>
                  </TableCell>
                  <TableCell>
                    <p>{s.cabangId}</p>
                    <p className="text-xs text-muted-foreground">{s.jenjang}</p>
                  </TableCell>
                  <TableCell>
                    <p>{s.kelasTujuan || "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.programJurusan || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p>{s.noHp || "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.email || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.jenisKelamin || "-"}</Badge>
                  </TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setEdit(s)}
                    >
                      Ubah
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void hapus(s)}
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 ? <Empty text="Tidak ada siswa cocok." /> : null}
        </CardContent>
      </Card>
      {data.siswa.length > rows.length ? (
        <p className="text-xs text-muted-foreground">
          Menampilkan {rows.length} dari {data.siswa.length} siswa — persempit
          dengan cabang atau pencarian.
        </p>
      ) : null}
      {edit ? (
        <SiswaModal
          key={edit === "baru" ? "baru" : edit.id}
          awal={edit === "baru" ? null : edit}
          data={data}
          onClose={() => setEdit(null)}
        />
      ) : null}
    </div>
  );
}

function SiswaModal({
  awal,
  data,
  onClose,
}: {
  awal: AdminSiswa | null;
  data: AdminDashboard;
  onClose: () => void;
}) {
  const router = useRouter();
  const [cabangId, setCabangId] = useState(awal?.cabangId ?? "AW3");
  const [jenjang, setJenjang] = useState(awal?.jenjang ?? "SMP");
  const [jk, setJk] = useState(awal?.jenisKelamin ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    setBusy(true);
    try {
      await saveSiswaFn({
        data: {
          id: awal?.id ?? "",
          kode: get("kode"),
          nama: get("nama"),
          cabangId,
          jenjang,
          kelasTujuan: get("kelasTujuan"),
          programJurusan: get("programJurusan"),
          noHp: get("noHp"),
          email: get("email"),
          jenisKelamin: jk,
        },
      });
      toast.success("Siswa tersimpan.");
      await router.invalidate();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={awal ? "Ubah siswa" : "Tambah siswa"}
      description="Perubahan tampil di landing/cabang (≤ 60 detik via cache)."
    >
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kode *">
            <Input
              name="kode"
              required
              defaultValue={awal?.kode}
              placeholder="AW3-B001"
            />
          </Field>
          <Field label="Nama *">
            <Input name="nama" required defaultValue={awal?.nama} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cabang *">
            <Select
              value={cabangId}
              onValueChange={(v) => setCabangId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.cabang.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Jenjang *">
            <Select value={jenjang} onValueChange={(v) => setJenjang(v ?? "")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JENJANG_PILIHAN.map((j) => (
                  <SelectItem key={j} value={j}>
                    {j}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kelas tujuan">
            <Input name="kelasTujuan" defaultValue={awal?.kelasTujuan} />
          </Field>
          <Field label="Program / jurusan">
            <Input name="programJurusan" defaultValue={awal?.programJurusan} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="No. HP wali">
            <Input name="noHp" defaultValue={awal?.noHp} placeholder="08…" />
          </Field>
          <Field label="Email (login)">
            <Input
              name="email"
              type="email"
              defaultValue={awal?.email}
              placeholder="nama@email.com"
            />
          </Field>
        </div>
        <Field label="Jenis kelamin">
          <Select value={jk} onValueChange={(v) => setJk(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Belum diisi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Belum diisi</SelectItem>
              {JK.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan"}
        </Button>
      </form>
    </Modal>
  );
}

/* ---------------- Penguji ---------------- */

function PengujiPanel({ data }: { data: AdminDashboard }) {
  const router = useRouter();
  const [edit, setEdit] = useState<AdminPenguji | "baru" | null>(null);
  const [busy, setBusy] = useState(false);
  const materiName = (id: string) =>
    data.materi.find((m) => m.id === id)?.nama ?? "-";

  const hapus = async (p: AdminPenguji) => {
    if (
      !window.confirm(
        `Hapus permanen penguji ${p.nama} (${p.kode})? Akun loginnya ikut nonaktif dan tidak bisa dibatalkan.`,
      )
    )
      return;
    setBusy(true);
    try {
      await hapusPengujiFn({ data: { id: p.id } });
      toast.success("Penguji dihapus.");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setEdit("baru")}>
          Tambah penguji
        </Button>
      </div>
      <Card>
        <CardContent className="px-2 py-0 sm:px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Penguji</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Materi</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.penguji.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{p.nama}</p>
                    <p className="text-xs text-muted-foreground">{p.kode}</p>
                  </TableCell>
                  <TableCell>{p.cabangId || "-"}</TableCell>
                  <TableCell>{p.materi ? materiName(p.materi) : "-"}</TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setEdit(p)}
                    >
                      Ubah
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void hapus(p)}
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.penguji.length === 0 ? (
            <Empty text="Belum ada penguji." />
          ) : null}
        </CardContent>
      </Card>
      {edit ? (
        <PengujiModal
          key={edit === "baru" ? "baru" : edit.id}
          awal={edit === "baru" ? null : edit}
          data={data}
          onClose={() => setEdit(null)}
        />
      ) : null}
    </div>
  );
}

function PengujiModal({
  awal,
  data,
  onClose,
}: {
  awal: AdminPenguji | null;
  data: AdminDashboard;
  onClose: () => void;
}) {
  const router = useRouter();
  const [cabangId, setCabangId] = useState(awal?.cabangId ?? "AW3");
  const [materiId, setMateriId] = useState(awal?.materi ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    setBusy(true);
    try {
      await savePengujiFn({
        data: {
          id: awal?.id ?? "",
          kode: awal?.kode ?? "",
          nama: get("nama"),
          cabangId,
          materiId,
        },
      });
      toast.success("Penguji tersimpan.");
      await router.invalidate();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={awal ? "Ubah penguji" : "Tambah penguji"}
      description={
        awal
          ? "Kode login tidak dapat diubah."
          : "Kode login dibuat otomatis saat disimpan."
      }
    >
      <form onSubmit={submit} className="grid gap-3">
        {awal ? (
          <Field label="Kode">
            <Input defaultValue={awal.kode} disabled />
          </Field>
        ) : null}
        <Field label="Nama *">
          <Input name="nama" required defaultValue={awal?.nama} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cabang">
            <Select
              value={cabangId}
              onValueChange={(v) => setCabangId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.cabang.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Materi">
            <Select
              value={materiId}
              onValueChange={(v) => setMateriId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih materi" />
              </SelectTrigger>
              <SelectContent>
                {data.materi.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan"}
        </Button>
      </form>
    </Modal>
  );
}

/* ---------------- Panitia ---------------- */

interface PanitiaRow {
  kode: string;
  nama: string;
}

function PanitiaPanel({ data }: { data: AdminDashboard }) {
  const router = useRouter();
  const [edit, setEdit] = useState<PanitiaRow | "baru" | null>(null);
  const [busy, setBusy] = useState(false);

  const hapus = async (p: PanitiaRow) => {
    if (
      !window.confirm(
        `Hapus permanen akun panitia ${p.kode}? Akses scannernya ikut nonaktif dan tidak bisa dibatalkan.`,
      )
    )
      return;
    setBusy(true);
    try {
      await hapusPanitiaFn({ data: { kode: p.kode } });
      toast.success("Akun panitia dihapus.");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setEdit("baru")}>
          Tambah panitia
        </Button>
      </div>
      <Card>
        <CardContent className="px-2 py-0 sm:px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.panitia.map((p) => (
                <TableRow key={p.kode}>
                  <TableCell className="font-medium">{p.kode}</TableCell>
                  <TableCell>{p.nama || "-"}</TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setEdit(p)}
                    >
                      Ubah
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void hapus(p)}
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.panitia.length === 0 ? (
            <Empty text="Belum ada akun panitia." />
          ) : null}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Login panitia memakai kode. Kolom password opsional (disimpan untuk
        pemakaian lanjutan).
      </p>
      {edit ? (
        <PanitiaModal
          key={edit === "baru" ? "baru" : edit.kode}
          awal={edit === "baru" ? null : edit}
          onClose={() => setEdit(null)}
        />
      ) : null}
    </div>
  );
}

function PanitiaModal({
  awal,
  onClose,
}: {
  awal: PanitiaRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    setBusy(true);
    try {
      await savePanitiaFn({
        data: {
          kode: get("kode"),
          nama: get("nama"),
          password: get("password"),
        },
      });
      toast.success("Akun panitia tersimpan.");
      await router.invalidate();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={awal ? "Ubah panitia" : "Tambah panitia"}
    >
      <form onSubmit={submit} className="grid gap-3">
        <Field label="Kode *">
          <Input
            name="kode"
            required
            readOnly={!!awal}
            defaultValue={awal?.kode}
            placeholder="SCAN-02"
          />
        </Field>
        <Field label="Nama *">
          <Input name="nama" required defaultValue={awal?.nama} />
        </Field>
        <Field label="Password (opsional)">
          <Input name="password" type="password" autoComplete="new-password" />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan"}
        </Button>
      </form>
    </Modal>
  );
}

/* ---------------- Materi (durasi ujian di landing) ---------------- */

function MateriPanel({ data }: { data: AdminDashboard }) {
  const router = useRouter();
  const [scope, setScope] = useState("");
  const [edit, setEdit] = useState<AdminMateri | "baru" | null>(null);
  const [busy, setBusy] = useState(false);

  // ponytail: baris global (cabang kosong) ikut tampil saat scope per-cabang.
  const rows = useMemo(
    () =>
      data.materi.filter((m) => !scope || !m.cabangId || m.cabangId === scope),
    [data.materi, scope],
  );

  const hapus = async (m: AdminMateri) => {
    if (
      !window.confirm(
        `Hapus permanen materi ${m.nama} (${m.id})? Baris ini hilang dari landing dan tidak bisa dibatalkan.`,
      )
    )
      return;
    setBusy(true);
    try {
      await hapusMateriFn({ data: { id: m.id } });
      toast.success("Materi dihapus.");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select value={scope} onValueChange={(v) => setScope(v ?? "")}>
          <SelectTrigger className="sm:max-w-48">
            <SelectValue placeholder="Semua cabang" />
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
        <Button type="button" onClick={() => setEdit("baru")}>
          Tambah materi
        </Button>
      </div>
      <Card>
        <CardContent className="px-2 py-0 sm:px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Materi</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead>Cakupan</TableHead>
                <TableHead>Lembar</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <p className="font-medium">{m.nama}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.id}
                      {m.deskripsi ? ` · ${m.deskripsi}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {m.durasi || "-"}
                  </TableCell>
                  <TableCell>
                    {m.cabangId
                      ? (data.cabang.find((c) => c.id === m.cabangId)?.nama ??
                        m.cabangId)
                      : "Global"}
                  </TableCell>
                  <TableCell>
                    {m.lembarKey ? (
                      <Badge variant="secondary">{m.lembarKey}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setEdit(m)}
                    >
                      Ubah
                    </Button>
                    {columnForMateri[m.id] ? null : (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => void hapus(m)}
                      >
                        Hapus
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 ? <Empty text="Belum ada materi." /> : null}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Kolom Durasi yang tampil di landing halaman “Materi Ujian”. Materi inti
        M1–M5 tak bisa dihapus (terhubung kolom nilai & lembar validasi); materi
        baru hanya tampil sebagai informasi.
      </p>
      {edit ? (
        <MateriModal
          key={edit === "baru" ? "baru" : edit.id}
          awal={edit === "baru" ? null : edit}
          data={data}
          onClose={() => setEdit(null)}
        />
      ) : null}
    </div>
  );
}

function MateriModal({
  awal,
  data,
  onClose,
}: {
  awal: AdminMateri | null;
  data: AdminDashboard;
  onClose: () => void;
}) {
  const router = useRouter();
  const [cabangId, setCabangId] = useState(awal?.cabangId ?? "");
  const [lembarKey, setLembarKey] = useState(awal?.lembarKey ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    setBusy(true);
    try {
      await saveMateriFn({
        data: {
          id: awal?.id ?? "",
          cabangId,
          nama: get("nama"),
          durasi: get("durasi"),
          deskripsi: get("deskripsi"),
          lembarKey,
        },
      });
      toast.success("Materi tersimpan.");
      await router.invalidate();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={awal ? "Ubah materi" : "Tambah materi"}
      description="Durasi tampil di landing halaman Materi Ujian (≤ 60 detik via cache)."
    >
      <form onSubmit={submit} className="grid gap-3">
        {awal ? (
          <Field label="Id">
            <Input defaultValue={awal.id} disabled />
          </Field>
        ) : null}
        <Field label="Nama *">
          <Input name="nama" required defaultValue={awal?.nama} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Durasi">
            <Input
              name="durasi"
              defaultValue={awal?.durasi}
              placeholder="45 menit"
            />
          </Field>
          <Field label="Cakupan">
            <Select
              value={cabangId}
              onValueChange={(v) => setCabangId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Global (semua cabang)</SelectItem>
                {data.cabang.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Deskripsi">
          <Input name="deskripsi" defaultValue={awal?.deskripsi} />
        </Field>
        <Field label="Baris lembar validasi">
          <Select
            value={lembarKey}
            onValueChange={(v) => setLembarKey(v ?? "")}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">—</SelectItem>
              {LEMBAR_TESTS.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan"}
        </Button>
      </form>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: kontrol di dalam children.
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
