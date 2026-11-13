import { Suspense } from "react";
import { getGenealogyTree, listMembers } from "@/modules/members/service";
import { TernaryTreeView } from "@/components/genealogy/ternary-tree-view";
import { getCurrentSession, hasUserPermission } from "@/server/auth/permissions";

export default function GenealogyPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Ternary Placement Tree
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Interactive ternary genealogy visualization with LEFT, MIDDLE, and
          RIGHT branch metrics and vacancy detection.
        </p>
      </div>

      <Suspense fallback={<GenealogyLoading />}>
        <GenealogyContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function GenealogyContent({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const resolvedParams = await searchParams;
  const targetMember = resolvedParams.member?.trim();
  const session = await getCurrentSession();
  const canCreateMembers =
    session !== null &&
    (await hasUserPermission(session.user.id, "admin.members.create"));

  const [tree, allMembers] = await Promise.all([
    getGenealogyTree(targetMember, 3),
    canCreateMembers ? listMembers("", 100, 0) : Promise.resolve([]),
  ]);

  return (
    <TernaryTreeView
      initialTree={tree}
      existingMembers={allMembers}
      canCreateMembers={canCreateMembers}
    />
  );
}

function GenealogyLoading() {
  return (
    <div
      aria-label="Loading genealogy tree"
      className="grid grid-cols-1 gap-6 xl:grid-cols-4"
    >
      <div className="h-[620px] animate-pulse rounded-xl border border-slate-200 bg-slate-100 xl:col-span-3" />
      <div className="min-h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
    </div>
  );
}
