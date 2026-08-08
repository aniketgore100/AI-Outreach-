"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Building2, CircleAlert, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/auth/auth-field";
import { GoogleIcon } from "@/components/icons/google-icon";
import { useAppDispatch } from "@/store/hooks";
import { registerUser } from "@/store/slices/auth.slice";

const registerSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Agency or company name must be at least 2 characters.")
    .max(80, "Company name must be 80 characters or fewer."),
  workEmail: z
    .string()
    .trim()
    .email("Enter a valid work email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[A-Z]/, "Include at least one uppercase letter.")
    .regex(/[a-z]/, "Include at least one lowercase letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      companyName: "",
      workEmail: "",
      password: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError(null);

    try {
      await dispatch(
        registerUser({
          companyName: values.companyName,
          email: values.workEmail,
          password: values.password,
        })
      ).unwrap();

      router.push("/dashboard");
    } catch (err) {
      setSubmitError(typeof err === "string" ? err : "We could not create your account right now. Please try again.");
    }
  };

  return (
    <div className="panel-glass rounded-3xl p-6 shadow-md sm:p-8">
      <h2 className="text-2xl font-semibold text-foreground">Create your workspace</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Set up your workspace in minutes and start automating outreach today.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <AuthField
          id="companyName"
          label="Agency / company name"
          icon={Building2}
          placeholder="Northstar Growth"
          error={errors.companyName?.message}
          {...register("companyName")}
        />

        <AuthField
          id="workEmail"
          label="Work email"
          icon={Mail}
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          error={errors.workEmail?.message}
          {...register("workEmail")}
        />

        <AuthField
          id="password"
          label="Password"
          icon={LockKeyhole}
          type={showPassword ? "text" : "password"}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          help="Use 8+ characters with uppercase, lowercase, and a number."
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
              Creating account
            </>
          ) : (
            <>
              Create Account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign In
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
