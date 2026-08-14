import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DemoBanner } from "@/components/layout/demo-banner";
import { loadCurrentUser, MiscService } from "@/services";
import { ensureStoreLoaded } from "@/services/data/store";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await loadCurrentUser();
  if (!user) redirect("/login");

  // Production data is hydrated only after resolving the academy from the
  // signed server session, keeping each request isolated to its tenant.
  await ensureStoreLoaded(user.academy_id);
  const academy = MiscService.getAcademy();

  return (
    <>
      <DemoBanner user={user} />
      <AppShell user={user} academyName={academy.name}>
        {children}
      </AppShell>
    </>
  );
}
