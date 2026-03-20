"use client";

import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { type ForkNode } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import { type Locale, getStrategyLabel } from "@/lib/localization";
import {
  formatAgreementProbability,
  normalizeAnalysisSnapshot,
  resolveForkBranchTone,
  type ForkBranchTone,
  type NormalizedAnalysisSnapshot,
} from "@/lib/view-models";

const LEVEL_GAP = 360;
const ROW_GAP = 220;

interface ForkTreeProps {
  root: ForkNode;
  isFullscreen?: boolean;
}

interface RoundTreeNode {
  id: string;
  round: number;
  tone: ForkBranchTone;
  isMainline: boolean;
  userContent: string | null;
  opponentContent: string | null;
  strategyLabel: string;
  agreementLabel: string;
  analysis: NormalizedAnalysisSnapshot | null;
  isTurningPoint: boolean;
  turningReason: string | null;
  children: RoundTreeNode[];
}

interface LayoutRoundTreeNode extends RoundTreeNode {
  x: number;
  y: number;
  children: LayoutRoundTreeNode[];
}

interface FlowNodeData extends Record<string, unknown> {
  roundNode: RoundTreeNode;
  selected: boolean;
}

type ScoreKey = keyof NonNullable<NormalizedAnalysisSnapshot["scores"]>;

const NODE_TYPES = {
  round: RoundFlowNode,
};

