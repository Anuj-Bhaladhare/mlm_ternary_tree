"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { LoaderCircle } from "lucide-react";

type PasswordFields = { password: string; confirmPassword: string };

export function PasswordSetupForm({ mode }: { mode: "activate" | "reset" }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFields>();
  const password = watch("password");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("token"));
  }, []);

  async function onSubmit(values: PasswordFields) {
    if (!token) {
      setServerError("This link is missing its security token. Ask an administrator for a new link.");
      return;
    }
    setServerError(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, token }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setServerError(result?.error?.message ?? "This link is no longer valid.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setServerError("Unable to save the password right now. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError && <p role="alert" className="form-error">{serverError}</p>}
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
      <button className="button-primary w-full" disabled={isSubmitting || !token}>
        {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
        {mode === "activate" ? "Activate account" : "Reset password"}
      </button>
      <p className="text-center text-xs text-slate-500">
        <Link href="/login" className="font-semibold text-emerald-800">Return to sign in</Link>
      </p>
    </form>
  );
}
