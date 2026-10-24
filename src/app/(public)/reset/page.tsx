import { GitFork } from "lucide-react";
import { PasswordSetupForm } from "@/components/password-setup-form";

export default function ResetPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-5 py-12">
      <section className="w-full max-w-[430px] rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white"><GitFork aria-hidden="true" className="size-5" /></span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-2 mb-7 text-sm text-slate-500">Use the single-use link provided by an administrator to choose a new password.</p>
        <PasswordSetupForm mode="reset" />
      </section>
    </main>
  );
}
