"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  GitFork,
  Info,
  LocateFixed,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Maximize2,
  LoaderCircle,
} from "lucide-react";
import type { TreeNode } from "@/modules/members/service";
import { AddMemberDialog } from "../add-member-dialog";

type Position = NonNullable<TreeNode["position"]>;
type CanvasView = { x: number; y: number; scale: number };
type Point = { x: number; y: number };
type ApiTreeResponse = {
  data?: { tree?: TreeNode };
  error?: { message?: string };
};

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const SUBTREE_DEPTH = 3;
const EMPTY_MEMBERS: Array<{ id: string; memberCode: string; name: string }> = [];

function initialExpandedNodes(
  node: TreeNode | null,
  canCreateMembers: boolean,
  expanded = new Set<string>(),
) {
  if (!node) return expanded;

  if (
    node.depth < SUBTREE_DEPTH &&
    (node.hasChildren || canCreateMembers)
  ) {
    expanded.add(node.id);
  }

  initialExpandedNodes(node.leftChild, canCreateMembers, expanded);
  initialExpandedNodes(node.middleChild, canCreateMembers, expanded);
  initialExpandedNodes(node.rightChild, canCreateMembers, expanded);
  return expanded;
}

function hasLoadedChildren(node: TreeNode) {
  return Boolean(node.leftChild || node.middleChild || node.rightChild);
}

function rebaseDepth(node: TreeNode | null, baseDepth: number): TreeNode | null {
  if (!node) return null;
  return {
    ...node,
    depth: baseDepth + node.depth,
    leftChild: rebaseDepth(node.leftChild, baseDepth),
    middleChild: rebaseDepth(node.middleChild, baseDepth),
    rightChild: rebaseDepth(node.rightChild, baseDepth),
  };
}

function replaceSubtree(
  node: TreeNode,
  targetId: string,
  subtree: TreeNode,
): TreeNode {
  if (node.id === targetId) {
    return {
      ...node,
      hasChildren: subtree.hasChildren,
      leftChild: rebaseDepth(subtree.leftChild, node.depth),
      middleChild: rebaseDepth(subtree.middleChild, node.depth),
      rightChild: rebaseDepth(subtree.rightChild, node.depth),
    };
  }

  return {
    ...node,
    leftChild: node.leftChild
      ? replaceSubtree(node.leftChild, targetId, subtree)
      : null,
    middleChild: node.middleChild
      ? replaceSubtree(node.middleChild, targetId, subtree)
      : null,
    rightChild: node.rightChild
      ? replaceSubtree(node.rightChild, targetId, subtree)
      : null,
  };
}

function findNode(node: TreeNode | null, id: string): TreeNode | null {
  if (!node) return null;
  if (node.id === id) return node;
  return (
    findNode(node.leftChild, id) ??
    findNode(node.middleChild, id) ??
    findNode(node.rightChild, id)
  );
}

type TernaryTreeViewProps = {
  initialTree: TreeNode | null;
  existingMembers?: Array<{ id: string; memberCode: string; name: string }>;
  canCreateMembers: boolean;
};

function treeSignature(node: TreeNode | null): string {
  if (!node) return "empty";
  return [
    node.id,
    node.memberCode,
    node.name,
    node.status,
    node.hasChildren,
    node.position,
    node.leftCount,
    node.middleCount,
    node.rightCount,
    treeSignature(node.leftChild),
    treeSignature(node.middleChild),
    treeSignature(node.rightChild),
  ].join(":");
}

export function TernaryTreeView(props: TernaryTreeViewProps) {
  return (
    <TernaryTreeCanvas
      key={`${treeSignature(props.initialTree)}:${props.canCreateMembers}`}
      {...props}
    />
  );
}

