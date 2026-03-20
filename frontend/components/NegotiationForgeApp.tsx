"use client";

import { useEffect, useMemo, useState } from "react";

import LocalSetupModal from "@/components/LocalSetupModal";
import NegotiationWorkspace from "@/components/NegotiationWorkspace";
import ScenarioSelect from "@/components/ScenarioSelect";
import { type SessionInfo, type SessionStatusValue } from "@/lib/api";
import { getLocalLLMConfig } from "@/lib/local-api";
import { LocaleProvider, useLocale } from "@/lib/locale-context";
import {
  getCopy,
  localizeScenarioBriefing,
  localizeSessionStatus,
} from "@/lib/localization";
import { type ScenarioBriefingData } from "@/lib/view-models";

interface NegotiationForgeAppProps {
  scenarioCatalog: ScenarioBriefingData[];
}

export default function NegotiationForgeApp({
  scenarioCatalog,
}: NegotiationForgeAppProps) {
  return (
    <LocaleProvider>
      <NegotiationForgeAppInner scenarioCatalog={scenarioCatalog} />
    </LocaleProvider>
  );
}

function NegotiationForgeAppInner({
  scenarioCatalog,
}: NegotiationForgeAppProps) {
  const { locale, setLocale } = useLocale();
  const copy = getCopy(locale);

  const [scenarioCatalogState, setScenarioCatalogState] = useState(scenarioCatalog);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatusValue>("active");
  const [provider, setProvider] = useState<"deepseek" | "openai" | "gemini">("deepseek");
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  useEffect(() => {
    let active = true;

    getLocalLLMConfig()
      .then((config) => {
        if (active) {
          setProvider(config.provider);
        }
      })
      .catch(() => {
        if (active) {
          setProvider("deepseek");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const activeScenario = useMemo(
    () =>
      scenarioCatalogState.find((scenario) => scenario.scenarioId === session?.scenario_id) ?? null,
    [scenarioCatalogState, session?.scenario_id]
  );
  const localizedScenario = useMemo(
    () => localizeScenarioBriefing(activeScenario, locale),
    [activeScenario, locale]
  );
  const localizedTags = localizedScenario?.tags.slice(0, 3) ?? [];
  const currentStatusLabel = session
    ? localizeSessionStatus(sessionStatus, locale)
    : locale === "en"
    ? "Standby"
    : "待机";

  return (
    <main className="h-screen overflow-hidden bg-forge-bg">
      <div className="mx-auto flex h-full max-w-[1500px] flex-col px-4 py-4 xl:px-6">
        <header className="border border-forge-border bg-forge-surface">
          <div className="grid gap-6 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:px-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="forge-chip forge-chip-accent">{copy.app.engineLabel}</span>
                <span
                  className={`forge-chip ${
                    sessionStatus === "agreement"
                      ? "forge-chip-success"
                      : sessionStatus === "breakdown"
                      ? "forge-chip-danger"
                      : ""
                  }`}
                >
                  {currentStatusLabel}
                </span>
                {localizedTags.map((tag) => (
                  <span key={tag} className="forge-chip">
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="mt-4 font-serif text-[1.9rem] text-forge-text sm:text-[2.25rem]">
                Negotiation<span className="text-forge-accent">Forge</span>
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-forge-secondary">
                {session
                  ? `${localizedScenario?.title ?? session.context_setting} / ${session.opponent_name} / ${
                      localizedScenario?.opponentRole ?? session.opponent_role
                    }`
                  : copy.app.idleSubtitle}
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-forge-muted">
                {session
                  ? localizedScenario?.description ?? session.context_background
                  : locale === "en"
                  ? "Parallel negotiation timelines, live scoring, and post-session branch rehearsal in one flat workspace."
                  : "将实时谈判、态势评分与赛后分叉推演收束到同一块平面工作区中。"}
              </p>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border border-forge-border bg-forge-panel px-4 py-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-muted">
                    {locale === "en" ? "Runtime" : "运行环境"}
                  </p>
                  <p className="mt-3 text-base text-forge-text">
                    {formatProviderName(provider, locale)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-forge-secondary">
                    {locale === "en"
                      ? "Local or compatible endpoint"
                      : "本地或兼容的模型端点"}
                  </p>
                </div>

                <div className="border border-forge-border bg-forge-panel px-4 py-4">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-muted">
                    {locale === "en" ? "Interface" : "界面语言"}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLocale("zh")}
                      className={`border px-3 py-2 text-[11px] font-mono uppercase tracking-[0.16em] transition-colors duration-150 ${
                        locale === "zh"
                          ? "border-forge-accent bg-forge-accent text-forge-bg"
                          : "border-forge-border bg-forge-surface text-forge-secondary hover:text-forge-text"
                      }`}
                    >
                      {copy.common.chinese}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocale("en")}
                      className={`border px-3 py-2 text-[11px] font-mono uppercase tracking-[0.16em] transition-colors duration-150 ${
                        locale === "en"
                          ? "border-forge-accent bg-forge-accent text-forge-bg"
                          : "border-forge-border bg-forge-surface text-forge-secondary hover:text-forge-text"
                      }`}
                    >
                      {copy.common.english}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsSetupOpen(true)}
                  className="forge-button-secondary"
                >
                  {locale === "en" ? "Local Setup" : "本地设置"}
                </button>

                {session && (
                  <button
                    type="button"
                    onClick={() => {
                      setSession(null);
                      setSessionStatus("active");
                    }}
                    className="forge-button-secondary"
                  >
                    {copy.common.reset}
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden pt-4">
          {session ? (
            <NegotiationWorkspace
              session={session}
              scenarioBriefing={activeScenario}
              onSessionStatusChange={setSessionStatus}
            />
          ) : (
            <ScenarioSelect
              scenarioCatalog={scenarioCatalogState}
              onSessionCreated={(nextSession) => {
                setSession(nextSession);
                setSessionStatus("active");
              }}
            />
          )}
        </div>
      </div>

      <LocalSetupModal
        open={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onConfigSaved={(config) => setProvider(config.provider)}
        onScenariosSaved={setScenarioCatalogState}
      />
    </main>
  );
}

function formatProviderName(provider: "deepseek" | "openai" | "gemini", locale: "zh" | "en") {
  if (provider === "openai") {
    return locale === "en" ? "OpenAI Compatible" : "OpenAI 兼容";
  }
  if (provider === "gemini") {
    return "Gemini";
  }
  return "DeepSeek";
}
