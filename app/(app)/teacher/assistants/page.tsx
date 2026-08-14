import { redirect } from "next/navigation";
import { requireScopedRole } from "@/services";

export const dynamic = "force-dynamic";

/** Assistant assignment is an academy-management concern, not a teacher feature. */
export default async function TeacherAssistantsPage() {
  await requireScopedRole("ADMIN", "SUPER_ADMIN");
  redirect("/settings");
}
