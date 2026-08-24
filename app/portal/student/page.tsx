import { redirect } from "next/navigation";
import { readPortalSession } from "@/lib/portal-session";
import { getPortalDashboard } from "@/services/portal-dashboard";
import { PortalStudentView } from "@/components/portal/portal-student-view";

export const dynamic = "force-dynamic";

export default async function CredentialsStudentPortalPage() {
  const session = await readPortalSession();
  if (!session) redirect("/portal/login");
  if (session.role !== "student") redirect("/portal/parent");
  const data = await getPortalDashboard(session);
  if (!data) redirect("/portal/login");
  return <PortalStudentView data={data} />;
}
