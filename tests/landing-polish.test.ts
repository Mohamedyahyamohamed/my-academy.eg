import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("landing premium polish", () => {
  const page = read("app/page.tsx");
  const navbar = read("components/marketing/landing-navbar.tsx");
  const faq = read("components/marketing/landing-faq.tsx");
  const motion = read("components/marketing/landing-motion.tsx");
  const styles = read("app/globals.css");

  it("uses a transparent-to-glass sticky navbar with accessible hover states", () => {
    expect(navbar).toContain("sticky top-0 z-50 border-b");
    expect(navbar).toContain("bg-transparent backdrop-blur-0");
    expect(navbar).toContain("bg-white/75 shadow-lg shadow-slate-900/5 backdrop-blur-xl");
    expect(navbar).toContain("window.scrollY > 12");
    expect(navbar).toContain("hover:text-indigo-600");
    expect(navbar).toContain("focus-visible:ring-2");
  });

  it("provides an RTL-aware mobile drawer with role-specific entries", () => {
    expect(navbar).toContain('aria-controls="landing-mobile-menu"');
    expect(navbar).toContain('id="landing-mobile-menu"');
    expect(navbar).toContain("lg:hidden");
    expect(navbar).toContain('href="/login"');
    expect(navbar).toContain('href="/portal/login"');
    expect(navbar).toContain("إغلاق القائمة");
    expect(navbar).toContain("فتح القائمة");
  });

  it("uses crisp mockup depth, a small demo badge, and reduced-motion-safe tilt", () => {
    expect(page).toContain("hero-dashboard-float");
    expect(page).toContain("shadow-[0_20px_50px_rgba(79,70,229,0.15)]");
    expect(page).toContain("border border-slate-200/60 bg-white");
    expect(page).toContain("ring-1 ring-gray-900/5");
    expect(page).toContain("hover:rotate-[4deg]");
    expect(page).toContain("motion-reduce:hover:rotate-0");
    expect(page).toContain("إشعار توضيحي");
    expect(page).not.toContain("hero-ambient-blob");
    expect(page).not.toContain("blur-2xl");
    expect(styles).toContain("@keyframes hero-dashboard-float");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });

  it("uses high-contrast typography and non-numeric demo promises", () => {
    expect(page).toContain("text-base font-medium leading-8 text-slate-600 dark:text-slate-300");
    expect(page).toContain("max-w-full break-words");
    expect(page).toContain("hero-gradient-text");
    expect(page).toContain("تقدم واضح");
    expect(page).toContain("بوابة الأسرة");
    expect(page).not.toContain("طلاب نشطون");
    expect(page).not.toContain("٢٤٨");
    expect(page).not.toContain("٤٢٫٥ ألف");
    expect(page).not.toContain("+8.4%");
  });

  it("routes staff and portal entries to separate login flows", () => {
    expect(page).toContain('href="/login"');
    expect(page).toContain('href="/portal/login"');
    expect(page).toContain('href={authenticated ? destination : "/portal/login"}');
    expect(navbar).toContain('href="/portal/login"');
    expect(page).toContain("Student & parent portal");
    expect(page).toContain("دخول الطلاب وأولياء الأمور");
  });

  it("keeps authenticated dashboard/portal destinations and hides guest-only CTAs", () => {
    expect(page).toContain("const user = await loadCurrentUser();");
    expect(page).toContain("const portalSession = await readPortalSession();");
    expect(page).toContain("const destination = portalSession ? portalDestination : user ? roleHome(user.role) : \"/signup\";");
    expect(page).toContain("/portal/student");
    expect(page).toContain("/portal/parent");
    expect(page).toContain("!authenticated &&");
    expect(page).toContain("{authenticated ? ctaLabel");
    expect(page).not.toContain("redirect(roleHome(user.role))");
  });

  it("uses a keyboard-accessible accordion with explicit expanded state", () => {
    expect(page).toContain("<LandingFaq items={faqs}");
    expect(faq).toContain("aria-expanded={open}");
    expect(faq).toContain("aria-controls={panelId}");
    expect(faq).toContain('type="button"');
    expect(faq).toContain("focus-visible:ring-2");
    expect(faq).toContain("transition-[grid-template-rows,opacity]");
  });

  it("renders the feature bento and short one-line feature copy", () => {
    expect(page).toContain("lg:row-span-2");
    expect(page).toContain("featured={index === 0}");
    expect(page).toContain("Today at a glance");
    expect(page).toContain("ملخص اليوم");
    expect(page).toContain("سجّل حضور كل حصة في ثوانٍ دون إدخال متكرر.");
    expect(page).toContain("Record every lesson in seconds without repetitive entry.");
    expect(page).not.toContain("مجاني بالكامل");
  });

  it("gives each audience a real route and supports signup role preselection", () => {
    expect(page).toContain('href: "/support"');
    expect(page).toContain('href: "/signup?workspace=teacher"');
    expect(page).toContain("border-violet-200");
    expect(page).toContain("border-indigo-200");
    expect(page).toContain("border-emerald-200");
    expect(page).toContain("border-cyan-200");
    expect(page).toContain('href: "/portal/login"');
    expect(page).toContain("مؤسسة");
    expect(page).toContain("تواصل معنا");
    const signup = read("components/auth/signup-form.tsx");
    expect(signup).toContain('params.get("role")');
    expect(signup).toContain('role === "teacher"');
    expect(signup).toContain('role === "academy"');
  });

  it("connects the three how-it-works steps and provides a closing CTA", () => {
    expect(page).toContain("border-l border-dashed border-primary/25 md:hidden");
    expect(page).toContain("border-t border-dashed border-primary/25 md:block");
    expect(page).toContain("ابدأ رحلتك الآن");
    expect(page).toContain("Start your journey now");
  });

  it("keeps legal and support links explicit in a three-part footer", () => {
    expect(page).toContain('href="/terms"');
    expect(page).toContain('href="/privacy"');
    expect(page).toContain('href="/support"');
    expect(page).toContain("مراجعة قانونية");
  });

  it("keeps landing content visible without motion JavaScript", () => {
    expect(motion).toContain("initial={false}");
    expect(motion).not.toContain("initial={reduceMotion ? false : { opacity: 0");
    expect(page).toContain("LandingSectionBoundary");
    expect(page).toContain('label={en ? "Hero" : "الرئيسية"}');
    expect(page).toContain('label={en ? "Features" : "المزايا"}');
    expect(page).toContain('label={en ? "FAQ" : "الأسئلة الشائعة"}');
    expect(page).toContain('label={en ? "Footer" : "التذييل"}');
  });

  it("aligns trust badges and keeps anchors, motion, and LCP stable", () => {
    expect(page).toContain("flex flex-wrap items-center gap-6");
    expect(page).toContain("text-indigo-500");
    expect(page).toContain('id="features"');
    expect(page).toContain('id="experience"');
    expect(page).toContain('id="audiences"');
    expect(page).toContain('id="how"');
    expect(page).toContain('id="faq"');
    expect(page).toContain("Free within core limits");
    expect(page).toContain("ابدأ مجانًا ضمن الحدود الأساسية");
    expect(page).toContain("No credit card required • Core limits apply");
    expect(page).toContain("دون بطاقة ائتمان • ضمن الحدود الأساسية");
    expect(styles).toContain("scroll-behavior: smooth");
    expect(motion).toContain("initial={false}");
    expect(motion).toContain("duration: 0.52");
    expect(motion).toContain("staggerChildren: 0.07");
    expect(page).not.toContain("<img");
    expect(page).not.toContain("next/image");
  });
});
