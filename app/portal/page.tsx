import { redirect } from "next/navigation";
import { readPortalSession } from "@/lib/portal-session";

export const dynamic = "force-dynamic";

export default async function PortalEntryPage() {
  const session = await readPortalSession();
  if (!session) redirect("/portal/login");
  redirect(session.role === "parent" ? "/portal/parent" : "/portal/student");
}
