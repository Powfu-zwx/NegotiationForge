"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  type CompletionStatusValue,
  type SessionInfo,
  type SessionStatusValue,
} from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import {
  getCopy,
  getPhaseDescriptors,
  localizeScenarioBriefing,
} from "@/lib/localization";
import {
  formatAgreementDelta,
  formatAgreementProbability,
  type NegotiationMessageView,
  type NegotiationPhaseId,
  type ScenarioBriefingData,
} from "@/lib/view-models";

interface ChatProps {
  session: SessionInfo;
  scenarioBriefing: ScenarioBriefingData | null;
  messages: NegotiationMessageView[];
  input: string;
  loading: boolean;
  error: string | null;
  endingStatus: CompletionStatusValue | null;
  currentPhase: NegotiationPhaseId;
  currentPhaseIndex: number;
  sessionStatus: SessionStatusValue;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onCompleteSession: (status: CompletionStatusValue) => void;
}

export default function Chat({
  session,
  scenarioBriefing,
  messages,
  input,
  loading,
  error,
  endingStatus,
  currentPhase,
  currentPhaseIndex,
  sessionStatus,
  onInputChange,
  onSend,
  onCompleteSession,
}: ChatProps) {
  const { locale } = useLocale();
  const copy = getCopy(locale);
  const localizedScenario = useMemo(
    () => localizeScenarioBriefing(scenarioBriefing, locale),
    [locale, scenarioBriefing]
  );
  const scenarioTitle = localizedScenario?.title ?? session.context_setting;
  const opponentRole = localizedScenario?.opponentRole ?? session.opponent_role;
  const contextSetting = localizedScenario?.contextSetting ?? session.context_setting;
  const contextBackground = localizedScenario?.contextBackground ?? session.context_background;
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showBriefing, setShowBriefing] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [input]);

  return (
    <section className="flat-panel flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-forge-border px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="forge-chip forge-chip-accent">{copy.chat.console}</span>
              <span className="forge-chip">{localizedScenario?.category ?? copy.chat.phase}</span>
              <span className="forge-chip">{session.opponent_name}</span>
              <span className="forge-chip">{opponentRole}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="font-serif text-[1.45rem] leading-tight text-forge-text">
                {scenarioTitle}
              </h2>
              <span className="text-xs uppercase tracking-[0.16em] text-forge-muted">
                {contextSetting}
              </span>
            </div>
            <p
              className={`mt-2 max-w-4xl text-sm leading-6 text-forge-secondary ${
                showBriefing
                  ? ""
                  : "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
              }`}
            >
              {contextBackground}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowBriefing((current) => !current)}
            className="forge-button-secondary shrink-0"
          >
            {showBriefing
              ? locale === "en"
                ? "Collapse Brief"
                : "收起背景"
              : locale === "en"
              ? "Expand Brief"
              : "展开背景"}
          </button>
        </div>

        <div className="mt-4">
          <PhaseIndicator currentPhase={currentPhase} currentPhaseIndex={currentPhaseIndex} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-4 border-l border-forge-border pl-6">
          {messages.map((message) => (
            <TimelineNode
              key={message.id}
              message={message}
              opponentName={session.opponent_name}
            />
          ))}

          {error && (
            <div className="border border-forge-danger/40 bg-forge-danger/10 px-4 py-3 text-sm leading-7 text-forge-danger">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <footer className="shrink-0 border-t border-forge-border px-5 py-4">
        {sessionStatus === "active" ? (
          <>
            <div className="forge-terminal overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-forge-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-forge-success" />
                  <span className="h-2.5 w-2.5 rounded-full bg-forge-alt" />
                  <span className="h-2.5 w-2.5 rounded-full bg-forge-danger" />
                </div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-secondary">
                  {locale === "en" ? "Negotiation Input" : "谈判输入"}
                </p>
              </div>

              <div className="px-4 py-4">
                <div className="flex items-end gap-4">
                  <div className="min-w-0 flex-1 border border-forge-border bg-forge-surface px-4 py-3">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(event) => onInputChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          onSend();
                        }
                      }}
                      disabled={loading || endingStatus !== null}
                      rows={1}
                      placeholder={copy.chat.placeholder}
                      className="max-h-[180px] w-full resize-none bg-transparent font-mono text-sm leading-7 text-forge-text placeholder:text-forge-muted focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={onSend}
                    disabled={!input.trim() || loading || endingStatus !== null}
                    className="forge-button-primary"
                  >
                    {loading ? copy.chat.sending : copy.chat.send}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs leading-6 text-forge-secondary">
                    {locale === "en"
                      ? "Enter to send, Shift+Enter for a line break."
                      : "Enter 发送，Shift+Enter 换行。"}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void onCompleteSession("agreement")}
                      disabled={loading || endingStatus !== null}
                      className="rounded-sm border border-forge-success/40 bg-forge-success/10 px-4 py-2.5 text-[11px] font-mono uppercase tracking-[0.18em] text-forge-success transition-colors duration-150 hover:bg-forge-success/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {endingStatus === "agreement" ? copy.chat.processing : copy.chat.markAgreement}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onCompleteSession("breakdown")}
                      disabled={loading || endingStatus !== null}
                      className="forge-button-danger"
                    >
                      {endingStatus === "breakdown" ? copy.chat.processing : copy.chat.markBreakdown}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="border border-forge-border bg-forge-panel px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p
                  className={`text-[10px] font-mono uppercase tracking-[0.18em] ${
                    sessionStatus === "agreement" ? "text-forge-success" : "text-forge-danger"
                  }`}
                >
                  {sessionStatus === "agreement"
                    ? copy.chat.readonlyTitleAgreement
                    : copy.chat.readonlyTitleBreakdown}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-forge-secondary">
                  {copy.chat.readonlyBody}
                </p>
              </div>

              <span className="forge-chip">
                {copy.chat.readOnly}
              </span>
            </div>
          </div>
        )}
      </footer>
    </section>
  );
}

