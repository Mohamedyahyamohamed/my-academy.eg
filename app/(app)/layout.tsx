import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingGate } from "@/components/layout/onboarding-gate";
import { DemoBanner } from "@/components/layout/demo-banner";
import { loadCurrentUser, MiscService } from "@/services";
import { collections, ensureStoreLoaded } from "@/services/data/store";

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
    // The user has already been authenticated and the academy snapshot has
    // already been hydrated above. Filter the snapshot explicitly here instead
    // of calling helpers that depend on AsyncLocalStorage during layout render.
    // This keeps first-login onboarding safe even when the layout and page are
    // rendered in separate server contexts.
    const snapshot = collections();
    teacherCount = snapshot.teachers.filter((item) => item.academy_id === user.academy_id).length;
    studentCount = snapshot.students.filter((item) => item.academy_id === user.academy_id).length;
    groupCount = snapshot.groups.filter((item) => item.academy_id === user.academy_id).length;
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
