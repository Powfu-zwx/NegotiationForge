"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AnalysisPanel from "@/components/AnalysisPanel";
import Chat from "@/components/Chat";
import ForkTreePanel from "@/components/ForkTreePanel";
import SummaryModal from "@/components/SummaryModal";
import {
  ApiError,
  completeSession,
  createSummary,
  getAnalysis,
  getForkTree,
  getSummary,
  sendMessage,
  triggerForkTree,
  type AnalysisResult,
  type CompletionStatusValue,
  type ForkTree,
  type ForkTreeStatusResponse,
  type OpponentState,
  type SessionInfo,
  type SessionStatusValue,
  type SummaryContent,
} from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import {
  getCopy,
  getPhaseDescriptors,
  getStrategyLabel,
  localizeScenarioBriefing,
  type Locale,
} from "@/lib/localization";
import {
  getAgreementDeltaMap,
  type NegotiationMessageView,
  type NegotiationPhaseId,
  type ScenarioBriefingData,
} from "@/lib/view-models";

const ANALYSIS_POLL_INTERVAL_MS = 2000;
const ANALYSIS_POLL_MAX_ATTEMPTS = 6;
const TREE_POLL_INTERVAL_MS = 3000;

interface ConversationMessage {
  id: string;
  role: "player" | "opponent";
  content: string;
  round?: number;
  pending?: boolean;
  strategyTag?: string;
  phase?: NegotiationPhaseId;
}

interface NegotiationWorkspaceProps {
  session: SessionInfo;
  scenarioBriefing: ScenarioBriefingData | null;
  onSessionStatusChange?: (status: SessionStatusValue) => void;
}

function isCompleteTree(data: ForkTree | ForkTreeStatusResponse): data is ForkTree {
  return "root" in data;
}

