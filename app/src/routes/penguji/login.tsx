import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginCard } from "#/components/auth-ui";
import { loginStaffFn, sessionFn } from "#/lib/auth";

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
      onSubmit={(v) => loginStaffFn({ data: { kode: v.kode } })}
    />
  );
}
