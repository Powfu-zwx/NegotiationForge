"use client";

import { type SessionInfo, type SessionStatusValue, type SummaryContent } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import { getCopy, localizeScenarioBriefing } from "@/lib/localization";
import { type ScenarioBriefingData } from "@/lib/view-models";

interface SummaryModalProps {
  session: SessionInfo;
  scenarioBriefing: ScenarioBriefingData | null;
  sessionStatus: SessionStatusValue;
  summary: SummaryContent | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
  onClose: () => void;
}

export default function SummaryModal({
  session,
  scenarioBriefing,
  sessionStatus,
  summary,
  loading,
  error,
  onGenerate,
  onClose,
}: SummaryModalProps) {
  const { locale } = useLocale();
  const copy = getCopy(locale);
  const localizedScenario = localizeScenarioBriefing(scenarioBriefing, locale);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.72)] p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="forge-panel relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden">
        <header className="relative flex shrink-0 items-start justify-between gap-4 border-b border-forge-border px-7 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="forge-chip forge-chip-accent">{copy.summary.recap}</span>
              <span
                className={`forge-chip ${
                  sessionStatus === "agreement" ? "forge-chip-success" : "forge-chip-danger"
                }`}
              >
                {sessionStatus === "agreement"
                  ? copy.summary.closedAgreement
                  : copy.summary.closedBreakdown}
              </span>
            </div>
            <h2 className="mt-4 font-serif text-[1.8rem] text-forge-text">
              {copy.summary.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-forge-secondary">
              {session.opponent_name} / {localizedScenario?.opponentRole ?? session.opponent_role}
            </p>
          </div>

          <button type="button" onClick={onClose} className="forge-button-secondary">
            {copy.common.close}
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-7 py-6">
          {!summary && !loading && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <p className="max-w-xl text-sm leading-7 text-forge-secondary">
                {copy.summary.noSummary}
              </p>
              <button type="button" onClick={onGenerate} className="forge-button-primary mt-6">
                {copy.summary.generate}
              </button>
              {error && <p className="mt-4 text-sm text-forge-danger">{error}</p>}
            </div>
          )}

          {loading && !summary && (
            <div className="flex min-h-[360px] flex-col items-center justify-center">
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className="h-8 w-1.5 origin-bottom rounded-full bg-forge-accent animate-signal-wave"
                    style={{ animationDelay: `${index * 0.12}s` }}
                  />
                ))}
              </div>
              <p className="mt-5 text-sm text-forge-secondary">{copy.summary.analyzing}</p>
            </div>
          )}

          {summary && (
            <div className="space-y-7">
              <section className="border border-forge-accent/40 bg-forge-accent/10 p-5">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
                  {copy.summary.overallVerdict}
                </p>
                <p className="mt-3 text-base leading-8 text-forge-text">{summary.final_verdict}</p>
              </section>

              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]">
                <div className="border border-forge-border bg-forge-panel p-5">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
                    {copy.summary.turningPoints}
                  </p>
                  <div className="mt-4 space-y-4">
                    {summary.turning_points.map((turningPoint) => (
                      <div
                        key={`${turningPoint.round}-${turningPoint.reason}`}
                        className="border border-forge-border bg-forge-bg p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="forge-chip forge-chip-accent">
                            {copy.common.round(turningPoint.round)}
                          </span>
                          <p className="text-sm leading-7 text-forge-text">{turningPoint.reason}</p>
                        </div>

                        <div className="mt-4 space-y-3 border-l border-forge-border/70 pl-4">
                          <p className="text-sm leading-7 text-forge-muted">
                            <span className="text-forge-text">{copy.summary.yourMove}: </span>
                            {turningPoint.player_move}
                          </p>
                          <p className="text-sm leading-7 text-forge-muted">
                            <span className="text-forge-text">{copy.summary.opponentReaction}: </span>
                            {turningPoint.opponent_reaction}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <section className="border border-forge-border bg-forge-panel p-5">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
                      {copy.summary.strategyAnalysis}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-forge-text">{summary.strategy_analysis}</p>
                  </section>

                  <section className="border border-forge-border bg-forge-panel p-5">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
                      {copy.summary.suggestions}
                    </p>
                    <div className="mt-4 space-y-3">
                      {summary.improvement_suggestions.map((suggestion, index) => (
                        <div
                          key={`${index}-${suggestion}`}
                          className="flex gap-3 border border-forge-border bg-forge-bg p-4"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-forge-border text-[11px] font-mono uppercase tracking-[0.18em] text-forge-text">
                            {index + 1}
                          </span>
                          <p className="text-sm leading-7 text-forge-text">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
