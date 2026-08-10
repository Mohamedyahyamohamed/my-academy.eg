import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, MiscService } from "@/services";
import { ensureStoreLoaded } from "@/services/data/store";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hydrate the in-memory store from Supabase (write-through cache).
  await ensureStoreLoaded();
  const user = getCurrentUser();
  if (!user) redirect("/login");

  const academy = MiscService.getAcademy();

  return (
    <AppShell user={user} academyName={academy.name}>
      {children}
    </AppShell>
  );
}