export default function NegotiationWorkspace({
  session,
  scenarioBriefing,
  onSessionStatusChange,
}: NegotiationWorkspaceProps) {
  const { locale } = useLocale();
  const copy = getCopy(locale);
  const phaseDescriptors = getPhaseDescriptors(locale);
  const localizedScenario = useMemo(
    () => localizeScenarioBriefing(scenarioBriefing, locale),
    [locale, scenarioBriefing]
  );

  const [conversation, setConversation] = useState<ConversationMessage[]>(() => [
    {
      id: "intro",
      role: "opponent",
      content: buildIntroMessage(session, localizedScenario, locale),
      phase: "opening",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [endingStatus, setEndingStatus] = useState<CompletionStatusValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opponentState, setOpponentState] = useState<OpponentState | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatusValue>("active");

  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [pendingRound, setPendingRound] = useState<number | null>(null);

  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summary, setSummary] = useState<SummaryContent | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [forkStatus, setForkStatus] = useState<"pending" | "generating" | "done" | "error">(
    "pending"
  );
  const [forkTree, setForkTree] = useState<ForkTree | null>(null);
  const [forkErrorMessage, setForkErrorMessage] = useState<string | null>(null);
  const [forkCount, setForkCount] = useState(0);
  const [totalNodes, setTotalNodes] = useState(0);
  const [forkStartedAt, setForkStartedAt] = useState<number | null>(null);
  const [forkElapsedMs, setForkElapsedMs] = useState(0);
  const [forkLoading, setForkLoading] = useState(false);

  const pollRef = useRef<number | null>(null);
  const elapsedRef = useRef<number | null>(null);

  useEffect(() => {
    onSessionStatusChange?.(sessionStatus);
  }, [onSessionStatusChange, sessionStatus]);

  const clearForkTimers = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (elapsedRef.current !== null) {
      window.clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
  }, []);

  const applyForkTreeResponse = useCallback(
    (data: ForkTree | ForkTreeStatusResponse) => {
      if (isCompleteTree(data)) {
        setForkStatus("done");
        setForkTree(data);
        setForkErrorMessage(data.error_message);
        setForkCount(data.fork_count);
        setTotalNodes(data.total_nodes);
        setForkStartedAt(null);
        setForkElapsedMs(0);
        clearForkTimers();
        return;
      }

      setForkTree(null);
      setForkStatus(data.status);
      setForkErrorMessage(data.error_message);
      setForkCount(data.fork_count);
      setTotalNodes(data.total_nodes);

      if (data.status === "generating") {
        setForkStartedAt((previous) => previous ?? Date.now());
      } else {
        setForkStartedAt(null);
        setForkElapsedMs(0);
        clearForkTimers();
      }
    },
    [clearForkTimers]
  );

  const fetchCurrentForkTree = useCallback(async () => {
    try {
      const data = await getForkTree(session.session_id);
      applyForkTreeResponse(data);
    } catch (nextError) {
      setForkStatus("error");
      setForkTree(null);
      setForkErrorMessage(
        nextError instanceof Error
          ? nextError.message
          : locale === "en"
          ? "Failed to load the fork tree."
          : "分叉树加载失败。"
      );
      clearForkTimers();
    }
  }, [applyForkTreeResponse, clearForkTimers, locale, session.session_id]);

  useEffect(() => {
    if (sessionStatus === "active") {
      setForkStatus("pending");
      setForkTree(null);
      setForkErrorMessage(null);
      setForkCount(0);
      setTotalNodes(0);
      setForkStartedAt(null);
      setForkElapsedMs(0);
      clearForkTimers();
      return;
    }

    void fetchCurrentForkTree();
    return clearForkTimers;
  }, [clearForkTimers, fetchCurrentForkTree, sessionStatus]);

  useEffect(() => {
    clearForkTimers();

    if (forkStatus !== "generating") {
      return;
    }

    const startedAt = forkStartedAt ?? Date.now();
    setForkElapsedMs(Date.now() - startedAt);

    pollRef.current = window.setInterval(() => {
      void fetchCurrentForkTree();
    }, TREE_POLL_INTERVAL_MS);

    elapsedRef.current = window.setInterval(() => {
      setForkElapsedMs(Date.now() - startedAt);
    }, 1000);

    return clearForkTimers;
  }, [clearForkTimers, fetchCurrentForkTree, forkStartedAt, forkStatus]);

  useEffect(
    () => () => {
      clearForkTimers();
    },
    [clearForkTimers]
  );

  const pollForAnalysis = useCallback(
    async (targetRound: number) => {
      setPendingRound(targetRound);

      for (let attempt = 0; attempt < ANALYSIS_POLL_MAX_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, ANALYSIS_POLL_INTERVAL_MS));

        try {
          const data = await getAnalysis(session.session_id);
          const found = data.results.find((result) => result.round === targetRound);

          if (found) {
            setAnalysisResults((previous) => {
              const deduped = previous.filter((result) => result.round !== targetRound);
              return [...deduped, found].sort((left, right) => left.round - right.round);
            });
            setPendingRound(null);
            return;
          }
        } catch {
          // Keep polling quietly.
        }
      }

      setPendingRound(null);
    },
    [session.session_id]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || sessionStatus !== "active") {
      return;
    }

    setInput("");
    setError(null);

    const playerMessageId = `player-${Date.now()}`;
    const opponentMessageId = `opponent-${Date.now()}`;

    setConversation((previous) => [
      ...previous,
      { id: playerMessageId, role: "player", content: text },
      { id: opponentMessageId, role: "opponent", content: "", pending: true },
    ]);
    setLoading(true);

    try {
      const result = await sendMessage(session.session_id, text);
      const currentRound = result.state.round_count - 1;
      const phase = normalizePhase(result.state.current_phase);

      setConversation((previous) =>
        previous.map((message) => {
          if (message.id === playerMessageId) {
            return { ...message, round: currentRound, phase };
          }

          if (message.id === opponentMessageId) {
            return {
              ...message,
              content: result.reply,
              pending: false,
              round: currentRound,
              strategyTag: result.state.current_strategy,
              phase,
            };
          }

          return message;
        })
      );
      setOpponentState(result.state);
      setSessionStatus(result.session_status);
      void pollForAnalysis(currentRound);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : locale === "en"
          ? "Failed to send the message."
          : "消息发送失败。"
      );
      setConversation((previous) =>
        previous.filter((message) => message.id !== opponentMessageId)
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, locale, pollForAnalysis, session.session_id, sessionStatus]);

  const handleCompleteSession = useCallback(
    async (status: CompletionStatusValue) => {
      if (loading || endingStatus || sessionStatus !== "active") {
        return;
      }

      setError(null);
      setEndingStatus(status);

      try {
        const result = await completeSession(session.session_id, status);
        setSessionStatus(result.session_status);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : locale === "en"
            ? "Failed to finish the negotiation."
            : "谈判结束失败。"
        );
      } finally {
        setEndingStatus(null);
      }
    },
    [endingStatus, loading, locale, session.session_id, sessionStatus]
  );

  const handleTriggerForkTree = useCallback(async () => {
    setForkLoading(true);
    setForkErrorMessage(null);

    try {
      const response = await triggerForkTree(session.session_id);
      setForkStatus(response.status);

      if (response.status === "generating") {
        const start = Date.now();
        setForkStartedAt(start);
        setForkElapsedMs(0);
      }

      await fetchCurrentForkTree();
    } catch (nextError) {
      setForkStatus("error");
      setForkErrorMessage(
        nextError instanceof Error
          ? nextError.message
          : locale === "en"
          ? "Failed to trigger fork generation."
          : "触发分叉树生成失败。"
      );
    } finally {
      setForkLoading(false);
    }
  }, [fetchCurrentForkTree, locale, session.session_id]);

  const ensureSummaryLoaded = useCallback(async () => {
    if (summary || summaryLoading || sessionStatus === "active") {
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const result = await getSummary(session.session_id);
      setSummary(result.summary);
    } catch (nextError) {
      if (!(nextError instanceof ApiError && nextError.status === 404)) {
        setSummaryError(
          nextError instanceof Error
            ? nextError.message
            : locale === "en"
            ? "Failed to load the recap."
            : "复盘读取失败。"
        );
      }
    } finally {
      setSummaryLoading(false);
    }
  }, [locale, session.session_id, sessionStatus, summary, summaryLoading]);

  const handleOpenSummary = useCallback(() => {
    if (sessionStatus === "active") {
      return;
    }

    setIsSummaryOpen(true);
    void ensureSummaryLoaded();
  }, [ensureSummaryLoaded, sessionStatus]);

  const handleGenerateSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const result = await createSummary(session.session_id);
      setSummary(result.summary);
    } catch (nextError) {
      setSummaryError(
        nextError instanceof Error
          ? nextError.message
          : locale === "en"
          ? "Failed to generate the recap."
          : "复盘生成失败。"
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [locale, session.session_id]);

  const sortedAnalysisResults = useMemo(
    () => [...analysisResults].sort((left, right) => left.round - right.round),
    [analysisResults]
  );
  const analysisByRound = useMemo(
    () => new Map(sortedAnalysisResults.map((result) => [result.round, result])),
    [sortedAnalysisResults]
  );
  const agreementDeltaMap = useMemo(
    () => getAgreementDeltaMap(sortedAnalysisResults),
    [sortedAnalysisResults]
  );

  const messages = useMemo<NegotiationMessageView[]>(
    () =>
      conversation.map((message) => {
        const analysis = message.round !== undefined ? analysisByRound.get(message.round) : null;
        const isTurningPoint =
          message.role === "player" ? Boolean(analysis?.is_turning_point) : false;

        return {
          ...message,
          speaker: message.role === "player" ? "user" : "opponent",
          strategyTag: message.strategyTag
            ? getStrategyLabel(message.strategyTag, locale) ?? message.strategyTag
            : undefined,
          agreementDelta:
            message.round !== undefined ? agreementDeltaMap.get(message.round) ?? null : null,
          agreementProbability: analysis?.scores.agreement_prob ?? null,
          isTurningPoint,
          turningReason: isTurningPoint ? analysis?.turning_reason ?? null : null,
        };
      }),
    [agreementDeltaMap, analysisByRound, conversation, locale]
  );

  const currentPhase = normalizePhase(opponentState?.current_phase);
  const currentPhaseLabel =
    phaseDescriptors.find((phase) => phase.id === currentPhase)?.label ??
    phaseDescriptors[0]?.label ??
    "--";
  const currentPhaseIndex = phaseDescriptors.findIndex((phase) => phase.id === currentPhase);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 border border-forge-border bg-forge-surface px-4 py-3">
          <WorkspaceSignal
            label={locale === "en" ? "Opponent" : "对手"}
            value={session.opponent_name}
            detail={localizedScenario?.opponentRole ?? session.opponent_role}
          />
          <WorkspaceSignal
            label={copy.chat.phase}
            value={currentPhaseLabel}
            detail={localizedScenario?.contextSetting ?? session.context_setting}
          />
          <WorkspaceSignal
            label={copy.forkTree.title}
            value={
              sessionStatus === "active"
                ? locale === "en"
                  ? "Locked"
                  : "锁定"
                : locale === "en"
                ? "Ready"
                : "可推演"
            }
            detail={
              sessionStatus === "active"
                ? copy.forkTree.waitingEnd
                : `${forkCount} / ${totalNodes || "--"}`
            }
            tone={sessionStatus === "active" ? "warning" : "accent"}
          />
          <WorkspaceSignal
            label={copy.summary.title}
            value={
              sessionStatus === "active"
                ? locale === "en"
                  ? "Pending"
                  : "待生成"
                : locale === "en"
                ? "Available"
                : "可查看"
            }
            detail={
              sessionStatus === "agreement"
                ? locale === "en"
                  ? "Agreement archived"
                  : "协议结果已归档"
                : sessionStatus === "breakdown"
                ? locale === "en"
                  ? "Breakdown archived"
                  : "破裂结果已归档"
                : locale === "en"
                ? "Wait until the session closes"
                : "需等待本局结束"
            }
            tone={sessionStatus === "breakdown" ? "danger" : "success"}
          />
          <p className="ml-auto text-xs leading-6 text-forge-secondary">
            {localizedScenario?.contextSetting ?? session.context_setting}
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.72fr)_290px_340px]">
          <div className="min-h-0">
            <Chat
              session={session}
              scenarioBriefing={scenarioBriefing}
              messages={messages}
              input={input}
              loading={loading}
              error={error}
              endingStatus={endingStatus}
              currentPhase={currentPhase}
              currentPhaseIndex={currentPhaseIndex}
              sessionStatus={sessionStatus}
              onInputChange={setInput}
              onSend={handleSend}
              onCompleteSession={handleCompleteSession}
            />
          </div>

          <div className="min-h-0">
            <AnalysisPanel
              opponentState={opponentState}
              results={sortedAnalysisResults}
              pendingRound={pendingRound}
              sessionStatus={sessionStatus}
              onShowSummary={handleOpenSummary}
            />
          </div>

          <div className="min-h-0">
            <ForkTreePanel
              sessionStatus={sessionStatus}
              status={forkStatus}
              forkTree={forkTree}
              errorMessage={forkErrorMessage}
              forkCount={forkCount}
              totalNodes={totalNodes}
              elapsedMs={forkElapsedMs}
              loading={forkLoading}
              onTrigger={handleTriggerForkTree}
            />
          </div>
        </div>
      </div>

      {isSummaryOpen && (
        <SummaryModal
          session={session}
          scenarioBriefing={scenarioBriefing}
          sessionStatus={sessionStatus}
          summary={summary}
          loading={summaryLoading}
          error={summaryError}
          onGenerate={handleGenerateSummary}
          onClose={() => setIsSummaryOpen(false)}
        />
      )}
    </>
  );
}

