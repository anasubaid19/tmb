import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginCard } from "#/components/auth-ui";
import { sessionFn } from "#/lib/auth";
import { loginStaffApi } from "#/lib/auth-client";

export const Route = createFileRoute("/barista/login")({
  beforeLoad: async () => {
    const s = await sessionFn();
    if (s?.role === "barista" || s?.role === "admin")
      throw redirect({ to: "/barista" });
  },
  component: BaristaLogin,
});

function BaristaLogin() {
  return (
    <LoginCard
      title="Scanner Barista"
      subtitle="Masuk dengan kode barista untuk mencatat kopi gratis."
      fields={[{ name: "kode", label: "Kode barista" }]}
      submitLabel="Masuk"
      redirectTo="/barista"
      onSubmit={(v) => loginStaffApi(v.kode)}
    />
  );
}
