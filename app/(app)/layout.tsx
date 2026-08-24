import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
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

  // Platform owner runs the whole platform, not a single academy's daily ops.
  // Keep them on platform surfaces only; redirect academy-operations pages.
  if (user.role === "SUPER_ADMIN") {
    const h = await headers();
    const pathname = h.get("x-invoke-path") ?? h.get("x-matched-path") ?? "";
    const PLATFORM_ALLOWED = ["/platform", "/audit", "/settings", "/support", "/privacy", "/terms", "/help", "/notifications", "/messages"];
    const isAllowed = PLATFORM_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"));
    if (pathname && !isAllowed) {
      redirect("/platform");
    }
  }

  // Resolve only the small academy record needed by the shell. Do not hydrate
  // every tenant table here: this layout wraps every internal navigation, and
  // a full snapshot is far more expensive than the page-specific RLS reads.
  const activeMembership = user.memberships?.find((membership) => membership.academy_id === user.academy_id);
  let academyName = activeMembership?.academy_name ?? "MY Academy";
  try {
    const academy = await MiscService.getAcademyAsync(user.academy_id);
    academyName = academy.name;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Academy data is unavailable") && !message.includes("Missing authenticated academy context")) {
      throw error;
    }
    if (!activeMembership) {
      redirect("/api/auth/clear-session?next=/login%3Freason%3Dtenant-session");
    }
  }
  const onboardingCookie = (await cookies()).get("myacademy_onboarding_done");
  const shouldCheckOnboarding = user.role === "ADMIN" && !onboardingCookie;

  // لا نطلب إعدادات مسبقة من المستخدم؛ نفتح خطوات البداية فقط للأكاديمية
  // الجديدة التي لا تحتوي بعد على أي بيانات تشغيلية.
  let teacherCount = 0;
  let studentCount = 0;
  let groupCount = 0;
  if (shouldCheckOnboarding) {
    // Onboarding is the only layout concern that needs the complete snapshot.
    // Keep this exceptional path out of normal page navigation.
    await ensureStoreLoaded(user.academy_id);
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
        <AppShell user={user} academyName={academyName}>
          {children}
        </AppShell>
      </OnboardingGate>
    </TooltipProvider>
  );
}
