"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";

type AuthFields = {
  identifier: string;
  password: string;
  rememberMe: boolean;
};

export function AuthForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFields>({
    defaultValues: { identifier: "", password: "", rememberMe: true },
  });

  async function onSubmit(values: AuthFields) {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        setServerError("Invalid email, member ID, or password.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setServerError("Unable to sign in right now. Please try again.");
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      {serverError && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {serverError}
        </p>
      )}

      <label className="form-label">
        Email address or member ID
        <input
          autoComplete="username"
          className="form-input"
          {...register("identifier", {
            required: "Enter your email address or member ID.",
            minLength: { value: 3, message: "Enter a valid sign-in identifier." },
            maxLength: { value: 254, message: "Enter a valid sign-in identifier." },
          })}
        />
        {errors.identifier && (
          <span className="form-error">{errors.identifier.message}</span>
        )}
      </label>

      <label className="form-label">
        Password
        <input
          autoComplete="current-password"
          className="form-input"
          type={showPassword ? "text" : "password"}
          {...register("password", {
            required: "Enter your password.",
            maxLength: {
              value: 128,
              message: "Password must be 128 characters or fewer.",
            },
          })}
        />
        {errors.password && (
          <span className="form-error">{errors.password.message}</span>
        )}
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword((visible) => !visible)}
        >
          {showPassword ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
          {showPassword ? "Hide password" : "Show password"}
        </button>
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          className="size-4 accent-emerald-700"
          {...register("rememberMe")}
        />
        Keep me signed in on this device
      </label>

      <button className="button-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <>
            Sign in
            <ArrowRight aria-hidden="true" className="size-4" />
          </>
        )}
      </button>
    </form>
  );
}
