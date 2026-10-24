import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/permissions";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardShell userName={session.user.name || session.user.email}>
      {children}
    </DashboardShell>
  );
}

