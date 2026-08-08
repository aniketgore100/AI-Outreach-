"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleAlert, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/auth/auth-field";
import { GoogleIcon } from "@/components/icons/google-icon";
import { useAppDispatch } from "@/store/hooks";
import { loginUser } from "@/store/slices/auth.slice";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);

    try {
      await dispatch(loginUser(values)).unwrap();
      router.push("/dashboard");
    } catch (err) {
      setSubmitError(typeof err === "string" ? err : "We could not sign you in right now. Please try again.");
    }
  };

  return (
    <div className="panel-glass rounded-3xl p-6 shadow-md sm:p-8">
      <h2 className="text-2xl font-semibold text-foreground">Sign in</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Welcome back — pick up your outreach right where you left off.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <AuthField
          id="email"
          label="Work email"
          icon={Mail}
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <AuthField
          id="password"
          label="Password"
          icon={LockKeyhole}
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-muted-foreground transition duration-150 hover:text-foreground active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register("password")}
        />

        {submitError ? (
          <p className="flex items-center gap-1.5 text-small text-destructive">
            <CircleAlert className="h-3.5 w-3.5 shrink-0" />
            {submitError}
          </p>
        ) : null}

        <Button type="submit" variant="gradient" size="xl" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>

        <div className="flex items-center gap-3 text-caption uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Or
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="glass" size="xl" className="w-full gap-2.5">
          <GoogleIcon className="h-4 w-4" />
          Continue with Google
        </Button>
      </form>
    </div>
  );
}
