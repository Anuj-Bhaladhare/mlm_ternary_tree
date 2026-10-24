import Link from "next/link";
import { GitFork } from "lucide-react";

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-5 py-12">
      <section className="w-full max-w-[430px] rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link className="mb-9 inline-flex items-center gap-3" href="/register">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white">
            <GitFork aria-hidden="true" className="size-5" />
          </span>
          <span className="text-sm font-bold">Canopy network manager</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Accounts are invitation-only</h1>
        <p className="mt-2 mb-7 text-sm text-slate-500">
          A platform administrator creates member accounts and provides a secure,
          single-use activation link. Use that link to set your password; email
          verification and email OTP are not required. Public self-registration
          is disabled so each account is linked to an approved member and placement.
        </p>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link className="font-semibold text-emerald-800" href="/login">
            Return to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
