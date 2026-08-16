import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingGate } from "@/components/layout/onboarding-gate";
import { DemoBanner } from "@/components/layout/demo-banner";
import { RealtimeNotifications } from "@/components/layout/realtime-notifications";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAccessRestriction, loadCurrentUser, MiscService } from "@/services";
import { collections, ensureStoreLoaded } from "@/services/data/store";
import { setRequestContext } from "@/services/request-context";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await loadCurrentUser();
  if (!user) redirect("/login");
  // Re-bind the authenticated tenant at the layout boundary. Next.js RSC
  // navigations can render child pages in a separate async context, so pages
  // must not rely on a context established only by an earlier helper call.
  setRequestContext(user);
  const restriction = await getAccessRestriction(user);
  if (restriction.blocked) redirect(`/suspended?reason=${restriction.reason}`);

  // Production data is hydrated only after resolving the academy from the
  // signed server session, keeping each request isolated to its tenant.
  // A stale session must not turn into a 500 or reveal a different tenant.
  let academy;
  try {
    await ensureStoreLoaded(user.academy_id);
    academy = await MiscService.getAcademyAsync(user.academy_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Academy data is unavailable") || message.includes("Missing authenticated academy context")) {
      redirect("/api/auth/clear-session?next=/login%3Freason%3Dtenant-session");
    }
    throw error;
  }
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
    <TooltipProvider delayDuration={200}>
      <RealtimeNotifications />
      <OnboardingGate required={needsOnboarding}>
        <DemoBanner user={user} />
        <AppShell user={user} academyName={academy.name}>
          {children}
        </AppShell>
      </OnboardingGate>
    </TooltipProvider>
  );
}
