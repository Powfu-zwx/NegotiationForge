"use client";

import { useEffect, useMemo, useState } from "react";

import { createSession, getScenarios, type ScenarioSummary, type SessionInfo } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import {
  getCopy,
  localizeScenarioBriefing,
  localizeScenarioCard,
} from "@/lib/localization";
import {
  difficultyToStars,
  type ScenarioBriefingData,
  type ScenarioCardData,
} from "@/lib/view-models";

interface ScenarioSelectProps {
  scenarioCatalog: ScenarioBriefingData[];
  onSessionCreated: (session: SessionInfo) => void;
}

export default function ScenarioSelect({
  scenarioCatalog,
  onSessionCreated,
}: ScenarioSelectProps) {
  const { locale } = useLocale();
  const copy = getCopy(locale);

  const [scenarioSummaries, setScenarioSummaries] = useState<ScenarioSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingScenarioId, setCreatingScenarioId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getScenarios()
      .then((result) => {
        if (active) {
          setScenarioSummaries(result);
        }
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : copy.scenario.loadFailed);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [copy.scenario.loadFailed]);

  const mergedScenarios = useMemo<ScenarioCardData[]>(() => {
    const summaryMap = new Map(
      scenarioSummaries.map((scenario) => [scenario.scenario_id, scenario])
    );
    const scenarioIds =
      scenarioSummaries.length > 0
        ? scenarioSummaries.map((scenario) => scenario.scenario_id)
        : scenarioCatalog.map((scenario) => scenario.scenarioId);

    return scenarioIds
      .map((scenarioId) => {
        const summary = summaryMap.get(scenarioId);
        const briefing = scenarioCatalog.find((scenario) => scenario.scenarioId === scenarioId);

        if (!summary && !briefing) {
          return null;
        }

        return {
          scenarioId,
          title: summary?.title ?? briefing?.title ?? copy.scenario.untitled,
          description: summary?.description ?? briefing?.description ?? "",
          category: summary?.category ?? briefing?.category ?? copy.scenario.uncategorized,
          difficulty: summary?.difficulty ?? briefing?.difficulty ?? "medium",
          difficultyStars: difficultyToStars(summary?.difficulty ?? briefing?.difficulty ?? "medium"),
          estimatedRounds: summary?.estimated_rounds ?? briefing?.estimatedRounds ?? 0,
          opponentName: briefing?.opponentName ?? copy.scenario.unknownOpponent,
          opponentRole: briefing?.opponentRole ?? copy.scenario.unknownRole,
          tags: briefing?.tags ?? [summary?.category ?? copy.scenario.uncategorized],
        };
      })
      .filter((scenario): scenario is ScenarioCardData => scenario !== null)
      .map((scenario) => localizeScenarioCard(scenario, locale));
  }, [
    copy.scenario.uncategorized,
    copy.scenario.unknownOpponent,
    copy.scenario.unknownRole,
    copy.scenario.untitled,
    locale,
    scenarioCatalog,
    scenarioSummaries,
  ]);

  const selectedScenario = useMemo(
    () =>
      localizeScenarioBriefing(
        scenarioCatalog.find((scenario) => scenario.scenarioId === selectedScenarioId) ?? null,
        locale
      ),
    [locale, scenarioCatalog, selectedScenarioId]
  );

  const difficultyBreakdown = useMemo(
    () => ({
      easy: mergedScenarios.filter((scenario) => scenario.difficulty === "easy").length,
      medium: mergedScenarios.filter((scenario) => scenario.difficulty === "medium").length,
      hard: mergedScenarios.filter((scenario) => scenario.difficulty === "hard").length,
    }),
    [mergedScenarios]
  );

  const handleConfirm = async () => {
    if (!selectedScenario) {
      return;
    }

    setCreatingScenarioId(selectedScenario.scenarioId);
    setError(null);

    try {
      const session = await createSession(selectedScenario.scenarioId);
      onSessionCreated(session);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.scenario.loadFailed);
      setCreatingScenarioId(null);
    }
  };

  return (
    <section className="flat-panel flex h-full flex-col overflow-hidden p-4 xl:p-5">
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border border-forge-border bg-forge-panel flex min-h-0 flex-col px-5 py-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
              {locale === "en" ? "Hub & Setup" : "大厅与配置"}
            </p>
            <h2 className="mt-4 font-serif text-[1.8rem] leading-tight text-forge-text">
              {copy.scenario.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-forge-secondary">
              {copy.scenario.description}
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            <InfoCard
              label={copy.scenario.currentSetup}
              value={String(mergedScenarios.length)}
              body={locale === "en" ? "Deployable simulations" : "可部署推演场景"}
              tone="accent"
            />
            <InfoCard
              label={copy.scenario.trainingFocus}
              value={copy.scenario.trainingFocusBody}
              body={copy.scenario.experienceGoalBody}
            />
          </div>

          <div className="mt-6 border border-forge-border bg-forge-bg p-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-muted">
              {locale === "en" ? "Difficulty Spread" : "难度分布"}
            </p>
            <div className="mt-4 space-y-3">
              <DifficultyRow
                label={locale === "en" ? "Easy" : "简单"}
                value={difficultyBreakdown.easy}
                tone="success"
              />
              <DifficultyRow
                label={locale === "en" ? "Medium" : "中等"}
                value={difficultyBreakdown.medium}
                tone="accent"
              />
              <DifficultyRow
                label={locale === "en" ? "Hard" : "困难"}
                value={difficultyBreakdown.hard}
                tone="danger"
              />
            </div>
          </div>

          <div className="mt-6 min-h-0 flex-1 overflow-y-auto border border-forge-border bg-forge-bg p-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
              {locale === "en" ? "Command Notes" : "指挥提示"}
            </p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-forge-secondary">
              <p>
                {locale === "en"
                  ? "Scenario cards prioritize conflict posture, negotiation cadence, and target pressure points."
                  : "场景卡片优先呈现对手姿态、谈判节奏和关键施压点。"}
              </p>
              <p>
                {locale === "en"
                  ? "Open any briefing to inspect the opponent profile before you enter the arena."
                  : "打开任意简报后，再查看对手画像和开局提示，再进入博弈区。"}
              </p>
              {selectedScenario ? (
                <div className="border border-forge-accent/40 bg-forge-accent/10 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
                    {locale === "en" ? "Current Selection" : "当前选中"}
                  </p>
                  <p className="mt-3 text-base text-forge-text">{selectedScenario.title}</p>
                  <p className="mt-2 text-sm text-forge-secondary">
                    {selectedScenario.opponentName} / {selectedScenario.opponentRole}
                  </p>
                </div>
              ) : (
                <p className="border border-dashed border-forge-border px-4 py-5 text-forge-muted">
                  {locale === "en"
                    ? "No scenario selected. Pick a card to open the tactical drawer."
                    : "尚未选中场景。点击右侧卡片以打开战术抽屉。"}
                </p>
              )}
            </div>
          </div>
        </aside>

        <div className="border border-forge-border bg-forge-panel flex min-h-0 flex-col px-5 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-forge-border pb-6">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
                {copy.scenario.library}
              </p>
              <h3 className="mt-4 font-serif text-[1.9rem] leading-tight text-forge-text">
                {locale === "en" ? "Negotiation Mission Board" : "谈判任务面板"}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-forge-secondary">
                {locale === "en"
                  ? "Choose a scenario and inspect the opponent's style, operating goal, and estimated pace before launching the live session."
                  : "先选场景，再查看对手风格、目标和预估回合，再进入实时对局。"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="forge-chip">
                {locale === "en" ? "Cards" : "场景"} {mergedScenarios.length}
              </span>
              <span className="forge-chip forge-chip-alt">
                {locale === "en" ? "Wide Screen Ready" : "适配宽屏"}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-6">
            {loading && mergedScenarios.length === 0 && (
              <div className="grid gap-4 xl:grid-cols-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="h-[280px] animate-pulse border border-forge-border bg-forge-panel/60"
                  />
                ))}
              </div>
            )}

            {error && (
              <div className="mb-5 border border-forge-danger/40 bg-forge-danger/10 px-4 py-3 text-sm text-forge-danger">
                {error}
              </div>
            )}

            <div className="grid gap-4 2xl:grid-cols-2">
              {mergedScenarios.map((scenario) => (
                <button
                  key={scenario.scenarioId}
                  type="button"
                  onClick={() => setSelectedScenarioId(scenario.scenarioId)}
                  className="group relative overflow-hidden border border-forge-border bg-forge-panel p-6 text-left transition-colors duration-150 hover:border-forge-accent/40"
                >
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="forge-chip forge-chip-accent">{scenario.category}</span>
                        <h4 className="mt-4 font-serif text-[1.7rem] leading-tight text-forge-text">
                          {scenario.title}
                        </h4>
                      </div>

                      <div className="border border-forge-border bg-forge-bg px-4 py-3 text-right">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-muted">
                          {copy.scenario.difficulty}
                        </p>
                        <p className="mt-2 font-mono text-sm tracking-[0.2em] text-forge-alt">
                          {renderStars(scenario.difficultyStars)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-forge-secondary">
                      {scenario.description}
                    </p>

                    <div className="mt-5 grid gap-3 border border-forge-border bg-forge-bg p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-muted">
                          {copy.scenario.opponentRole}
                        </p>
                        <p className="mt-2 text-base text-forge-text">
                          {scenario.opponentName} / {scenario.opponentRole}
                        </p>
                      </div>
                      <div className="text-sm text-forge-secondary">
                        {copy.scenario.estimatedRounds(scenario.estimatedRounds)}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {scenario.tags.map((tag) => (
                        <span key={tag} className="forge-chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedScenario && (
        <div
          className="absolute inset-0 z-20 flex justify-end bg-[rgba(2,6,23,0.68)] backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedScenarioId(null);
              setCreatingScenarioId(null);
            }
          }}
        >
          <div className="flex h-full w-full max-w-[640px] flex-col border-l border-forge-border bg-forge-surface px-6 py-6">
            <div className="flex items-start justify-between gap-4 border-b border-forge-border pb-5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
                  {copy.scenario.briefing}
                </p>
                <h3 className="mt-4 font-serif text-[1.8rem] leading-tight text-forge-text">
                  {selectedScenario.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-forge-secondary">
                  {selectedScenario.contextSetting}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedScenarioId(null);
                  setCreatingScenarioId(null);
                }}
                className="forge-button-secondary"
              >
                {copy.common.close}
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-6">
              <section className="border border-forge-border bg-forge-panel p-5">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
                  {copy.scenario.overview}
                </p>
                <p className="mt-4 text-sm leading-7 text-forge-text">
                  {selectedScenario.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {selectedScenario.tags.map((tag) => (
                    <span key={tag} className="forge-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>

              <section className="border border-forge-border bg-forge-panel p-5">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
                  {copy.scenario.opponentProfile}
                </p>
                <h4 className="mt-4 text-xl text-forge-text">
                  {selectedScenario.opponentName} / {selectedScenario.opponentRole}
                </h4>
                <p className="mt-3 text-sm leading-7 text-forge-secondary">
                  {selectedScenario.opponentIdentity}
                </p>
                <p className="mt-4 text-sm leading-7 text-forge-text">
                  {selectedScenario.opponentStyle}
                </p>
                <p className="mt-3 text-sm leading-7 text-forge-secondary">
                  {selectedScenario.opponentPressureResponse}
                </p>
                <p className="mt-3 text-sm leading-7 text-forge-secondary">
                  {selectedScenario.opponentObjective}
                </p>
              </section>

              <section className="border border-forge-accent/40 bg-forge-accent/10 p-5">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
                  {copy.scenario.openingNote}
                </p>
                <p className="mt-4 text-sm leading-7 text-forge-text">
                  {copy.scenario.openingHint(selectedScenario.estimatedRounds)}
                </p>
              </section>
            </div>

            <div className="border-t border-forge-border/70 pt-5">
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={creatingScenarioId === selectedScenario.scenarioId}
                className="forge-button-primary w-full"
              >
                {creatingScenarioId === selectedScenario.scenarioId
                  ? copy.scenario.initializing
                  : copy.scenario.enter}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function InfoCard({
  label,
  value,
  body,
  tone = "default",
}: {
  label: string;
  value: string;
  body: string;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={`border p-5 ${
        tone === "accent"
          ? "border-forge-accent/40 bg-forge-accent/10"
          : "border-forge-border bg-forge-panel"
      }`}
    >
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
        {label}
      </p>
      <p className="mt-4 text-2xl font-semibold text-forge-text">{value}</p>
      <p className="mt-2 text-sm leading-7 text-forge-secondary">{body}</p>
    </div>
  );
}

function DifficultyRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "accent" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "bg-forge-success"
      : tone === "danger"
      ? "bg-forge-danger"
      : "bg-forge-accent";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-forge-secondary">{label}</span>
        <span className="font-mono text-forge-text">{value}</span>
      </div>
      <div className="h-2 overflow-hidden bg-forge-border/30">
        <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${Math.min(value * 20, 100)}%` }} />
      </div>
    </div>
  );
}

function renderStars(count: number): string {
  return Array.from({ length: 5 }, (_, index) => (index < count ? "●" : "○")).join("");
}
