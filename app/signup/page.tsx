import Link from "next/link";
import { Check } from "lucide-react";
import { SignupForm } from "@/components/auth/signup-form";
import { Logo } from "@/components/shared/logo";
import { APP_CONFIG } from "@/lib/constants";
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
            Start your academy
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Create a new academy workspace. You&apos;ll be the admin.
          </p>
          <div className="mt-6">
            <SignupForm />
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
