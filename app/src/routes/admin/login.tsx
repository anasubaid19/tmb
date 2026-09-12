import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginCard } from "#/components/auth-ui";
import { loginAdminFn, sessionFn } from "#/lib/auth";

export const Route = createFileRoute("/admin/login")({
  beforeLoad: async () => {
    const s = await sessionFn();
    if (s?.role === "admin") throw redirect({ to: "/admin" });
  },
  component: AdminLogin,
});

function AdminLogin() {
  return (
    <LoginCard
      title="Portal Admin"
      subtitle="Masuk dengan kode + password admin."
      fields={[
        { name: "kode", label: "Kode admin" },
        {
          name: "password",
          label: "Password",
          type: "password",
          autoComplete: "current-password",
        },
      ]}
      submitLabel="Masuk"
      redirectTo="/admin"
      onSubmit={(v) =>
        loginAdminFn({ data: { kode: v.kode, password: v.password } })
      }
    />
  );
}