function TernaryTreeCanvas({
  initialTree,
  existingMembers = EMPTY_MEMBERS,
  canCreateMembers,
}: TernaryTreeViewProps) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<CanvasView>({ x: 0, y: 0, scale: 1 });
  const pointerPointsRef = useRef(new Map<number, Point>());
  const lastPointerRef = useRef<{ id: number; point: Point } | null>(null);
  const pinchRef = useRef<{
    distance: number;
    scale: number;
    worldPoint: Point;
  } | null>(null);
  const [tree, setTree] = useState(initialTree);
  const [selectedNodeId, setSelectedNodeId] = useState(initialTree?.id ?? "");
  const [expandedNodes, setExpandedNodes] = useState(() =>
    initialExpandedNodes(initialTree, canCreateMembers),
  );
  const [searchCode, setSearchCode] = useState("");
  const [view, setView] = useState<CanvasView>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<{ id: string; message: string } | null>(
    null,
  );

  const applyView = useCallback((nextView: CanvasView) => {
    viewRef.current = nextView;
    setView(nextView);
  }, []);

  const fitToScreen = useCallback(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;

    const stageWidth = stage.offsetWidth;
    const stageHeight = stage.offsetHeight;
    if (!stageWidth || !stageHeight) return;

    const scale = Math.max(
      MIN_ZOOM,
      Math.min(
        1,
        (viewport.clientWidth - 64) / stageWidth,
        (viewport.clientHeight - 64) / stageHeight,
      ),
    );
    applyView({
      x: (viewport.clientWidth - stageWidth * scale) / 2,
      y: (viewport.clientHeight - stageHeight * scale) / 2,
      scale,
    });
  }, [applyView]);

  const zoomAround = useCallback(
    (requestedScale: number, focalPoint: Point) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const current = viewRef.current;
      const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, requestedScale));
      const ratio = scale / current.scale;
      applyView({
        scale,
        x: focalPoint.x - (focalPoint.x - current.x) * ratio,
        y: focalPoint.y - (focalPoint.y - current.y) * ratio,
      });
    },
    [applyView],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(fitToScreen);
    return () => cancelAnimationFrame(frame);
  }, [fitToScreen]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(fitToScreen);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fitToScreen]);

  const selectedNode = findNode(tree, selectedNodeId);

  const toggleNode = useCallback(async (node: TreeNode) => {
    if (expandedNodes.has(node.id)) {
      setExpandedNodes((current) => {
        const next = new Set(current);
        next.delete(node.id);
        return next;
      });
      return;
    }

    if (node.hasChildren && !hasLoadedChildren(node)) {
      setLoadingNodeId(node.id);
      setLoadError(null);
      try {
        const response = await fetch(
          `/api/genealogy?member=${encodeURIComponent(node.id)}&depth=${SUBTREE_DEPTH}`,
          { cache: "no-store" },
        );
        const result: ApiTreeResponse = await response.json();
        if (!response.ok || !result.data?.tree) {
          throw new Error(
            result.error?.message ?? "Unable to load this member's subtree.",
          );
        }

        const subtree = result.data.tree;
        setTree((current) =>
          current ? replaceSubtree(current, node.id, subtree) : current,
        );
      } catch (error) {
        setLoadError({
          id: node.id,
          message:
            error instanceof Error
              ? error.message
              : "Unable to load this member's subtree.",
        });
        setLoadingNodeId(null);
        return;
      }
      setLoadingNodeId(null);
    }

    setExpandedNodes((current) => new Set(current).add(node.id));
  }, [expandedNodes]);

  function panStart(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(
        "button, a, input, select, textarea, [role='button'], [data-tree-interactive]",
      )
    ) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    pointerPointsRef.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPointerRef.current = { id: event.pointerId, point };
    setIsPanning(true);

    if (event.pointerType === "touch" && pointerPointsRef.current.size >= 2) {
      const [first, second] = [...pointerPointsRef.current.values()];
      const center = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      const current = viewRef.current;
      pinchRef.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        scale: current.scale,
        worldPoint: {
          x: (center.x - current.x) / current.scale,
          y: (center.y - current.y) / current.scale,
        },
      };
      lastPointerRef.current = null;
    }
  }

  function panMove(event: ReactPointerEvent<HTMLDivElement>) {
    const previousPoint = pointerPointsRef.current.get(event.pointerId);
    if (!previousPoint) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    pointerPointsRef.current.set(event.pointerId, point);
    const points = [...pointerPointsRef.current.values()];

    if (pinchRef.current && points.length >= 2) {
      const [first, second] = points;
      const center = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const pinch = pinchRef.current;
      const scale = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, pinch.scale * (distance / pinch.distance)),
      );
      applyView({
        scale,
        x: center.x - pinch.worldPoint.x * scale,
        y: center.y - pinch.worldPoint.y * scale,
      });
      return;
    }

    const drag = lastPointerRef.current;
    if (drag?.id === event.pointerId) {
      applyView({
        ...viewRef.current,
        x: viewRef.current.x + point.x - previousPoint.x,
        y: viewRef.current.y + point.y - previousPoint.y,
      });
      lastPointerRef.current = { id: event.pointerId, point };
    }
  }

  function panEnd(event: ReactPointerEvent<HTMLDivElement>) {
    pointerPointsRef.current.delete(event.pointerId);
    pinchRef.current = null;
    const remaining = [...pointerPointsRef.current.entries()][0];
    lastPointerRef.current = remaining
      ? { id: remaining[0], point: remaining[1] }
      : null;
    setIsPanning(pointerPointsRef.current.size > 0);
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const focalPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    if (event.ctrlKey || event.metaKey) {
      zoomAround(
        viewRef.current.scale * Math.exp(-event.deltaY * 0.002),
        focalPoint,
      );
      return;
    }

    applyView({
      ...viewRef.current,
      x: viewRef.current.x - event.deltaX,
      y: viewRef.current.y - event.deltaY,
    });
  }

  function zoomBy(factor: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    zoomAround(viewRef.current.scale * factor, {
      x: viewport.clientWidth / 2,
      y: viewport.clientHeight / 2,
    });
  }

  const renderNode = useCallback(function renderNode(
    node: TreeNode | null,
    parentId: string | null,
    position: Position,
  ) {
    if (!node) {
      return (
        <div className="flex min-h-[116px] w-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/80 p-3 text-center transition hover:border-emerald-400 hover:bg-emerald-50/50">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              position === "LEFT"
                ? "text-blue-700"
                : position === "MIDDLE"
                  ? "text-amber-700"
                  : "text-purple-700"
            }`}
          >
            {position} Slot Vacant
          </span>
          <p className="mt-1 text-xs text-slate-500">Available placement</p>
          {canCreateMembers && (
            <div className="mt-2" data-tree-interactive>
              <AddMemberDialog
                existingMembers={existingMembers}
                defaultParentId={parentId ?? undefined}
                defaultPosition={position}
              />
            </div>
          )}
        </div>
      );
    }

    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const isLoading = loadingNodeId === node.id;
    const canExpand = node.hasChildren || canCreateMembers;

    return (
      <div className="flex w-max flex-col items-center">
        <div
          className={`flex min-h-[116px] w-52 items-start gap-1 rounded-xl border p-2.5 shadow-sm transition ${
            isSelected
              ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20"
              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
          }`}
        >
          <button
            type="button"
            data-tree-interactive
            aria-pressed={isSelected}
            onClick={() => setSelectedNodeId(node.id)}
            className="flex min-w-0 flex-1 flex-col items-stretch rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <span className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex max-w-[145px] truncate rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                className={`size-2 shrink-0 rounded-full ${
                  node.status === "ACTIVE"
                    ? "bg-emerald-500"
                    : node.status === "PENDING"
                      ? "bg-amber-400"
                      : "bg-slate-400"
                }`}
                title={node.status}
              />
            </span>
            <span className="mt-2.5 block min-w-0">
              <span className="block truncate text-xs font-bold text-slate-900">
                {node.name}
              </span>
              <span className="block truncate font-mono text-[11px] text-slate-500">
                {node.memberCode}
              </span>
            </span>

            {node.leftCount !== undefined &&
              node.middleCount !== undefined &&
              node.rightCount !== undefined && (
                <span className="mt-2.5 flex w-full items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                  <span>L: {node.leftCount}</span>
                  <span>M: {node.middleCount}</span>
                  <span>R: {node.rightCount}</span>
                </span>
              )}
          </button>

          <button
            type="button"
            data-tree-interactive
            disabled={!canExpand || isLoading}
            aria-label={
              isExpanded
                ? `Collapse descendants of ${node.memberCode}`
                : `Expand descendants of ${node.memberCode}`
            }
            title={
              isExpanded
                ? "Collapse descendants"
                : node.hasChildren
                  ? "Expand descendants"
                  : canCreateMembers
                    ? "Show vacant placement slots"
                    : "No descendants"
            }
            onClick={() => void toggleNode(node)}
            className="grid size-7 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        </div>

        {node.hasChildren && !isExpanded && (
          <span className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
            Descendants hidden
          </span>
        )}
        {loadError?.id === node.id && (
          <p role="alert" className="mt-1 max-w-52 text-center text-[10px] text-red-700">
            {loadError.message}
          </p>
        )}

        {isExpanded && (
          <>
            <div className="h-6 w-px bg-slate-300" />
            <div className="relative grid w-max grid-cols-3 pt-3">
              <div className="absolute left-[16.6667%] right-[16.6667%] top-0 h-px bg-slate-300" />
              {(
                [
                  ["LEFT", node.leftChild, "bg-blue-400"],
                  ["MIDDLE", node.middleChild, "bg-amber-400"],
                  ["RIGHT", node.rightChild, "bg-purple-400"],
                ] as const
              ).map(([leg, child, connector]) => (
                <div
                  key={leg}
                  className="flex min-w-[16rem] flex-col items-center"
                >
                  <div className={`h-4 w-px ${connector}`} />
                  {renderNode(child, node.id, leg)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }, [
    canCreateMembers,
    expandedNodes,
    existingMembers,
    loadError,
    loadingNodeId,
    selectedNodeId,
    toggleNode,
  ]);
  const renderedTree = useMemo(
    () => (tree ? renderNode(tree, null, tree.position ?? "LEFT") : null),
    [renderNode, tree],
  );

  if (!initialTree || !tree) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-500">
          <GitFork className="size-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900">
          Ternary Network Tree is Empty
        </h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          No root member has been placed yet. Initialize the root member to start
          building the ternary genealogy.
        </p>
        <div className="mt-5">
          {canCreateMembers && <AddMemberDialog existingMembers={[]} />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (searchCode.trim()) {
              router.push(
                `/genealogy?member=${encodeURIComponent(searchCode.trim())}`,
              );
            }
          }}
          className="relative max-w-sm flex-1"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchCode}
            onChange={(event) => setSearchCode(event.target.value)}
            placeholder="Jump to member code in tree..."
            aria-label="Search tree by member code"
            className="form-input pl-10 text-xs sm:text-sm"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/genealogy" className="button-secondary text-xs">
            <RotateCcw className="size-3.5" />
            Reset to Network Root
          </Link>
          {canCreateMembers && (
            <AddMemberDialog existingMembers={existingMembers} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-xs sm:p-5 xl:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <GitFork className="size-4 text-emerald-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Ternary Placement Hierarchy
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 sm:gap-x-4 sm:text-xs">
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

          <div
            ref={viewportRef}
            onPointerDown={panStart}
            onPointerMove={panMove}
            onPointerUp={panEnd}
            onPointerCancel={panEnd}
            onWheel={handleWheel}
            className={`relative h-[min(72vh,850px)] min-h-[500px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 touch-none select-none ${
              isPanning ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{
              backgroundImage:
                "radial-gradient(circle, rgb(148 163 184 / 28%) 1px, transparent 1px)",
              backgroundSize: `${24 * view.scale}px ${24 * view.scale}px`,
            }}
          >
            <div
              ref={stageRef}
              className="absolute left-0 top-0 inline-flex w-max flex-col items-center px-16 py-14"
              style={{
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                transformOrigin: "0 0",
                transition: isPanning ? "none" : "transform 120ms ease-out",
                willChange: "transform",
              }}
            >
              {renderedTree}
            </div>

            <div
              data-tree-interactive
              className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-md backdrop-blur-sm"
            >
              <button
                type="button"
                title="Zoom in"
                aria-label="Zoom in"
                onClick={() => zoomBy(1.2)}
                className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <Plus className="size-4" />
              </button>
              <button
                type="button"
                title="Zoom out"
                aria-label="Zoom out"
                onClick={() => zoomBy(1 / 1.2)}
                className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <Minus className="size-4" />
              </button>
              <span className="min-w-12 text-center font-mono text-[11px] font-semibold text-slate-600">
                {Math.round(view.scale * 100)}%
              </span>
              <span className="mx-0.5 h-5 w-px bg-slate-200" />
              <button
                type="button"
                title="Fit tree to screen"
                aria-label="Fit tree to screen"
                onClick={fitToScreen}
                className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <Maximize2 className="size-4" />
              </button>
              <button
                type="button"
                title="Reset view to 100%"
                aria-label="Reset view to 100%"
                onClick={() => {
                  const viewport = viewportRef.current;
                  const stage = stageRef.current;
                  if (viewport && stage) {
                    applyView({
                      x: (viewport.clientWidth - stage.offsetWidth) / 2,
                      y: (viewport.clientHeight - stage.offsetHeight) / 2,
                      scale: 1,
                    });
                  }
                }}
                className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <LocateFixed className="size-4" />
              </button>
              <button
                type="button"
                title="Collapse all branches"
                aria-label="Collapse all branches"
                onClick={() => setExpandedNodes(new Set())}
                className="grid size-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>

            <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-[10px] text-slate-500 shadow-sm backdrop-blur-sm">
              Ctrl/⌘ + wheel to zoom · Wheel or drag to pan
            </div>
          </div>
        </div>

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
                  <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Subtree Descendant Volumes
                    </p>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-blue-700">
                        Left Leg Count:
                      </span>
                      <strong className="text-slate-800">
                        {selectedNode.leftCount}
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-amber-700">
                        Middle Leg Count:
                      </span>
                      <strong className="text-slate-800">
                        {selectedNode.middleCount}
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-purple-700">
                        Right Leg Count:
                      </span>
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
              Click any node in the tree diagram to inspect its placement and
              subtree counts.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
