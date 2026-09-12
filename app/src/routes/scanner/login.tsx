import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginCard } from "#/components/auth-ui";
import { loginStaffFn, sessionFn } from "#/lib/auth";

export const Route = createFileRoute("/scanner/login")({
  beforeLoad: async () => {
    const s = await sessionFn();
    if (s?.role === "panitia" || s?.role === "admin")
      throw redirect({ to: "/scanner" });
  },
  component: ScannerLogin,
});

function ScannerLogin() {
  return (
    <LoginCard
      title="Scanner Kehadiran"
      subtitle="Masuk dengan kode panitia."
      fields={[{ name: "kode", label: "Kode panitia" }]}
      submitLabel="Masuk"
      redirectTo="/scanner"
      onSubmit={(v) => loginStaffFn({ data: { kode: v.kode } })}
    />
  );
}
