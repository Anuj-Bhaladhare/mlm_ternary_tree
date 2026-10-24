import { getGenealogyTree, listMembers } from "@/modules/members/service";
import { TernaryTreeView } from "@/components/genealogy/ternary-tree-view";
import { getCurrentSession, hasUserPermission } from "@/server/auth/permissions";

export default async function GenealogyPage({
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Ternary Placement Tree
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Interactive ternary genealogy visualization with LEFT, MIDDLE, and RIGHT branch metrics and vacancy detection.
        </p>
      </div>

      <TernaryTreeView
        initialTree={tree}
        existingMembers={allMembers}
        canCreateMembers={canCreateMembers}
      />
    </div>
  );
}
