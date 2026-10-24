import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api-response";
import { getGenealogyTree, type TreeNode } from "@/modules/members/service";
import { requirePermission } from "@/server/auth/permissions";

const querySchema = z.object({
  rootId: z.union([z.uuid(), z.literal("")]).optional(),
  depth: z.coerce.number().int().min(1).max(5).default(3),
});

function toApiNode(node: TreeNode): {
  id: string;
  memberCode: string;
  displayName: string;
  position: TreeNode["position"];
  status: TreeNode["status"];
  children: { LEFT: ReturnType<typeof toApiNode> | null; MIDDLE: ReturnType<typeof toApiNode> | null; RIGHT: ReturnType<typeof toApiNode> | null };
} {
  return {
    id: node.id,
    memberCode: node.memberCode,
    displayName: node.name,
    position: node.position,
    status: node.status,
    children: {
      LEFT: node.leftChild ? toApiNode(node.leftChild) : null,
      MIDDLE: node.middleChild ? toApiNode(node.middleChild) : null,
      RIGHT: node.rightChild ? toApiNode(node.rightChild) : null,
    },
  };
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    await requirePermission("admin.genealogy.view", request.headers);
    const query = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!query.success) {
      return jsonError(400, "INVALID_QUERY", "Invalid tree parameters.", requestId);
    }

    const tree = await getGenealogyTree(
      query.data.rootId || undefined,
      query.data.depth,
    );
    if (!tree) {
      return jsonError(404, "TREE_ROOT_NOT_FOUND", "No tree root was found.", requestId);
    }

    return Response.json(
      { data: toApiNode(tree) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
