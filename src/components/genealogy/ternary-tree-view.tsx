"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitFork,
  Search,
  Info,
  RotateCcw,
} from "lucide-react";
import type { TreeNode } from "@/modules/members/service";
import { AddMemberDialog } from "../add-member-dialog";

export function TernaryTreeView({
  initialTree,
  existingMembers = [],
  canCreateMembers,
}: {
  initialTree: TreeNode | null;
  existingMembers: Array<{ id: string; memberCode: string; name: string }>;
  canCreateMembers: boolean;
}) {
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(
    initialTree,
  );
  const [searchCode, setSearchCode] = useState("");

  if (!initialTree) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-500">
          <GitFork className="size-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900">
          Ternary Network Tree is Empty
        </h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          No root member has been placed yet. Initialize the root member to start building the ternary genealogy.
        </p>
        <div className="mt-5">
          {canCreateMembers && <AddMemberDialog existingMembers={[]} />}
        </div>
      </div>
    );
  }

  // Render a single node card in the visual hierarchy
  function renderNode(
    node: TreeNode | null,
    parentId: string | null,
    positionLabel: "LEFT" | "MIDDLE" | "RIGHT",
    level: number,
  ) {
    if (!node) {
      return (
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center transition hover:border-emerald-400 hover:bg-emerald-50/30 w-44 sm:w-52">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {positionLabel} Slot Vacant
            </span>
            <p className="mt-1 text-xs text-slate-500">Available placement</p>
            {canCreateMembers && (
              <div className="mt-3">
                <AddMemberDialog
                  existingMembers={existingMembers}
                  defaultParentId={parentId ?? undefined}
                  defaultPosition={positionLabel}
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    const isSelected = selectedNode?.id === node.id;

    return (
      <div className="flex flex-col items-center">
        {/* Node card */}
        <div
          onClick={() => setSelectedNode(node)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setSelectedNode(node);
            }
          }}
          className={`group relative flex w-44 sm:w-52 cursor-pointer flex-col rounded-xl border p-3.5 transition shadow-xs ${
            isSelected
              ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20"
              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                node.isRoot
                  ? "bg-emerald-100 text-emerald-800"
                  : node.position === "LEFT"
                  ? "bg-blue-100 text-blue-800"
                  : node.position === "MIDDLE"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-purple-100 text-purple-800"
              }`}
            >
              {node.isRoot ? "ROOT" : `${node.position} LEG`}
            </span>
            <span
              className={`size-2 rounded-full ${
                node.status === "ACTIVE"
                  ? "bg-emerald-500"
                  : node.status === "PENDING"
                  ? "bg-amber-400"
                  : "bg-slate-400"
              }`}
              title={node.status}
            />
          </div>

          <div className="mt-2.5">
            <p className="truncate text-xs font-bold text-slate-900">
              {node.name}
            </p>
            <p className="font-mono text-[11px] text-slate-500">
              {node.memberCode}
            </p>
          </div>

          {node.leftCount !== undefined &&
            node.middleCount !== undefined &&
            node.rightCount !== undefined && (
            <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
              <span>L: {node.leftCount}</span>
              <span>M: {node.middleCount}</span>
              <span>R: {node.rightCount}</span>
            </div>
          )}
        </div>

        {/* Render a bounded three-level subtree. */}
        {level < 2 && (
          <div className="w-full flex flex-col items-center">
            {/* Vertical connector */}
            <div className="h-6 w-px bg-slate-300" />

            {/* Horizontal branch bar */}
            <div className="relative w-full flex justify-between">
              <div className="absolute top-0 left-1/4 right-1/4 h-px bg-slate-300" />
            </div>

            {/* Children grid */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-3">
              <div className="flex flex-col items-center">
                <div className="h-3 w-px bg-slate-300 mb-2" />
                {renderNode(node.leftChild, node.id, "LEFT", level + 1)}
              </div>
              <div className="flex flex-col items-center">
                <div className="h-3 w-px bg-slate-300 mb-2" />
                {renderNode(node.middleChild, node.id, "MIDDLE", level + 1)}
              </div>
              <div className="flex flex-col items-center">
                <div className="h-3 w-px bg-slate-300 mb-2" />
                {renderNode(node.rightChild, node.id, "RIGHT", level + 1)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Tree Controls */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchCode.trim()) {
              router.push(
                `/genealogy?member=${encodeURIComponent(searchCode.trim())}`,
              );
            }
          }}
          className="relative flex-1 max-w-sm"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Jump to member code in tree..."
            className="form-input pl-10 text-xs sm:text-sm"
          />
        </form>

        <div className="flex items-center gap-3">
          <Link href="/genealogy" className="button-secondary text-xs">
            <RotateCcw className="size-3.5" />
            Reset to Network Root
          </Link>
          {canCreateMembers && (
            <AddMemberDialog existingMembers={existingMembers} />
          )}
        </div>
      </div>

      {/* Main Visualizer + Inspector Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        {/* Visual Ternary Tree Canvas */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xs xl:col-span-3">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <GitFork className="size-4 text-emerald-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Ternary Placement Hierarchy (3 Levels)
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-500" /> Left Leg
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" /> Middle Leg
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-purple-500" /> Right Leg
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> Active
              </span>
            </div>
          </div>

          <div className="flex min-w-[700px] justify-center py-6">
            {renderNode(initialTree, null, "LEFT", 0)}
          </div>
        </div>

        {/* Selected Member Details Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs xl:col-span-1">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Info className="size-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Node Details Inspector
            </h3>
          </div>

          {selectedNode ? (
            <div className="mt-4 space-y-4">
              <div>
                <span className="text-[11px] font-semibold uppercase text-slate-400">
                  Selected Member
                </span>
                <p className="text-base font-bold text-slate-900">
                  {selectedNode.name}
                </p>
                <p className="font-mono text-xs font-semibold text-slate-600">
                  {selectedNode.memberCode}
                </p>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Placement Role:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedNode.isRoot
                      ? "System Root"
                      : `${selectedNode.position} Position`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {selectedNode.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Enrolled:</span>
                  <span className="text-slate-700">
                    {new Date(selectedNode.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedNode.leftCount !== undefined &&
                selectedNode.middleCount !== undefined &&
                selectedNode.rightCount !== undefined && (
                    <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Subtree Descendant Volumes
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-700 font-medium">Left Leg Count:</span>
                    <strong className="text-slate-800">
                      {selectedNode.leftCount}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-700 font-medium">Middle Leg Count:</span>
                    <strong className="text-slate-800">
                      {selectedNode.middleCount}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-700 font-medium">Right Leg Count:</span>
                    <strong className="text-slate-800">
                      {selectedNode.rightCount}
                    </strong>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href={`/genealogy?member=${encodeURIComponent(
                    selectedNode.memberCode,
                  )}`}
                  className="button-primary w-full text-xs"
                >
                  <GitFork className="size-3.5" />
                  Focus Subtree
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              Click any node in the tree diagram to inspect its placement and subtree counts.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
