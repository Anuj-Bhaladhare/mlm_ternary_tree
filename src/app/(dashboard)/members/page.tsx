import Link from "next/link";
import { Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { listMembers, getMemberCounts } from "@/modules/members/service";
import { AddMemberDialog } from "@/components/add-member-dialog";
import { getCurrentSession, hasUserPermission } from "@/server/auth/permissions";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; offset?: string }>;
}) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q?.trim() ?? "";
  const offset = Number(resolvedParams.offset ?? 0);
  const limit = 20;
  const session = await getCurrentSession();
  const canCreateMembers =
    session !== null &&
    (await hasUserPermission(session.user.id, "admin.members.create"));

  const [membersList, totalCount, allMembers] = await Promise.all([
    listMembers(q, limit, offset),
    getMemberCounts(),
    canCreateMembers ? listMembers("", 100, 0) : Promise.resolve([]),
  ]);

  const hasNext = offset + limit < totalCount;
  const hasPrev = offset > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Members Directory
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View, search, and manage ternary network members and placements.
          </p>
        </div>
        <div>
          {canCreateMembers && <AddMemberDialog existingMembers={allMembers} />}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <form className="relative flex-1 max-w-md" method="GET">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or member code..."
            className="form-input pl-10 text-sm"
          />
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Users className="size-4 text-slate-400" />
          <span>
            Total Members: <strong className="text-slate-800">{totalCount}</strong>
          </span>
        </div>
      </div>

      {/* Members Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 pl-6 pr-4">Member</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Placement / Position</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Enrolled</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {membersList.length > 0 ? (
                membersList.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-700">
                          {m.memberCode.slice(0, 2)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {m.name}
                            </span>
                            {m.isRoot && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                ROOT
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-slate-500">
                            {m.memberCode}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs">
                      {m.email ? (
                        <span className="text-slate-600">{m.email}</span>
                      ) : (
                        <span className="text-slate-400">None provided</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {m.isRoot ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          Root Tree Origin
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              m.position === "LEFT"
                                ? "bg-blue-100 text-blue-800"
                                : m.position === "MIDDLE"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {m.position} Leg
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          m.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : m.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-500">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 pl-4 pr-6 text-right">
                      <Link
                        href={`/genealogy?member=${encodeURIComponent(
                          m.memberCode,
                        )}`}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                      >
                        View in Tree →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-sm text-slate-500"
                  >
                    No members found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-500">
            Showing {membersList.length} of {totalCount} members
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/members?q=${encodeURIComponent(q)}&offset=${Math.max(
                0,
                offset - limit,
              )}`}
              aria-disabled={!hasPrev}
              className={`button-secondary px-3 py-1.5 text-xs ${
                !hasPrev ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Link>
            <Link
              href={`/members?q=${encodeURIComponent(q)}&offset=${
                offset + limit
              }`}
              aria-disabled={!hasNext}
              className={`button-secondary px-3 py-1.5 text-xs ${
                !hasNext ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Next
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
