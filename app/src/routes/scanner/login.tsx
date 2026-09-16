import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginCard } from "#/components/auth-ui";
import { sessionFn } from "#/lib/auth";
import { loginStaffApi } from "#/lib/auth-client";

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
      onSubmit={(v) => loginStaffApi(v.kode)}
    />
  );
}
