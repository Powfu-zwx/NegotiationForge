import { type ScenarioBriefingData } from "@/lib/view-models";

export type LocalProviderName = "deepseek" | "openai" | "gemini";

export interface LocalProviderProfile {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface LocalLLMConfig {
  provider: LocalProviderName;
  deepseek: LocalProviderProfile;
  openai: LocalProviderProfile;
  gemini: LocalProviderProfile;
  appEnv: string;
  appHost: string;
  appPort: string;
  debug: boolean;
  allowedOrigins: string;
  databaseUrl: string;
}

export interface LocalScenarioRecord {
  scenarioId: string;
  title: string;
  description: string;
  fileName: string;
  rawJson: string;
}

export interface LocalScenarioPayload {
  scenarios: LocalScenarioRecord[];
  catalog: ScenarioBriefingData[];
}