export default function ForkTree({ root, isFullscreen = false }: ForkTreeProps) {
  const { locale } = useLocale();
  const tree = useMemo(() => buildRoundTree(root, locale), [root, locale]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<Node<FlowNodeData>, Edge> | null>(
    null
  );

  useEffect(() => {
    setSelectedNodeId(getInitialSelection(tree));
  }, [tree]);

  useEffect(() => {
    if (!flowInstance) {
      return;
    }

    const timeout = window.setTimeout(() => {
      flowInstance.fitView({
        padding: isFullscreen ? 0.16 : 0.22,
        duration: 320,
        minZoom: 0.36,
        maxZoom: 1.12,
      });
    }, 40);

    return () => window.clearTimeout(timeout);
  }, [flowInstance, tree, isFullscreen]);

  const layoutTree = useMemo(() => assignLayout(tree), [tree]);
  const selectedNode = useMemo(
    () => findRoundNode(tree, selectedNodeId) ?? tree,
    [selectedNodeId, tree]
  );
  const graph = useMemo(
    () => buildGraph(layoutTree, selectedNodeId),
    [layoutTree, selectedNodeId]
  );

  const handleCopy = async (node: RoundTreeNode) => {
    if (!node.userContent) {
      return;
    }

    try {
      await navigator.clipboard.writeText(node.userContent);
      setCopiedNodeId(node.id);
      window.setTimeout(() => {
        setCopiedNodeId((current) => (current === node.id ? null : current));
      }, 1400);
    } catch {
      setCopiedNodeId(null);
    }
  };

  return (
    <ReactFlowProvider>
      <div className="fork-tree-shell h-full min-h-0">
        <div
          className={`grid h-full min-h-0 overflow-hidden ${
            isFullscreen
              ? "grid-cols-[minmax(0,1fr)_420px]"
              : "grid-cols-[minmax(0,1fr)_360px]"
          }`}
        >
          <div className="min-h-0 overflow-hidden bg-forge-bg">
            <ReactFlow
              nodes={graph.nodes}
              edges={graph.edges}
              nodeTypes={NODE_TYPES}
              onInit={(instance) => setFlowInstance(instance)}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              nodesDraggable={false}
              fitView
              proOptions={{ hideAttribution: true }}
              minZoom={0.36}
              maxZoom={1.4}
              defaultEdgeOptions={{ zIndex: 1 }}
            >
              <Background gap={28} size={1} color="rgba(56,189,248,0.12)" />
              <MiniMap
                pannable
                zoomable
                nodeColor={(node) => getToneColor((node.data as FlowNodeData).roundNode.tone)}
                maskColor="rgba(2,6,23,0.38)"
                style={{ width: 154, height: 100 }}
              />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>

          <aside className="fork-detail-panel overflow-y-auto px-5 py-5">
            <DetailPanel
              node={selectedNode}
              locale={locale}
              copiedNodeId={copiedNodeId}
              onCopy={handleCopy}
            />
          </aside>
        </div>
      </div>
    </ReactFlowProvider>
  );
}

function RoundFlowNode({ data }: NodeProps<Node<FlowNodeData>>) {
  const { locale } = useLocale();
  const { roundNode, selected } = data;
  const toneColor = getToneColor(roundNode.tone);

  return (
    <div
      className="w-[300px] overflow-hidden border bg-forge-panel transition-colors duration-150"
      style={{
        borderColor: selected ? toneColor : "rgba(63,63,70,0.9)",
        boxShadow: selected ? `0 0 0 1px ${toneColor}` : "none",
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div
        className="h-1.5 w-full"
        style={{
          background: roundNode.isMainline
            ? "linear-gradient(90deg, rgba(96,165,250,0.92), rgba(56,189,248,0.72))"
            : toneColor,
        }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{formatRound(roundNode.round, locale)}</Badge>
              <Badge tone={roundNode.isMainline ? "accent" : "subtle"}>
                {roundNode.isMainline
                  ? locale === "en"
                    ? "Mainline"
                    : "主线"
                  : locale === "en"
                  ? "Branch"
                  : "分支"}
              </Badge>
              {roundNode.isTurningPoint && (
                <Badge tone="warning">{locale === "en" ? "Pivot" : "转折"}</Badge>
              )}
            </div>

            <p className="mt-3 text-sm font-semibold leading-6 text-forge-text">
              {roundNode.strategyLabel}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-muted">
              {locale === "en" ? "Agreement" : "协议"}
            </p>
            <p className="mt-1 text-sm font-mono text-forge-text">{roundNode.agreementLabel}</p>
          </div>
        </div>

        <NodeSnippet
          label={locale === "en" ? "You" : "我方"}
          body={roundNode.userContent}
        />
        <NodeSnippet
          label={locale === "en" ? "Opponent" : "对手"}
          body={roundNode.opponentContent}
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="truncate text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: toneColor }}>
            {roundNode.isMainline
              ? locale === "en"
                ? "Observed path"
                : "真实路径"
              : roundNode.strategyLabel}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-forge-muted">
            {locale === "en" ? "Open detail" : "查看详情"}
          </span>
        </div>
      </div>
    </div>
  );
}

function NodeSnippet({
  label,
  body,
}: {
  label: string;
  body: string | null;
}) {
  return (
    <div className="mt-3 border border-forge-border bg-forge-bg px-3 py-3">
      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-forge-secondary">
        {label}
      </p>
      <p className="mt-2 overflow-hidden text-sm leading-6 text-forge-text [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
        {body ?? "No text in this round."}
      </p>
    </div>
  );
}

function DetailPanel({
  node,
  locale,
  copiedNodeId,
  onCopy,
}: {
  node: RoundTreeNode;
  locale: Locale;
  copiedNodeId: string | null;
  onCopy: (node: RoundTreeNode) => void;
}) {
  const metrics: Array<{ key: ScoreKey; label: string }> =
    locale === "en"
      ? [
          { key: "leverage", label: "Leverage" },
          { key: "info_advantage", label: "Info Advantage" },
          { key: "relationship", label: "Rapport" },
          { key: "agreement_prob", label: "Agreement Odds" },
          { key: "satisfaction", label: "Satisfaction" },
        ]
      : [
          { key: "leverage", label: "筹码优势" },
          { key: "info_advantage", label: "信息优势" },
          { key: "relationship", label: "关系温度" },
          { key: "agreement_prob", label: "达成概率" },
          { key: "satisfaction", label: "满意度" },
        ];

  return (
    <div className="space-y-4">
      <section className="border border-forge-border bg-forge-panel p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{formatRound(node.round, locale)}</Badge>
          <Badge tone="accent">{node.strategyLabel}</Badge>
          <Badge tone="subtle">{node.agreementLabel}</Badge>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-forge-text">
          {locale === "en" ? "Selected Node" : "当前节点"}
        </h3>
        <p className="mt-2 text-sm leading-7 text-forge-secondary">
          {locale === "en"
            ? "Inspect the exact exchange, score snapshot, and candidate follow-up branches for this round."
            : "查看该轮对话的完整交换、评分快照和后续分支。"}
        </p>
      </section>

      <DetailSection
        title={locale === "en" ? "Your move" : "我方发言"}
        content={node.userContent}
        locale={locale}
      />
      <DetailSection
        title={locale === "en" ? "Opponent response" : "对手回应"}
        content={node.opponentContent}
        locale={locale}
      />

      <section className="border border-forge-border bg-forge-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-forge-accent">
              {locale === "en" ? "Actions" : "操作"}
            </p>
            <p className="mt-2 text-sm text-forge-secondary">
              {locale === "en"
                ? "Copy the selected user move and fork a new negotiation from it."
                : "复制当前用户动作，用它继续新的平行谈判。"}
            </p>
          </div>
          <Badge tone="subtle">
            {locale === "en" ? `${node.children.length} next` : `${node.children.length} 个后续`}
          </Badge>
        </div>

        {node.userContent && (
          <button
            type="button"
            onClick={() => onCopy(node)}
            className={`mt-4 rounded-sm border px-4 py-2 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors duration-150 ${
              copiedNodeId === node.id
                ? "border-forge-success/30 bg-forge-success/10 text-forge-success"
                : "border-forge-accent/30 bg-forge-accent/10 text-forge-accent hover:bg-forge-accent/20"
            }`}
          >
            {copiedNodeId === node.id
              ? locale === "en"
                ? "Copied"
                : "已复制"
              : locale === "en"
              ? "Copy user move"
              : "复制我方动作"}
          </button>
        )}
      </section>

      {node.turningReason && (
        <section className="border border-forge-alt/40 bg-forge-alt/10 p-5">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-forge-alt">
            {locale === "en" ? "Turning Reason" : "转折原因"}
          </p>
          <p className="mt-3 text-sm leading-7 text-forge-text">{node.turningReason}</p>
        </section>
      )}

      {node.analysis && (
        <section className="border border-forge-border bg-forge-panel p-5">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-forge-accent">
            {locale === "en" ? "Situation Scores" : "态势评分"}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                value={node.analysis?.scores[metric.key] ?? 0}
              />
            ))}
          </div>
        </section>
      )}

      {node.children.length > 0 && (
        <section className="border border-forge-border bg-forge-panel p-5">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-forge-accent">
            {locale === "en" ? "Next Branches" : "后续路径"}
          </p>
          <div className="mt-4 space-y-3">
            {node.children.map((child) => (
              <div key={child.id} className="border border-forge-border bg-forge-bg px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{formatRound(child.round, locale)}</Badge>
                  <Badge tone={child.isMainline ? "accent" : "subtle"}>
                    {child.isMainline
                      ? locale === "en"
                        ? "Mainline continuation"
                        : "主线延续"
                      : child.strategyLabel}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-forge-secondary">
                  {child.userContent ?? child.opponentContent}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DetailSection({
  title,
  content,
  locale,
}: {
  title: string;
  content: string | null;
  locale: Locale;
}) {
  return (
    <section className="border border-forge-border bg-forge-panel p-5">
      <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-forge-accent">
        {title}
      </p>
      <p className="mt-3 text-sm leading-7 text-forge-text">
        {content ?? (locale === "en" ? "No text in this simulated round." : "这一轮没有对应文本。")}
      </p>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-forge-border bg-forge-bg px-4 py-3">
      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-forge-secondary">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-forge-text">{value.toFixed(1)}</p>
    </div>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "subtle" | "warning";
}) {
  const className =
    tone === "accent"
      ? "border-forge-accent/30 bg-forge-accent/10 text-forge-accent"
      : tone === "subtle"
      ? "border-forge-border/70 bg-forge-bg/70 text-forge-secondary"
      : tone === "warning"
      ? "border-forge-alt/30 bg-forge-alt/10 text-forge-alt"
      : "border-forge-border/70 bg-forge-panel/80 text-forge-text";

  return (
    <span
      className={`whitespace-nowrap rounded-sm border px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${className}`}
    >
      {children}
    </span>
  );
}

function buildRoundTree(root: ForkNode, locale: Locale): RoundTreeNode {
  return buildRoundTreeNode(root, locale);
}

function buildRoundTreeNode(start: ForkNode, locale: Locale): RoundTreeNode {
  const userNode = start.speaker === "user" ? start : findSameTurnChild(start, "user");
  const opponentNode =
    start.speaker === "opponent" ? start : findSameTurnChild(start, "opponent");

  const baseNode = userNode ?? opponentNode ?? start;
  const analysis =
    normalizeAnalysisSnapshot(opponentNode?.analysis_snapshot ?? null) ??
    normalizeAnalysisSnapshot(userNode?.analysis_snapshot ?? null);

  const continuationRoot = resolveContinuation(userNode, opponentNode, start.is_mainline);
  const branchRoots = userNode
    ? userNode.children.filter((child) => child.speaker === "user" && !child.is_mainline)
    : [];
  const children = [continuationRoot, ...branchRoots]
    .filter((child): child is ForkNode => Boolean(child))
    .map((child) => buildRoundTreeNode(child, locale));

  const strategySource = userNode?.strategy_label ?? opponentNode?.strategy_label ?? "";

  return {
    id: baseNode.node_id,
    round: baseNode.turn,
    tone: resolveForkBranchTone(strategySource, start.is_mainline),
    isMainline: start.is_mainline,
    userContent: userNode?.content ?? (start.speaker === "user" ? start.content : null),
    opponentContent:
      opponentNode?.content ?? (start.speaker === "opponent" ? start.content : null),
    strategyLabel:
      getStrategyLabel(strategySource, locale) ??
      strategySource ??
      (locale === "en" ? "Alternative move" : "替代动作"),
    agreementLabel: formatAgreementProbability(analysis?.scores.agreement_prob ?? null),
    analysis,
    isTurningPoint: Boolean(analysis?.isTurningPoint),
    turningReason: analysis?.turningReason ?? null,
    children,
  };
}

function assignLayout(root: RoundTreeNode): LayoutRoundTreeNode {
  const cursor = { value: 0 };

  const visit = (node: RoundTreeNode, depth: number): LayoutRoundTreeNode => {
    const children = node.children.map((child) => visit(child, depth + 1));
    const x = depth * LEVEL_GAP;
    const y =
      children.length === 0
        ? cursor.value++ * ROW_GAP
        : children.length === 1
        ? children[0].y
        : (children[0].y + children[children.length - 1].y) / 2;

    return {
      ...node,
      x,
      y,
      children,
    };
  };

  return visit(root, 0);
}

function buildGraph(
  root: LayoutRoundTreeNode,
  selectedNodeId: string | null
): {
  nodes: Array<Node<FlowNodeData>>;
  edges: Edge[];
} {
  const nodes: Array<Node<FlowNodeData>> = [];
  const edges: Edge[] = [];

  const visit = (node: LayoutRoundTreeNode) => {
    nodes.push({
      id: node.id,
      type: "round",
      position: { x: node.x, y: node.y },
      data: {
        roundNode: node,
        selected: selectedNodeId === node.id,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    node.children.forEach((child) => {
      const edgeColor = getToneColor(child.tone);
      edges.push({
        id: `${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        type: "smoothstep",
        style: {
          stroke: edgeColor,
          strokeWidth: child.isMainline ? 2.6 : 1.8,
          strokeDasharray: child.isMainline ? undefined : "6 6",
          opacity: child.isMainline || selectedNodeId === child.id ? 1 : 0.82,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: 18,
          height: 18,
        },
      });

      visit(child);
    });
  };

  visit(root);
  return { nodes, edges };
}

function resolveContinuation(
  userNode: ForkNode | null,
  opponentNode: ForkNode | null,
  isMainline: boolean
): ForkNode | null {
  if (opponentNode) {
    return (
      opponentNode.children.find(
        (child) => child.speaker === "user" && child.is_mainline === isMainline
      ) ??
      opponentNode.children.find((child) => child.speaker === "user") ??
      null
    );
  }

  if (userNode) {
    return (
      userNode.children.find(
        (child) =>
          child.speaker === "user" &&
          child.turn > userNode.turn &&
          child.is_mainline === isMainline
      ) ?? null
    );
  }

  return null;
}

function findSameTurnChild(node: ForkNode, speaker: "user" | "opponent"): ForkNode | null {
  return (
    node.children.find((child) => child.turn === node.turn && child.speaker === speaker) ?? null
  );
}

function getInitialSelection(root: RoundTreeNode): string {
  const firstBranch = findFirstBranch(root);
  return firstBranch?.id ?? root.id;
}

function findFirstBranch(node: RoundTreeNode): RoundTreeNode | null {
  for (const child of node.children) {
    if (!child.isMainline) {
      return child;
    }
    const descendant = findFirstBranch(child);
    if (descendant) {
      return descendant;
    }
  }

  return null;
}

function findRoundNode(root: RoundTreeNode, nodeId: string | null): RoundTreeNode | null {
  if (!nodeId) {
    return null;
  }

  if (root.id === nodeId) {
    return root;
  }

  for (const child of root.children) {
    const found = findRoundNode(child, nodeId);
    if (found) {
      return found;
    }
  }

  return null;
}

function formatRound(round: number, locale: Locale): string {
  return locale === "en" ? `Round ${round + 1}` : `第 ${round + 1} 轮`;
}

function getToneColor(tone: ForkBranchTone): string {
  switch (tone) {
    case "mainline":
      return "var(--tree-mainline)";
    case "aggressive":
      return "var(--tree-branch-aggressive)";
    case "concede":
      return "var(--tree-branch-concede)";
    case "redirect":
      return "var(--tree-branch-redirect)";
    default:
      return "var(--tree-branch-neutral)";
  }
}
