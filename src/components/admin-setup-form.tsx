"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { LoaderCircle } from "lucide-react";

type SetupFields = {
  identifier: string;
  setupToken: string;
  password: string;
  confirmPassword: string;
};

export function AdminSetupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SetupFields>();
  const password = watch("password");

  async function onSubmit(values: SetupFields) {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/admin-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setServerError(result?.error?.message ?? "Administrator setup was not completed.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setServerError("Unable to complete setup right now. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError && <p className="form-error" role="alert">{serverError}</p>}
      <label className="form-label">
        Predefined administrator email or ID
        <input
          className="form-input"
          autoComplete="username"
          {...register("identifier", { required: "Enter the configured administrator email or ID." })}
        />
        {errors.identifier && <span className="form-error">{errors.identifier.message}</span>}
      </label>
      <label className="form-label">
        Bootstrap secret
        <input
          className="form-input"
          type="password"
          autoComplete="off"
          {...register("setupToken", {
            required: "Enter the bootstrap secret.",
            minLength: { value: 32, message: "Enter the complete bootstrap secret." },
          })}
        />
        {errors.setupToken && <span className="form-error">{errors.setupToken.message}</span>}
      </label>
      <label className="form-label">
        New password
        <input
          className="form-input"
          type="password"
          autoComplete="new-password"
          {...register("password", {
            required: "Choose a password.",
            minLength: { value: 12, message: "Use at least 12 characters." },
            maxLength: { value: 128, message: "Password must be 128 characters or fewer." },
          })}
        />
        {errors.password && <span className="form-error">{errors.password.message}</span>}
      </label>
      <label className="form-label">
        Confirm new password
        <input
          className="form-input"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword", {
            required: "Confirm the password.",
            validate: (value) => value === password || "Passwords do not match.",
          })}
        />
        {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
      </label>
      <button className="button-primary w-full" disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
        Initialize administrator
      </button>
      <p className="text-center text-xs text-slate-500">
        Already initialized? <Link href="/login" className="font-semibold text-emerald-800">Sign in</Link>
      </p>
    </form>
  );
}
