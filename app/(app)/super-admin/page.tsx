import { redirect } from "next/navigation";
import { requireScopedRole } from "@/services";

export const dynamic = "force-dynamic";

/**
 * The platform control surface already lives at /platform. This explicit alias
 * prevents role confusion and guarantees the route cannot be opened by an
 * academy ADMIN, teacher, assistant, parent, or student.
 */
export default async function SuperAdminPage() {
  await requireScopedRole("SUPER_ADMIN");
  redirect("/platform");
}
