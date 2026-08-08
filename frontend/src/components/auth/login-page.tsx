import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

export function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background bg-hero-glow px-6 py-12">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />

      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <LoginForm />
      </div>
    </main>
  );
}
