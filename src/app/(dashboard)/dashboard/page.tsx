import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowDown,
  ArrowDownRight,
  GitFork,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { getDashboardStats, listMembers } from "@/modules/members/service";

export default async function DashboardPage() {
  const [stats, recentMembers] = await Promise.all([
    getDashboardStats(),
    listMembers("", 5, 0),
  ]);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Network Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time ternary tree genealogy, placement metrics, and member activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/members"
            className="button-secondary"
          >
            <Users className="size-4" />
            View Members
          </Link>
          <Link
            href="/genealogy"
            className="button-primary"
          >
            <GitFork className="size-4" />
            Ternary Tree
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Members */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Members
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <Users className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {stats.totalMembers}
            </span>
            <span className="text-xs text-slate-500">enrolled</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-emerald-700">
            <TrendingUp className="mr-1 size-3.5" />
            <span>Authoritative PostgreSQL ledger</span>
          </div>
        </div>

        {/* Left Leg Count */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              LEFT Subtree
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <ArrowDownLeft className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {stats.rootStats.leftCount}
            </span>
            <span className="text-xs text-slate-500">descendants</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Members placed below the root in the LEFT subtree
          </p>
        </div>

        {/* Middle Leg Count */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              MIDDLE Subtree
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <ArrowDown className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {stats.rootStats.middleCount}
            </span>
            <span className="text-xs text-slate-500">descendants</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Members placed below the root in the MIDDLE subtree
          </p>
        </div>

        {/* Right Leg Count */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              RIGHT Subtree
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-purple-50 text-purple-700">
              <ArrowDownRight className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {stats.rootStats.rightCount}
            </span>
            <span className="text-xs text-slate-500">descendants</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Members placed below the root in the RIGHT subtree
          </p>
        </div>

        {/* Active Members */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Members
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-700">
              <UserCheck className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {stats.activeMembers}
            </span>
            <span className="text-xs text-slate-500">
              / {stats.totalMembers} total
            </span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500">
            <span className="inline-block size-2 rounded-full bg-emerald-500 mr-1.5" />
            <span>{stats.pendingMembers} pending activation</span>
          </div>
        </div>
      </div>

      {/* Network Architecture & Root Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Root Member Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
                <ShieldCheck className="size-4" />
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Root Anchor Member
              </h2>
            </div>
            {stats.rootMember && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                {stats.rootMember.status}
              </span>
            )}
          </div>

          {stats.rootMember ? (
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Full Name</p>
                <p className="text-base font-bold text-slate-900">
                  {stats.rootMember.name}
                </p>
              </div>
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-slate-500">Member Code</p>
                  <p className="font-mono text-sm font-semibold text-slate-800">
                    {stats.rootMember.memberCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Placement Date</p>
                  <p className="text-sm text-slate-700">
                    {new Date(stats.rootMember.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-600 mb-2">
                  Root Subtree Distribution
                </p>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>LEFT: {stats.rootStats.leftCount}</span>
                  <span>MIDDLE: {stats.rootStats.middleCount}</span>
                  <span>RIGHT: {stats.rootStats.rightCount}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 flex">
                  <div
                    className="bg-blue-600 h-full"
                    style={{
                      width: `${
                        stats.rootStats.totalDescendants > 0
                          ? (stats.rootStats.leftCount /
                              stats.rootStats.totalDescendants) *
                            100
                          : 100 / 3
                      }%`,
                    }}
                  />
                  <div
                    className="bg-amber-500 h-full"
                    style={{
                      width: `${
                        stats.rootStats.totalDescendants > 0
                          ? (stats.rootStats.middleCount /
                              stats.rootStats.totalDescendants) *
                            100
                          : 100 / 3
                      }%`,
                    }}
                  />
                  <div
                    className="bg-purple-600 h-full"
                    style={{
                      width: `${
                        stats.rootStats.totalDescendants > 0
                          ? (stats.rootStats.rightCount /
                              stats.rootStats.totalDescendants) *
                            100
                          : 100 / 3
                      }%`,
                    }}
                  />
                </div>
              </div>

              <Link
                href="/genealogy"
                className="button-secondary w-full"
              >
                Inspect Ternary Genealogy
              </Link>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">
                No root member has been created yet.
              </p>
              <Link href="/members" className="button-primary mt-4">
                <PlusCircle className="size-4" />
                Initialize Root Member
              </Link>
            </div>
          )}
        </div>

        {/* Recent Enrollments Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Recent Network Enrollments
              </h2>
              <p className="text-xs text-slate-500">
                Latest members placed in the ternary tree
              </p>
            </div>
            <Link
              href="/members"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View all ({stats.totalMembers}) →
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            {recentMembers.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400">
                    <th className="pb-3 pr-4">Member Code</th>
                    <th className="pb-3 px-4">Name</th>
                    <th className="pb-3 px-4">Position</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 pl-4 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-3 pr-4 font-mono text-xs font-semibold text-slate-800">
                        {m.memberCode}
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-medium">
                        {m.name}
                        {m.isRoot && (
                          <span className="ml-2 inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            ROOT
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {m.position ? (
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                              m.position === "LEFT"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {m.position}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Root Node</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            m.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : m.status === "PENDING"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-right text-xs text-slate-500">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-sm text-slate-500">
                No member records found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
