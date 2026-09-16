import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { type AnakOption, sessionFn } from "#/lib/auth";
import { loginSiswaApi, pickSiswaApi } from "#/lib/auth-client";

export const Route = createFileRoute("/siswa/login")({
  beforeLoad: async () => {
    const s = await sessionFn();
    if (s?.role === "siswa") throw redirect({ to: "/siswa" });
  },
  component: SiswaLogin,
});

type Mode = "phone" | "email";

function SiswaLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("phone");
  const [identifier, setIdentifier] = useState("");
  const [anak, setAnak] = useState<AnakOption[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setIdentifier("");
    setAnak(null);
    setError("");
  }

  async function submitIdentifier(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await loginSiswaApi(mode, identifier);
      if (r.picked) {
        await navigate({ to: "/siswa" });
        return;
      }
      setAnak(r.anak ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login gagal. Periksa koneksi lalu coba lagi, atau hubungi panitia.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function pilih(id: string) {
    setError("");
    setLoading(true);
    try {
      await pickSiswaApi(mode, identifier, id);
      await navigate({ to: "/siswa" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memilih anak. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-16">
      <Link
        to="/"
        search={{ cabang: "" }}
        className="mb-4 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Kembali ke beranda
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Portal Siswa</CardTitle>
          <p className="text-sm text-muted-foreground">
            {anak
              ? "Pilih anak untuk masuk."
              : "Masuk dengan nomor HP wali atau email yang terdaftar."}
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
                    {a.jenjang} · {a.cabangNama ?? a.cabangId} · Kelas{" "}
                    {a.kelasTujuan}
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
                Ganti identitas
              </Button>
            </div>
          ) : (
            <form onSubmit={submitIdentifier} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="identifier">
                  {mode === "phone" ? "Nomor HP wali" : "Email"}
                </Label>
                <Input
                  id="identifier"
                  name="identifier"
                  type={mode === "phone" ? "tel" : "email"}
                  autoComplete={mode === "phone" ? "tel" : "email"}
                  inputMode={mode === "phone" ? "tel" : "email"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    mode === "phone" ? "08… / 62… / +62…" : "nama@email.com"
                  }
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => switchMode(mode === "phone" ? "email" : "phone")}
                className="inline-flex min-h-11 w-fit items-center text-sm text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {mode === "phone"
                  ? "Masuk pakai email"
                  : "Masuk pakai nomor HP"}
              </button>
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
