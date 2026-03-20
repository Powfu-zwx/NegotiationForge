"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getLocalLLMConfig,
  getLocalScenarios,
  saveLocalLLMConfig,
  saveLocalScenario,
  type LocalScenarioResponse,
} from "@/lib/local-api";
import { useLocale } from "@/lib/locale-context";
import {
  type LocalLLMConfig,
  type LocalProviderName,
  type LocalScenarioRecord,
} from "@/lib/local-types";
import { type ScenarioBriefingData } from "@/lib/view-models";

interface LocalSetupModalProps {
  open: boolean;
  onClose: () => void;
  onConfigSaved: (config: LocalLLMConfig) => void;
  onScenariosSaved: (catalog: ScenarioBriefingData[]) => void;
}

export default function LocalSetupModal({
  open,
  onClose,
  onConfigSaved,
  onScenariosSaved,
}: LocalSetupModalProps) {
  const { locale } = useLocale();
  const copy = getLocalSetupCopy(locale);

  const [activeTab, setActiveTab] = useState<"api" | "scenario">("api");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<LocalLLMConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  const [scenarioTemplate, setScenarioTemplate] = useState("");
  const [scenarioList, setScenarioList] = useState<LocalScenarioRecord[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [scenarioDraft, setScenarioDraft] = useState("");
  const [savingScenario, setSavingScenario] = useState(false);
  const [scenarioMessage, setScenarioMessage] = useState<string | null>(null);

  function applyScenarioPayload(payload: LocalScenarioResponse) {
    setScenarioTemplate(payload.template);
    setScenarioList(payload.scenarios);
    onScenariosSaved(payload.catalog);

    const fallback = payload.scenarios[0]?.scenarioId ?? null;
    const nextId =
      selectedScenarioId &&
      payload.scenarios.some((scenario) => scenario.scenarioId === selectedScenarioId)
        ? selectedScenarioId
        : fallback;

    setSelectedScenarioId(nextId);

    const selectedScenario =
      payload.scenarios.find((scenario) => scenario.scenarioId === nextId) ?? null;
    setScenarioDraft(selectedScenario?.rawJson ?? payload.template);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setConfigMessage(null);
    setScenarioMessage(null);

    Promise.all([getLocalLLMConfig(), getLocalScenarios()])
      .then(([nextConfig, nextScenarios]) => {
        if (!active) {
          return;
        }

        setConfig(nextConfig);
        applyScenarioPayload(nextScenarios);
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : copy.loadFailed);
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
  }, [copy.loadFailed, open]);

  const selectedProfile = useMemo(() => {
    if (!config) {
      return null;
    }

    return config[config.provider];
  }, [config]);

  const scenarioPreview = useMemo(() => {
    try {
      return JSON.parse(scenarioDraft) as {
        scenario_id?: string;
        metadata?: { title?: string; description?: string };
      };
    } catch {
      return null;
    }
  }, [scenarioDraft]);

  if (!open) {
    return null;
  }

  const updateProviderField = (
    provider: LocalProviderName,
    field: "apiKey" | "baseUrl" | "model",
    value: string
  ) => {
    setConfig((previous) =>
      previous
        ? {
            ...previous,
            [provider]: {
              ...previous[provider],
              [field]: value,
            },
          }
        : previous
    );
  };

  const handleSaveConfig = async () => {
    if (!config) {
      return;
    }

    setSavingConfig(true);
    setError(null);
    setConfigMessage(null);

    try {
      const saved = await saveLocalLLMConfig(config);
      setConfig(saved);
      setConfigMessage(copy.configSaved);
      onConfigSaved(saved);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.saveFailed);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveScenario = async () => {
    setSavingScenario(true);
    setError(null);
    setScenarioMessage(null);

    try {
      const result = await saveLocalScenario(scenarioDraft);
      setScenarioList(result.scenarios);
      setSelectedScenarioId(result.savedScenarioId);
      setScenarioDraft(
        result.scenarios.find((scenario) => scenario.scenarioId === result.savedScenarioId)?.rawJson ??
          scenarioDraft
      );
      onScenariosSaved(result.catalog);
      setScenarioMessage(copy.scenarioSaved(result.savedScenarioId));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.saveFailed);
    } finally {
      setSavingScenario(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(2,6,23,0.74)] p-6 backdrop-blur-sm">
      <div className="forge-panel relative flex h-[min(90vh,920px)] w-full max-w-[1460px] flex-col overflow-hidden rounded-[32px]">
        <div className="relative flex items-start justify-between gap-6 border-b border-forge-border/70 px-6 py-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="forge-chip forge-chip-accent">{copy.eyebrow}</span>
              <span className="forge-chip">{activeTab === "api" ? copy.apiTab : copy.scenarioTab}</span>
            </div>
            <h2 className="mt-4 font-serif text-[2rem] leading-tight text-forge-text">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-forge-secondary">{copy.description}</p>
          </div>

          <button type="button" onClick={onClose} className="forge-button-secondary">
            {copy.close}
          </button>
        </div>

        <div className="relative flex items-center gap-2 border-b border-forge-border/70 px-6 py-4">
          <TabButton
            active={activeTab === "api"}
            label={copy.apiTab}
            onClick={() => setActiveTab("api")}
          />
          <TabButton
            active={activeTab === "scenario"}
            label={copy.scenarioTab}
            onClick={() => setActiveTab("scenario")}
          />
        </div>

        {error && (
          <div className="relative mx-6 mt-5 rounded-[18px] border border-forge-danger/30 bg-forge-danger/10 px-4 py-3 text-sm text-forge-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="relative flex flex-1 items-center justify-center px-6 py-10 text-sm text-forge-secondary">
            {copy.loading}
          </div>
        ) : (
          <div className="relative min-h-0 flex-1 overflow-hidden px-6 pb-6 pt-5">
            {activeTab === "api" && config && selectedProfile && (
              <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="space-y-4 overflow-y-auto pr-1">
                  <div className="forge-card rounded-[24px] p-5">
                    <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-forge-accent">
                      {copy.provider}
                    </p>
                    <div className="mt-4 space-y-2">
                      {(Object.keys(PROVIDER_LABELS) as LocalProviderName[]).map((provider) => (
                        <button
                          key={provider}
                          type="button"
                          onClick={() =>
                            setConfig((previous) => (previous ? { ...previous, provider } : previous))
                          }
                          className={`flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition-colors duration-200 ${
                            config.provider === provider
                              ? "border-forge-accent/30 bg-forge-accent/10"
                              : "border-forge-border/70 bg-forge-bg/70 hover:bg-forge-panel/80"
                          }`}
                        >
                          <span className="text-sm text-forge-text">
                            {PROVIDER_LABELS[provider][locale]}
                          </span>
                          <span
                            className={`text-[10px] font-mono uppercase tracking-[0.16em] ${
                              config.provider === provider
                                ? "text-forge-accent"
                                : "text-forge-secondary"
                            }`}
                          >
                            {config.provider === provider ? copy.active : copy.available}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="forge-card rounded-[24px] p-5">
                    <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-forge-accent">
                      {copy.restart}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-forge-secondary">{copy.restartBody}</p>
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto rounded-[28px] border border-forge-border/70 bg-forge-panel/80 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label={copy.apiKey}
                      value={selectedProfile.apiKey}
                      placeholder={copy.apiKeyPlaceholder}
                      onChange={(value) => updateProviderField(config.provider, "apiKey", value)}
                      type="password"
                    />
                    <Field
                      label={copy.model}
                      value={selectedProfile.model}
                      placeholder={copy.modelPlaceholder}
                      onChange={(value) => updateProviderField(config.provider, "model", value)}
                    />
                    <div className="md:col-span-2">
                      <Field
                        label={copy.baseUrl}
                        value={selectedProfile.baseUrl}
                        placeholder={copy.baseUrlPlaceholder}
                        onChange={(value) => updateProviderField(config.provider, "baseUrl", value)}
                      />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field
                      label="APP_HOST"
                      value={config.appHost}
                      onChange={(value) =>
                        setConfig((previous) => (previous ? { ...previous, appHost: value } : previous))
                      }
                    />
                    <Field
                      label="APP_PORT"
                      value={config.appPort}
                      onChange={(value) =>
                        setConfig((previous) => (previous ? { ...previous, appPort: value } : previous))
                      }
                    />
                    <Field
                      label="ALLOWED_ORIGINS"
                      value={config.allowedOrigins}
                      onChange={(value) =>
                        setConfig((previous) =>
                          previous ? { ...previous, allowedOrigins: value } : previous
                        )
                      }
                    />
                    <Field
                      label="DATABASE_URL"
                      value={config.databaseUrl}
                      onChange={(value) =>
                        setConfig((previous) =>
                          previous ? { ...previous, databaseUrl: value } : previous
                        )
                      }
                    />
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      disabled={savingConfig}
                      className="forge-button-primary"
                    >
                      {savingConfig ? copy.saving : copy.saveConfig}
                    </button>

                    {configMessage && <p className="text-sm text-forge-success">{configMessage}</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "scenario" && (
              <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="min-h-0 overflow-y-auto pr-1">
                  <div className="forge-card rounded-[24px] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-forge-accent">
                        {copy.localScenarios}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedScenarioId(null);
                          setScenarioDraft(scenarioTemplate);
                          setScenarioMessage(null);
                        }}
                        className="forge-button-secondary"
                      >
                        {copy.newScenario}
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {scenarioList.map((scenario) => (
                        <button
                          key={scenario.scenarioId}
                          type="button"
                          onClick={() => {
                            setSelectedScenarioId(scenario.scenarioId);
                            setScenarioDraft(scenario.rawJson);
                            setScenarioMessage(null);
                          }}
                          className={`w-full rounded-[18px] border px-4 py-3 text-left transition-colors duration-200 ${
                            selectedScenarioId === scenario.scenarioId
                              ? "border-forge-accent/30 bg-forge-accent/10"
                              : "border-forge-border/70 bg-forge-bg/70 hover:bg-forge-panel/80"
                          }`}
                        >
                          <p className="text-sm text-forge-text">{scenario.title}</p>
                          <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.16em] text-forge-secondary">
                            {scenario.scenarioId}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="min-h-0 overflow-hidden rounded-[28px] border border-forge-border/70 bg-forge-panel/80">
                    <div className="border-b border-forge-border/70 px-5 py-4">
                      <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-forge-accent">
                        {copy.jsonEditor}
                      </p>
                    </div>
                    <textarea
                      value={scenarioDraft}
                      onChange={(event) => setScenarioDraft(event.target.value)}
                      className="h-full min-h-[420px] w-full resize-none border-0 bg-transparent px-5 py-5 font-mono text-sm leading-7 text-forge-text outline-none"
                      spellCheck={false}
                    />
                  </div>

                  <div className="min-h-0 space-y-4 overflow-y-auto">
                    <div className="forge-card rounded-[24px] p-5">
                      <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-forge-accent">
                        {copy.preview}
                      </p>
                      {scenarioPreview ? (
                        <>
                          <p className="mt-3 text-lg text-forge-text">
                            {scenarioPreview.metadata?.title ?? copy.untitled}
                          </p>
                          <p className="mt-2 text-sm text-forge-secondary">
                            {scenarioPreview.scenario_id ?? copy.noScenarioId}
                          </p>
                          <p className="mt-3 text-sm leading-7 text-forge-secondary">
                            {scenarioPreview.metadata?.description ?? copy.noDescription}
                          </p>
                        </>
                      ) : (
                        <p className="mt-3 text-sm leading-7 text-forge-danger">{copy.invalidJson}</p>
                      )}
                    </div>

                    <div className="forge-card rounded-[24px] p-5">
                      <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-forge-accent">
                        {copy.scenarioNote}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-forge-secondary">
                        {copy.scenarioNoteBody}
                      </p>
                    </div>

                    <div className="forge-card rounded-[24px] p-5">
                      <button
                        type="button"
                        onClick={handleSaveScenario}
                        disabled={savingScenario}
                        className="forge-button-primary w-full"
                      >
                        {savingScenario ? copy.saving : copy.saveScenario}
                      </button>

                      {scenarioMessage && (
                        <p className="mt-3 text-sm text-forge-success">{scenarioMessage}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
}) {
  return (
    <label className="block">
      <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-forge-secondary">
        {label}
      </p>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="forge-input mt-2"
      />
    </label>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-[11px] font-mono uppercase tracking-[0.2em] transition-colors duration-200 ${
        active
          ? "border-forge-accent/30 bg-forge-accent text-slate-950"
          : "border-forge-border/70 bg-forge-panel/80 text-forge-secondary hover:bg-forge-bg/80 hover:text-forge-text"
      }`}
    >
      {label}
    </button>
  );
}

const PROVIDER_LABELS: Record<
  LocalProviderName,
  {
    zh: string;
    en: string;
  }
> = {
  deepseek: {
    zh: "DeepSeek",
    en: "DeepSeek",
  },
  openai: {
    zh: "OpenAI / 兼容接口",
    en: "OpenAI / compatible",
  },
  gemini: {
    zh: "Gemini",
    en: "Gemini",
  },
};

function getLocalSetupCopy(locale: "zh" | "en") {
  if (locale === "en") {
    return {
      eyebrow: "Local Setup",
      title: "Manage local API profiles and editable scenarios",
      description:
        "These settings are written into files inside this project on your computer. API changes apply after backend restart. Scenario files are saved as local JSON and can be refreshed immediately.",
      close: "Close",
      apiTab: "API setup",
      scenarioTab: "Scenarios",
      provider: "Provider",
      active: "Active",
      available: "Saved",
      restart: "Restart required",
      restartBody:
        "After saving API settings, restart the backend process so the new provider, key, base URL, and model are loaded from backend/.env.",
      apiKey: "API key",
      apiKeyPlaceholder: "Paste your key here",
      model: "Model",
      modelPlaceholder: "Model name",
      baseUrl: "Base URL",
      baseUrlPlaceholder: "Provider endpoint",
      saveConfig: "Save API config",
      saveScenario: "Save scenario JSON",
      saving: "Saving...",
      configSaved: "Saved to backend/.env. Restart backend to apply.",
      scenarioSaved: (scenarioId: string) =>
        `Saved locally as ${scenarioId}.json. Refresh the home screen if needed.`,
      localScenarios: "Local scenarios",
      newScenario: "New template",
      jsonEditor: "JSON editor",
      preview: "Preview",
      scenarioNote: "How this works",
      scenarioNoteBody:
        "Save writes directly into backend/scenarios/*.json. The backend loader already reads this folder, so your local files remain in the project directory.",
      loadFailed: "Failed to load local setup.",
      saveFailed: "Failed to save local setup.",
      loading: "Loading local files...",
      untitled: "Untitled scenario",
      noScenarioId: "No scenario_id",
      noDescription: "No description yet.",
      invalidJson: "Invalid JSON. Fix the syntax before saving.",
    };
  }

  return {
    eyebrow: "本地设置",
    title: "管理本地 API 配置与可编辑场景",
    description:
      "这里的设置会直接写入你电脑上的项目文件。API 改动需要重启后端生效；场景会保存为本地 JSON，并可立即刷新使用。",
    close: "关闭",
    apiTab: "API 设置",
    scenarioTab: "场景文件",
    provider: "提供方",
    active: "当前",
    available: "已保存",
    restart: "需要重启",
    restartBody:
      "保存 API 配置后，请重启后端进程。新的 provider、key、base URL 和 model 会从 backend/.env 重新加载。",
    apiKey: "API Key",
    apiKeyPlaceholder: "在这里粘贴你的 Key",
    model: "模型名",
    modelPlaceholder: "例如 deepseek-chat / gpt-4o-mini",
    baseUrl: "Base URL",
    baseUrlPlaceholder: "服务商接口地址",
    saveConfig: "保存 API 配置",
    saveScenario: "保存场景 JSON",
    saving: "保存中...",
    configSaved: "已写入 backend/.env，重启后端后生效。",
    scenarioSaved: (scenarioId: string) =>
      `已保存为本地文件 ${scenarioId}.json，如有需要可刷新主页读取新场景。`,
    localScenarios: "本机场景",
    newScenario: "新建模板",
    jsonEditor: "JSON 编辑器",
    preview: "预览",
    scenarioNote: "工作方式",
    scenarioNoteBody:
      "保存时会直接写入 backend/scenarios/*.json。后端加载器本来就读取这个目录，所以本地场景会跟着项目一起保存在电脑里。",
    loadFailed: "本地设置加载失败。",
    saveFailed: "本地设置保存失败。",
    loading: "正在读取本地文件...",
    untitled: "未命名场景",
    noScenarioId: "没有 scenario_id",
    noDescription: "还没有描述。",
    invalidJson: "JSON 无法解析，请先修正语法再保存。",
  };
}
