import Link from "next/link";
import { GitFork } from "lucide-react";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-5 py-12">
      <section className="w-full max-w-[430px] rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link
          className="mb-9 inline-flex items-center gap-3"
          href="/login"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white">
            <GitFork aria-hidden="true" className="size-5" />
          </span>
          <span className="text-sm font-bold">Canopy network manager</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 mb-7 text-sm text-slate-500">
          Sign in to continue to your workspace.
        </p>
        <AuthForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          Need an account?{" "}
          <Link className="font-semibold text-emerald-800" href="/register">
            View registration options
          </Link>
        </p>
        <p className="mt-4 text-center text-sm text-slate-500">
          Need to initialize the predefined administrator?{" "}
          <Link className="font-semibold text-emerald-800" href="/admin/setup">
            Securely set it up
          </Link>
        </p>
        <p className="mt-3 text-center text-sm text-slate-500">
          Need to register an administrator?{" "}
          <Link
            className="font-semibold text-emerald-800"
            href="/admin/register"
          >
            Use the creation key
          </Link>
        </p>
      </section>
    </main>
  );
}
