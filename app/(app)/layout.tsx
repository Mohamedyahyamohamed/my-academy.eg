import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingGate } from "@/components/layout/onboarding-gate";
import { DemoBanner } from "@/components/layout/demo-banner";
import { loadCurrentUser, GroupsService, MiscService, StudentsService } from "@/services";
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
  const academy = MiscService.getAcademy(user.academy_id);
  const onboardingCookie = (await cookies()).get("myacademy_onboarding_done");
  const shouldCheckOnboarding = user.role === "ADMIN" && !onboardingCookie;

  // لا نطلب إعدادات مسبقة من المستخدم؛ نفتح خطوات البداية فقط للأكاديمية
  // الجديدة التي لا تحتوي بعد على أي بيانات تشغيلية.
  let teacherCount = 0;
  let studentCount = 0;
  let groupCount = 0;
  if (shouldCheckOnboarding) {
    const [teachers, students, groups] = await Promise.all([
      MiscService.listTeachers(),
      StudentsService.listStudents({ page: 1, pageSize: 1 }),
      GroupsService.listGroups(),
    ]);
    teacherCount = teachers.length;
    studentCount = students.pagination.total;
    groupCount = groups.length;
  }
  const needsOnboarding =
    shouldCheckOnboarding && teacherCount === 0 && studentCount === 0 && groupCount === 0;

  return (
    <OnboardingGate required={needsOnboarding}>
      <DemoBanner user={user} />
      <AppShell user={user} academyName={academy.name}>
        {children}
      </AppShell>
    </OnboardingGate>
  );
}