function normalizePhase(phase: string | null | undefined): NegotiationPhaseId {
  return getPhaseDescriptors("zh").some((descriptor) => descriptor.id === phase)
    ? (phase as NegotiationPhaseId)
    : "opening";
}

function buildIntroMessage(
  session: SessionInfo,
  scenarioBriefing: ScenarioBriefingData | null,
  locale: Locale
): string {
  const localizedScenario = localizeScenarioBriefing(scenarioBriefing, locale);
  const role = localizedScenario?.opponentRole ?? session.opponent_role;
  const background = localizedScenario?.contextBackground ?? session.context_background;

  if (locale === "en") {
    return `Hello. I'm ${session.opponent_name}, ${role}. ${background}`;
  }

  return `你好，我是${session.opponent_name}，${role}。${background}`;
}

function WorkspaceSignal({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "accent" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "accent"
      ? "border-forge-accent/40 bg-forge-accent/10 text-forge-accent"
      : tone === "success"
      ? "border-forge-success/40 bg-forge-success/10 text-forge-success"
      : tone === "warning"
      ? "border-forge-alt/40 bg-forge-alt/10 text-forge-alt"
      : tone === "danger"
      ? "border-forge-danger/40 bg-forge-danger/10 text-forge-danger"
      : "border-forge-border bg-forge-panel text-forge-text";

  return (
    <div title={detail} className={`inline-flex items-center gap-2 border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-muted">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
