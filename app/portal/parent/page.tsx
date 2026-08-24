import { redirect } from "next/navigation";
import { readPortalSession } from "@/lib/portal-session";
import { getPortalDashboard } from "@/services/portal-dashboard";
import { PortalParentView } from "@/components/portal/portal-parent-view";

export const dynamic = "force-dynamic";

export default async function CredentialsParentPortalPage() {
  const session = await readPortalSession();
  if (!session) redirect("/portal/login");
  if (session.role !== "parent") redirect("/portal/student");
  const data = await getPortalDashboard(session);
  if (!data) redirect("/portal/login");
  return <PortalParentView data={data} />;
}
