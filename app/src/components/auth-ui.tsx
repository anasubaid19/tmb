import { useNavigate, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { logoutFn } from "#/lib/auth";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export interface LoginField {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
}

export function LoginCard({
  title,
  subtitle,
  fields,
  submitLabel,
  redirectTo,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  fields: LoginField[];
  submitLabel: string;
  redirectTo: string;
  onSubmit: (values: Record<string, string>) => Promise<unknown>;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const values: Record<string, string> = {};
      for (const f of fields) values[f.name] = String(form.get(f.name) ?? "");
      await onSubmit(values);
      // ponytail: buang cache loader (data dashboard pengguna lama) agar
      // login akun baru tidak menampilkan dashboard akun sebelumnya.
      await router.invalidate();
      await navigate({ to: redirectTo });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {fields.map((f) => (
              <div key={f.name} className="flex flex-col gap-1.5">
                <Label htmlFor={f.name}>{f.label}</Label>
                <Input
                  id={f.name}
                  name={f.name}
                  type={f.type ?? "text"}
                  autoComplete={f.autoComplete ?? "off"}
                  required
                />
              </div>
            ))}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading ? "Memproses…" : submitLabel}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export function LogoutButton({ redirectTo = "/" }: { redirectTo?: string }) {
  const navigate = useNavigate();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await logoutFn();
        // ponytail: buang cache loader (dashboard pengguna) setelah keluar.
        await router.invalidate();
        await navigate({ to: redirectTo });
      }}
    >
      Keluar
    </Button>
  );
}
