import Link from "next/link";
import { redirect } from "next/navigation";
import { GitFork, ArrowRight, ShieldCheck, Database } from "lucide-react";
import { getCurrentSession } from "@/server/auth/permissions";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900 flex flex-col justify-between">
      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white">
              <GitFork className="size-5" />
            </span>
            <div>
              <span className="block text-sm font-bold tracking-tight">Canopy</span>
              <span className="block text-xs text-slate-500">Ternary Tree MLM Management</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="button-secondary text-xs sm:text-sm">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-24">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 mb-6">
          <ShieldCheck className="size-3.5 text-emerald-700" />
          Enterprise-Grade Ternary MLM Management Platform
        </span>

        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
          Multi-Level Marketing{" "}
          <span className="text-emerald-700">Ternary Tree Architecture</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg">
          Manage member enrollments, LEFT/MIDDLE/RIGHT placement invariants, recursive genealogy queries, and auditable ledger operations with PostgreSQL and Next.js.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login" className="button-primary w-full sm:w-auto px-6 py-3 text-base">
            Enter Workspace
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 text-left">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 mb-4">
              <GitFork className="size-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Strict Ternary Invariants
            </h2>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Database-enforced constraints allow one child in each LEFT, MIDDLE, and RIGHT slot, with one unique root.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-700 mb-4">
              <Database className="size-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Recursive CTE Traversal
            </h2>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              PostgreSQL recursive queries compute separate LEFT, MIDDLE, and RIGHT subtree counts without loading entire networks into memory.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="grid size-10 place-items-center rounded-lg bg-purple-50 text-purple-700 mb-4">
              <ShieldCheck className="size-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Role-Based Security
            </h2>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Server-side authorization verifies privileges on every operation, with comprehensive audit logging of all tree mutations.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>Canopy MLM Ternary Tree Management System • Built with Next.js App Router, PostgreSQL, Drizzle ORM, and Tailwind CSS</p>
      </footer>
    </div>
  );
}
