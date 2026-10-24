"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CircleDollarSign,
  GitFork,
  LayoutDashboard,
  LogOut,
  Settings2,
  UsersRound,
  Wallet,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Members", href: "/members", icon: UsersRound },
  { label: "Ternary tree", href: "/genealogy", icon: GitFork },
  { label: "Commissions", href: "/commissions", icon: CircleDollarSign },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Payouts", href: "/payouts", icon: ArrowUpRight },
  { label: "Settings", href: "/settings", icon: Settings2 },
];

export function DashboardShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const result = await authClient.signOut();
    if (result.error) {
      console.error("Unable to end the current session.", result.error);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link
          className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6"
          href="/dashboard"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white">
            <GitFork aria-hidden="true" className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight">
              Canopy
            </span>
            <span className="block text-xs text-slate-500">Network manager</span>
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="flex-1 space-y-1 px-3 py-6"
        >
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>
          {navigation.map(({ label, href, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(`${href}/`));

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
                href={href}
                key={href}
              >
                <Icon aria-hidden="true" className="size-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <span className="grid size-9 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {userName}
            </span>
          </div>
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            onClick={signOut}
            type="button"
          >
            <LogOut aria-hidden="true" className="size-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8">
            <div>
              <p className="text-xs font-medium text-slate-500">Workspace</p>
              <p className="text-sm font-semibold">Network overview</p>
            </div>
            <span className="hidden text-sm text-slate-600 sm:block">
              Welcome back, {userName}
            </span>
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={signOut}
              type="button"
            >
              <LogOut aria-label="Sign out" className="size-5" />
            </button>
          </div>
          <nav
            aria-label="Mobile navigation"
            className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden"
          >
            {navigation.map(({ label, href, icon: Icon }) => (
              <Link
                aria-current={pathname === href ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${
                  pathname === href
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                href={href}
                key={href}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
