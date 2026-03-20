"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import ForkTree from "@/components/ForkTree";
import { type ForkTree as ForkTreeData, type SessionStatusValue } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import { getCopy } from "@/lib/localization";

interface ForkTreePanelProps {
  sessionStatus: SessionStatusValue;
  status: "pending" | "generating" | "done" | "error";
  forkTree: ForkTreeData | null;
  errorMessage: string | null;
  forkCount: number;
  totalNodes: number;
  elapsedMs: number;
  loading: boolean;
  onTrigger: () => void;
}

export default function ForkTreePanel(props: ForkTreePanelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canFullscreen = props.status === "done" && Boolean(props.forkTree?.root);

  useEffect(() => {
    if (!canFullscreen && isFullscreen) {
      void exitFullscreen(hostRef.current);
    }
  }, [canFullscreen, isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === hostRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const content = useMemo(
    () => (
      <PanelShell
        {...props}
        isFullscreen={isFullscreen}
        onFullscreen={() => void requestHostFullscreen(hostRef.current)}
        onCloseFullscreen={() => void exitFullscreen(hostRef.current)}
      />
    ),
    [isFullscreen, props]
  );

  return (
    <div ref={hostRef} className="fork-tree-fullscreen-host h-full min-h-0">
      {content}
    </div>
  );
}

function PanelShell({
  sessionStatus,
  status,
  forkTree,
  errorMessage,
  forkCount,
  totalNodes,
  elapsedMs,
  loading,
  onTrigger,
  isFullscreen,
  onFullscreen,
  onCloseFullscreen,
}: ForkTreePanelProps & {
  isFullscreen: boolean;
  onFullscreen?: () => void;
  onCloseFullscreen?: () => void;
}) {
  const { locale } = useLocale();
  const copy = getCopy(locale);
  const isNegotiationComplete = sessionStatus !== "active";
  const canFullscreen = status === "done" && Boolean(forkTree?.root);

  const statusLabel =
    sessionStatus === "active"
      ? copy.forkTree.waitingEnd
      : status === "generating"
      ? copy.forkTree.generating
      : status === "done"
      ? copy.forkTree.done
      : status === "error"
      ? copy.forkTree.failed
      : copy.forkTree.pending;

  if (isFullscreen && status === "done" && forkTree?.root) {
    return (
      <section className="relative h-full min-h-0 overflow-hidden bg-forge-bg">
        <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
          <span className="forge-chip forge-chip-accent">{copy.forkTree.title}</span>
          <span className="forge-chip">{statusLabel}</span>
          <span className="forge-chip">{`${forkCount} / ${totalNodes}`}</span>
        </div>
        <div className="absolute right-4 top-4 z-20">
          <button type="button" onClick={onCloseFullscreen} className="forge-button-secondary">
            {copy.forkTree.exitFullscreen}
          </button>
        </div>
        <ForkTree root={forkTree.root} isFullscreen />
      </section>
    );
  }

  return (
    <section className="flat-panel flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-forge-border px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="forge-chip forge-chip-accent">
                {locale === "en" ? "Parallel Outcomes" : "平行结果"}
              </span>
              <span className="forge-chip">{statusLabel}</span>
            </div>
            <h2 className="mt-4 font-serif text-[1.6rem] text-forge-text">
              {copy.forkTree.title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-forge-secondary">
              {copy.forkTree.subtitle}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {canFullscreen && !isFullscreen && (
              <button type="button" onClick={onFullscreen} className="forge-button-secondary">
                {copy.forkTree.fullscreen}
              </button>
            )}

            {isFullscreen && (
              <button type="button" onClick={onCloseFullscreen} className="forge-button-secondary">
                {copy.forkTree.exitFullscreen}
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <StatCard
            label={copy.forkTree.keyBranches}
            value={isNegotiationComplete ? String(forkCount) : "--"}
          />
          <StatCard
            label={copy.forkTree.totalNodes}
            value={isNegotiationComplete ? String(totalNodes) : "--"}
          />
          <StatCard label={copy.forkTree.status} value={statusLabel} />
          <StatCard
            label={
              status === "generating"
                ? copy.forkTree.elapsedLive
                : isFullscreen
                ? copy.forkTree.view
                : copy.forkTree.elapsed
            }
            value={
              status === "generating"
                ? formatElapsed(elapsedMs)
                : isFullscreen
                ? copy.common.full
                : "--:--"
            }
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden px-5 py-5">
        {!isNegotiationComplete && (
          <EmptyState
            title={copy.forkTree.waitingTitle}
            description={copy.forkTree.waitingBody}
            accent={locale === "en" ? "Await session close" : "等待本局结束"}
          />
        )}

        {isNegotiationComplete && status === "pending" && (
          <EmptyState
            title={copy.forkTree.pendingTitle}
            description={copy.forkTree.pendingBody}
            accent={locale === "en" ? "Ready to fork" : "准备生成分叉"}
            actionLabel={loading ? copy.forkTree.starting : copy.forkTree.trigger}
            onAction={onTrigger}
            actionDisabled={loading}
          />
        )}

        {isNegotiationComplete && status === "generating" && (
          <div className="forge-terminal flex h-full flex-col justify-between p-6">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
                {locale === "en" ? "Deduction In Progress" : "推演任务执行中"}
              </p>
              <h3 className="mt-3 font-serif text-2xl text-forge-text">
                {copy.forkTree.generatingTitle}
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-7 text-forge-secondary">
                {copy.forkTree.generatingBody}
              </p>
            </div>

            <div className="mt-8">
              <div className="relative h-2 overflow-hidden bg-forge-border/30">
                <div className="h-full w-1/3 bg-forge-accent" />
                <div className="absolute inset-y-0 left-0 w-1/2 animate-scan-sweep bg-forge-accent/20" />
              </div>

              <div className="mt-6 grid gap-3">
                <HintCard title={copy.forkTree.hintDivergence} body={copy.forkTree.hintDivergenceBody} />
                <HintCard title={copy.forkTree.hintResponse} body={copy.forkTree.hintResponseBody} />
                <HintCard title={copy.forkTree.hintClosure} body={copy.forkTree.hintClosureBody} />
              </div>

              <div className="mt-6 flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.2em] text-forge-accent">
                <span className="inline-block h-4 w-2 animate-cursor-blink bg-forge-accent" />
                <span>
                  {locale === "en" ? "expanding counterfactual tree" : "正在展开反事实路径"}
                </span>
              </div>
            </div>
          </div>
        )}

        {isNegotiationComplete && status === "error" && (
          <EmptyState
            title={copy.forkTree.errorTitle}
            description={errorMessage ?? copy.forkTree.emptyBody}
            accent={locale === "en" ? "Generation Error" : "生成失败"}
            actionLabel={loading ? copy.forkTree.starting : copy.forkTree.retry}
            onAction={onTrigger}
            actionDisabled={loading}
            tone="error"
          />
        )}

        {isNegotiationComplete && status === "done" && forkTree?.root && (
          <div className="h-full overflow-hidden border border-forge-border bg-forge-bg">
            <ForkTree root={forkTree.root} isFullscreen={isFullscreen} />
          </div>
        )}

        {isNegotiationComplete && status === "done" && !forkTree?.root && (
          <EmptyState
            title={copy.forkTree.emptyTitle}
            description={copy.forkTree.emptyBody}
            accent={locale === "en" ? "No branches found" : "未生成分支"}
            actionLabel={loading ? copy.forkTree.starting : copy.forkTree.retry}
            onAction={onTrigger}
            actionDisabled={loading}
          />
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-forge-border bg-forge-panel px-4 py-3">
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-secondary">
        {label}
      </p>
      <p className="mt-2 text-lg text-forge-text">{value}</p>
    </div>
  );
}

function HintCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-forge-border bg-forge-bg p-4">
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
        {title}
      </p>
      <p className="mt-2 text-sm leading-7 text-forge-secondary">{body}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  accent,
  actionLabel,
  onAction,
  actionDisabled,
  tone = "default",
}: {
  title: string;
  description: string;
  accent: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={`flex h-full flex-col justify-between border p-6 ${
        tone === "error"
          ? "border-forge-danger/40 bg-forge-danger/10"
          : "border-forge-border bg-forge-panel"
      }`}
    >
      <div>
        <p
          className={`text-[10px] font-mono uppercase tracking-[0.18em] ${
            tone === "error" ? "text-forge-danger" : "text-forge-accent"
          }`}
        >
          {accent}
        </p>
        <h3 className="mt-3 font-serif text-2xl text-forge-text">{title}</h3>
        <p className="mt-3 max-w-xl text-sm leading-7 text-forge-secondary">{description}</p>
      </div>

      {actionLabel && onAction && (
        <div className="mt-8">
          <button
            type="button"
            onClick={onAction}
            disabled={actionDisabled}
            className={tone === "error" ? "forge-button-danger" : "forge-button-primary"}
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function requestHostFullscreen(element: HTMLDivElement | null) {
  if (!element) {
    return;
  }

  if (document.fullscreenElement === element) {
    return;
  }

  try {
    await element.requestFullscreen();
  } catch {
    // Ignore browser-level fullscreen rejections.
  }
}

async function exitFullscreen(element: HTMLDivElement | null) {
  if (!element) {
    return;
  }

  if (document.fullscreenElement === element) {
    try {
      await document.exitFullscreen();
    } catch {
      // Ignore browser-level fullscreen exit failures.
    }
  }
}
