import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  type AnakOption,
  loginSiswaFn,
  pickSiswaFn,
  sessionFn,
} from "#/lib/auth";

export const Route = createFileRoute("/siswa/login")({
  beforeLoad: async () => {
    const s = await sessionFn();
    if (s?.role === "siswa") throw redirect({ to: "/siswa" });
  },
  component: SiswaLogin,
});

function SiswaLogin() {
  const navigate = useNavigate();
  const [noHp, setNoHp] = useState("");
  const [anak, setAnak] = useState<AnakOption[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitPhone(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await loginSiswaFn({ data: { noHp } });
      if (r.picked) {
        await navigate({ to: "/siswa" });
        return;
      }
      setAnak(r.anak ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  async function pilih(id: string) {
    setError("");
    setLoading(true);
    try {
      await pickSiswaFn({ data: { noHp, siswaId: id } });
      await navigate({ to: "/siswa" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memilih anak.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Portal Siswa</CardTitle>
          <p className="text-sm text-muted-foreground">
            {anak
              ? "Pilih anak untuk masuk."
              : "Masuk dengan nomor HP wali yang terdaftar."}
          </p>
        </CardHeader>
        <CardContent>
          {anak ? (
            <div className="flex flex-col gap-3">
              {anak.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={loading}
                  onClick={() => void pilih(a.id)}
                  className="flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <span className="font-semibold">{a.nama}</span>
                  <span className="text-sm text-muted-foreground">
                    {a.jenjang} · {a.cabangId} · Kelas {a.kelasTujuan}
                  </span>
                </button>
              ))}
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAnak(null);
                  setError("");
                }}
              >
                Ganti nomor
              </Button>
            </div>
          ) : (
            <form onSubmit={submitPhone} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="noHp">Nomor HP wali</Label>
                <Input
                  id="noHp"
                  name="noHp"
                  type="tel"
                  autoComplete="tel"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  placeholder="08… / 62… / +62…"
                  required
                />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={loading}>
                {loading ? "Memproses…" : "Masuk"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
