import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginCard } from "#/components/auth-ui";
import { sessionFn } from "#/lib/auth";
import { loginStaffApi } from "#/lib/auth-client";

export const Route = createFileRoute("/penguji/login")({
  beforeLoad: async () => {
    const s = await sessionFn();
    if (s?.role === "penguji") throw redirect({ to: "/penguji" });
  },
  component: PengujiLogin,
});

function PengujiLogin() {
  return (
    <LoginCard
      title="Portal Penguji"
      subtitle="Masuk dengan kode penguji dari panitia."
      fields={[{ name: "kode", label: "Kode penguji" }]}
      submitLabel="Masuk"
      redirectTo="/penguji"
      onSubmit={(v) => loginStaffApi(v.kode)}
    />
  );
}
