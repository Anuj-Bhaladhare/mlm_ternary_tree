import { z } from "zod";
import { jsonError, handleApiError } from "@/lib/api-response";
import { getGenealogyTree, getMemberSubtreeStats } from "@/modules/members/service";
import { requirePermission } from "@/server/auth/permissions";

const genealogyQuerySchema = z.object({
  member: z.string().trim().max(64).optional(),
  depth: z.coerce.number().int().min(1).max(5).default(3),
});

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    await requirePermission("admin.genealogy.view", request.headers);

    const query = genealogyQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    if (!query.success) {
      return jsonError(
        400,
        "INVALID_QUERY",
        "The genealogy parameters are invalid.",
        requestId,
        query.error.issues.map(({ path, message }) => ({
          field: path.join("."),
          message,
        })),
      );
    }

    const tree = await getGenealogyTree(query.data.member, query.data.depth);

    if (!tree) {
      return jsonError(
        404,
        "TREE_ROOT_NOT_FOUND",
        query.data.member
          ? `No ternary tree node found for member "${query.data.member}".`
          : "The ternary network has no root node yet.",
        requestId,
      );
    }

    const stats = await getMemberSubtreeStats(tree.id);

    return Response.json({
      data: {
        tree,
        stats,
      },
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
