"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import {
  adminRegistrationSchema,
  type AdminRegistrationInput,
} from "@/modules/auth/rules";

export function AdminRegistrationForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AdminRegistrationInput>();
  async function onSubmit(values: AdminRegistrationInput) {
    setServerError(null);
    const parsed = adminRegistrationSchema.safeParse(values);

    if (!parsed.success) {
      setServerError("Review the email and password details and try again.");
      return;
    }

    try {
      const response = await fetch("/api/auth/admin-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setServerError(
          result?.message ??
            result?.error?.message ??
            "Administrator registration could not be completed.",
        );
        return;
      }

      router.replace("/login?registered=1");
      router.refresh();
    } catch {
      setServerError("Unable to register right now. Please try again.");
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      {serverError && (
        <p className="form-error" role="alert">
          {serverError}
        </p>
      )}

      <label className="form-label">
        Email address
        <input
          autoComplete="email"
          className="form-input"
          type="email"
          {...register("email", {
            required: "Enter your email address.",
            maxLength: { value: 254, message: "Enter a valid email address." },
          })}
        />
        {errors.email && (
          <span className="form-error">{errors.email.message}</span>
        )}
      </label>

      <label className="form-label">
        Password
        <input
          autoComplete="new-password"
          className="form-input"
          type={showPassword ? "text" : "password"}
          {...register("password", {
            required: "Choose a password.",
            minLength: { value: 12, message: "Use at least 12 characters." },
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

      <label className="form-label">
        Confirm password
        <input
          autoComplete="new-password"
          className="form-input"
          type={showConfirmPassword ? "text" : "password"}
          {...register("confirmPassword", {
            required: "Confirm your password.",
            validate: (value) =>
              value === getValues("password") || "Passwords do not match.",
          })}
        />
        {errors.confirmPassword && (
          <span className="form-error">
            {errors.confirmPassword.message}
          </span>
        )}
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs text-slate-600"
          aria-label={
            showConfirmPassword
              ? "Hide confirmation password"
              : "Show confirmation password"
          }
          onClick={() => setShowConfirmPassword((visible) => !visible)}
        >
          {showConfirmPassword ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
          {showConfirmPassword ? "Hide password" : "Show password"}
        </button>
      </label>

      <label className="form-label">
        Administrator creation key
        <input
          autoComplete="off"
          className="form-input"
          type="password"
          {...register("secretKey", {
            required: "Enter the administrator creation key.",
            maxLength: {
              value: 512,
              message: "The administrator creation key is invalid.",
            },
          })}
        />
        {errors.secretKey && (
          <span className="form-error">{errors.secretKey.message}</span>
        )}
      </label>

      <button className="button-primary w-full" disabled={isSubmitting}>
        {isSubmitting && (
          <LoaderCircle
            className="size-4 animate-spin"
            aria-hidden="true"
          />
        )}
        Create administrator account
      </button>

      <p className="text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link className="font-semibold text-emerald-800" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
