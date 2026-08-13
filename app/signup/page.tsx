import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { Logo } from "@/components/shared/logo";
import { getCurrentUser, roleHome } from "@/services";
import { redirect } from "next/navigation";

export default function SignupPage() {
  const user = getCurrentUser();
  if (user) redirect(roleHome(user.role));

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="card-surface p-8">
          <h1 className="text-xl font-semibold tracking-tight">
            ابدأ أكاديميتك
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            أنشئ مساحة عمل لأكاديميتك. ستكون أنت المدير (Admin) وتتحكّم في كل شيء.
          </p>
          <div className="mt-6">
            <SignupForm />
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          عندك حساب بالفعل؟{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