function TimelineNode({
  message,
  opponentName,
}: {
  message: NegotiationMessageView;
  opponentName: string;
}) {
  const { locale } = useLocale();
  const copy = getCopy(locale);
  const isPlayer = message.role === "player";
  const probabilityDelta = formatAgreementDelta(message.agreementDelta);
  const probabilityLabel =
    message.agreementProbability !== null && message.agreementProbability !== undefined
      ? formatAgreementProbability(message.agreementProbability)
      : null;
  const indicatorValue =
    message.agreementProbability !== null && message.agreementProbability !== undefined
      ? Math.round(message.agreementProbability * 10)
      : null;

  return (
    <div className="relative animate-fade-up">
      <div className="absolute -left-11 top-3 flex w-8 flex-col items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center border ${
            isPlayer
              ? "border-forge-accent/40 bg-forge-accent/15 text-forge-accent"
              : "border-forge-success/40 bg-forge-success/10 text-forge-success"
          }`}
        >
          <span className="text-[10px] font-mono uppercase tracking-[0.14em]">
            {isPlayer ? copy.chat.you : opponentName.slice(0, 2)}
          </span>
        </div>
      </div>

      {message.isTurningPoint && (
        <div className="mb-3 border border-forge-alt/40 bg-forge-alt/10 px-4 py-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-alt">
            {copy.chat.pivot}
          </p>
          {message.turningReason && (
            <p className="mt-2 text-sm leading-7 text-forge-text">{message.turningReason}</p>
          )}
        </div>
      )}

      <div
        className={`overflow-hidden border ${
          isPlayer
            ? "border-forge-accent/25 bg-forge-user-bubble"
            : "border-forge-border/70 bg-forge-ai-bubble"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-forge-border px-5 py-3">
          <span className={`forge-chip ${isPlayer ? "forge-chip-accent" : "forge-chip-success"}`}>
            {isPlayer ? (locale === "en" ? "Your Move" : "我方动作") : opponentName}
          </span>

          {message.round !== undefined && (
            <span className="forge-chip">{copy.common.round(message.round)}</span>
          )}

          {message.strategyTag && !isPlayer && (
            <span className="forge-chip forge-chip-alt">{message.strategyTag}</span>
          )}

          {probabilityDelta && (
            <span
              className={`forge-chip ${
                message.agreementDelta && message.agreementDelta >= 0
                  ? "forge-chip-success"
                  : "forge-chip-danger"
              }`}
            >
              {copy.chat.agreementProbability} {probabilityDelta}
            </span>
          )}
        </div>

        <div className="px-5 py-4">
          {!isPlayer && indicatorValue !== null && (
            <div className="mb-4 flex items-center justify-between gap-3 border border-forge-border bg-forge-bg px-4 py-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-muted">
                  {copy.chat.currentProbability}
                </p>
                <p className="mt-2 text-sm text-forge-text">{probabilityLabel}</p>
              </div>
              <ConfidenceRail value={indicatorValue} />
            </div>
          )}

          {message.pending ? (
            <ThinkingBlock />
          ) : (
            <p className="text-[15px] leading-8 text-forge-text">{message.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ThinkingBlock() {
  return (
    <div className="border border-forge-border bg-forge-bg px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-sm uppercase tracking-[0.18em] text-forge-accent">
          Parsing counterparty intent
          <span className="ml-1 inline-block h-4 w-[8px] animate-cursor-blink bg-forge-accent align-middle" />
        </p>
        <div className="flex items-end gap-1">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className="h-5 w-1.5 rounded-full bg-forge-accent/80 animate-signal-wave"
              style={{ animationDelay: `${index * 0.12}s` }}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-forge-secondary">
        Streaming tactical interpretation, constraint scan, and next response framing.
      </p>
    </div>
  );
}

function ConfidenceRail({ value }: { value: number }) {
  const heights = ["h-4", "h-4", "h-5", "h-5", "h-6", "h-6", "h-5", "h-4"];

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 8 }, (_, index) => {
        const active = value >= (index + 1) * 12.5;
        return (
          <span
            key={index}
            className={`${heights[index]} w-1.5 rounded-full ${active ? "bg-forge-accent" : "bg-forge-border/40"}`}
          />
        );
      })}
    </div>
  );
}

function PhaseIndicator({
  currentPhase,
  currentPhaseIndex,
}: {
  currentPhase: NegotiationPhaseId;
  currentPhaseIndex: number;
}) {
  const { locale } = useLocale();
  const copy = getCopy(locale);
  const phaseDescriptors = getPhaseDescriptors(locale);

  return (
    <div className="border border-forge-border bg-forge-bg px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
            {copy.chat.phase}
          </p>
          <p className="mt-2 text-sm text-forge-text">
            {phaseDescriptors.find((phase) => phase.id === currentPhase)?.label}
          </p>
        </div>

        <span className="forge-chip forge-chip-accent">
          {phaseDescriptors.find((phase) => phase.id === currentPhase)?.description}
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {phaseDescriptors.map((phase, index) => {
          const isActive = phase.id === currentPhase;
          const isReached = index <= currentPhaseIndex;

          return (
            <div
              key={phase.id}
              className={`border px-4 py-3 transition-colors duration-150 ${
                isActive
                  ? "animate-phase-shift border-forge-accent/30 bg-forge-accent/10"
                  : isReached
                  ? "border-forge-cold/30 bg-forge-panel"
                  : "border-forge-border bg-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p
                  className={`text-[10px] font-mono uppercase tracking-[0.18em] ${
                    isActive
                      ? "text-forge-accent"
                      : isReached
                      ? "text-forge-cold"
                      : "text-forge-secondary"
                  }`}
                >
                  {phase.shortLabel}
                </p>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isActive ? "bg-forge-accent" : isReached ? "bg-forge-cold" : "bg-forge-border/60"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
