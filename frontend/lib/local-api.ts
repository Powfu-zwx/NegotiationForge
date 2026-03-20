import { type LocalLLMConfig, type LocalScenarioRecord } from "@/lib/local-types";
import { type ScenarioBriefingData } from "@/lib/view-models";

class LocalApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalApiError";
  }
}

async function localRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new LocalApiError(error.detail ?? "Local request failed.");
  }

  return response.json();
}

export interface LocalScenarioResponse {
  scenarios: LocalScenarioRecord[];
  catalog: ScenarioBriefingData[];
  template: string;
}

export interface SaveLocalScenarioResponse {
  savedScenarioId: string;
  scenarios: LocalScenarioRecord[];
  catalog: ScenarioBriefingData[];
}

export const getLocalLLMConfig = () => localRequest<LocalLLMConfig>("/api/local-config");

export const saveLocalLLMConfig = (config: LocalLLMConfig) =>
  localRequest<LocalLLMConfig>("/api/local-config", {
    method: "PUT",
    body: JSON.stringify(config),
  });

export const getLocalScenarios = () =>
  localRequest<LocalScenarioResponse>("/api/local-scenarios");

export const saveLocalScenario = (rawJson: string) =>
  localRequest<SaveLocalScenarioResponse>("/api/local-scenarios", {
    method: "PUT",
    body: JSON.stringify({ rawJson }),
  });
