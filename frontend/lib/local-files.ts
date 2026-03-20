import "server-only";

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getScenarioCatalog } from "@/lib/scenario-catalog";
import {
  type LocalLLMConfig,
  type LocalProviderName,
  type LocalProviderProfile,
  type LocalScenarioRecord,
} from "@/lib/local-types";
import { type ScenarioBriefingData } from "@/lib/view-models";

const BACKEND_ROOT = path.resolve(process.cwd(), "../backend");
const ENV_PATH = path.join(BACKEND_ROOT, ".env");
const ENV_EXAMPLE_PATH = path.join(BACKEND_ROOT, ".env.example");
const SCENARIO_DIRECTORY = path.join(BACKEND_ROOT, "scenarios");

const DEFAULT_CONFIG: LocalLLMConfig = {
  provider: "deepseek",
  deepseek: {
    apiKey: "",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
  },
  openai: {
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  gemini: {
    apiKey: "",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.0-flash",
  },
  appEnv: "development",
  appHost: "0.0.0.0",
  appPort: "8000",
  debug: true,
  allowedOrigins: "http://localhost:3000",
  databaseUrl: "sqlite+aiosqlite:///./negotiationforge.db",
};

export async function readLocalLLMConfig(): Promise<LocalLLMConfig> {
  const envContent = await readTextFile(ENV_PATH, ENV_EXAMPLE_PATH);
  const values = parseEnv(envContent);

  return {
    provider: toProvider(values.LLM_PROVIDER),
    deepseek: {
      apiKey: values.DEEPSEEK_API_KEY ?? DEFAULT_CONFIG.deepseek.apiKey,
      baseUrl: values.DEEPSEEK_BASE_URL ?? DEFAULT_CONFIG.deepseek.baseUrl,
      model: values.DEEPSEEK_MODEL ?? DEFAULT_CONFIG.deepseek.model,
    },
    openai: {
      apiKey: values.OPENAI_API_KEY ?? DEFAULT_CONFIG.openai.apiKey,
      baseUrl: values.OPENAI_BASE_URL ?? DEFAULT_CONFIG.openai.baseUrl,
      model: values.OPENAI_MODEL ?? DEFAULT_CONFIG.openai.model,
    },
    gemini: {
      apiKey: values.GEMINI_API_KEY ?? DEFAULT_CONFIG.gemini.apiKey,
      baseUrl: values.GEMINI_BASE_URL ?? DEFAULT_CONFIG.gemini.baseUrl,
      model: values.GEMINI_MODEL ?? DEFAULT_CONFIG.gemini.model,
    },
    appEnv: values.APP_ENV ?? DEFAULT_CONFIG.appEnv,
    appHost: values.APP_HOST ?? DEFAULT_CONFIG.appHost,
    appPort: values.APP_PORT ?? DEFAULT_CONFIG.appPort,
    debug: toBoolean(values.DEBUG, DEFAULT_CONFIG.debug),
    allowedOrigins: values.ALLOWED_ORIGINS ?? DEFAULT_CONFIG.allowedOrigins,
    databaseUrl: values.DATABASE_URL ?? DEFAULT_CONFIG.databaseUrl,
  };
}

export async function saveLocalLLMConfig(config: LocalLLMConfig): Promise<LocalLLMConfig> {
  const normalized = normalizeConfig(config);
  await writeFile(ENV_PATH, serializeEnv(normalized), "utf-8");
  return normalized;
}

export async function listLocalScenarios(): Promise<{
  scenarios: LocalScenarioRecord[];
  catalog: ScenarioBriefingData[];
}> {
  const fileNames = (await readdir(SCENARIO_DIRECTORY))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "en"));

  const scenarios = await Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(SCENARIO_DIRECTORY, fileName);
      const rawJson = await readFile(filePath, "utf-8");
      let parsed:
        | {
            scenario_id?: string;
            metadata?: {
              title?: string;
              description?: string;
            };
          }
        | null = null;

      try {
        parsed = JSON.parse(rawJson) as {
          scenario_id?: string;
          metadata?: {
            title?: string;
            description?: string;
          };
        };
      } catch {
        parsed = null;
      }

      return {
        scenarioId: parsed?.scenario_id ?? fileName.replace(/\.json$/i, ""),
        title: parsed?.metadata?.title ?? fileName,
        description: parsed?.metadata?.description ?? "",
        fileName,
        rawJson,
      } satisfies LocalScenarioRecord;
    })
  );

  return {
    scenarios,
    catalog: await getScenarioCatalog(),
  };
}

export async function saveLocalScenario(rawJson: string): Promise<{
  savedScenarioId: string;
  scenarios: LocalScenarioRecord[];
  catalog: ScenarioBriefingData[];
}> {
  const parsed = JSON.parse(rawJson) as { scenario_id?: unknown };
  const scenarioId = String(parsed.scenario_id ?? "").trim();

  if (!scenarioId) {
    throw new Error("scenario_id is required.");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(scenarioId)) {
    throw new Error("scenario_id can only contain letters, numbers, underscores, and hyphens.");
  }

  const filePath = path.join(SCENARIO_DIRECTORY, `${scenarioId}.json`);
  const prettyJson = `${JSON.stringify(parsed, null, 2)}\n`;
  await writeFile(filePath, prettyJson, "utf-8");

  const nextState = await listLocalScenarios();
  return {
    savedScenarioId: scenarioId,
    ...nextState,
  };
}

export function createScenarioTemplate(): string {
  return `${JSON.stringify(
    {
      schema_version: "1.0",
      scenario_id: "custom_local_001",
      metadata: {
        title: "本地自定义场景",
        description: "在前端直接编辑并保存的谈判场景。",
        category: "职场",
        difficulty: "medium",
        estimated_rounds: 8,
      },
      context: {
        setting: "你和对手已经进入正式条件谈判。",
        background_shared: "双方都知道基础背景，但仍存在信息差。",
      },
      player: {
        role: "候选人",
        identity: "本地用户",
        objective: "争取更好的条件",
        private_info: {
          current_salary: 20000,
          competing_offer: {
            exists: false,
            amount: null,
            company_attractiveness: null,
            description: null,
          },
          ideal_salary: 26000,
          reservation_point: 23000,
        },
        cards: [],
      },
      opponent: {
        role: "HR",
        name: "Alex",
        identity: "负责本次谈判的对手",
        personality: {
          style: "理性直接",
          pressure_response: "在压力下会要求更多证据再让步",
          rationality: 0.75,
          description: "重视数据和一致性，不喜欢空泛表态。",
        },
        objective: "以较低成本完成谈判",
        private_info: {
          budget_ceiling: 28000,
          opening_offer: 22000,
          internal_valuation: 25000,
          has_backup_candidates: true,
          backup_candidates_quality: "medium",
          company_profit_pressure: true,
        },
        reservation_point: 21000,
        target: 22000,
        initial_state: {
          satisfaction: 50,
          patience: 75,
          current_strategy: "anchoring",
          disclosed_info: [],
          concession_history: [],
        },
      },
      negotiation_structure: {
        phases: [
          {
            phase_id: "opening",
            label: "开场锚定",
            typical_rounds: "1~2",
            description: "双方亮出初始立场。",
          },
          {
            phase_id: "probing",
            label: "试探摸底",
            typical_rounds: "3~4",
            description: "通过提问和回应探查底线。",
          },
          {
            phase_id: "bargaining",
            label: "实质交锋",
            typical_rounds: "5~7",
            description: "交换条件和让步。",
          },
          {
            phase_id: "closing",
            label: "收尾定案",
            typical_rounds: "8+",
            description: "推动达成或宣告破裂。",
          },
        ],
        termination_conditions: {
          agreement: "双方对关键数字与条件形成明确共识",
          breakdown: "任何一方明确拒绝继续谈判或耐心耗尽",
          max_rounds: 18,
        },
      },
    },
    null,
    2
  )}\n`;
}

async function readTextFile(...candidates: string[]): Promise<string> {
  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf-8");
    } catch {
      continue;
    }
  }

  return "";
}

function parseEnv(content: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    values[key] = stripQuotes(value);
  }

  return values;
}

function serializeEnv(config: LocalLLMConfig): string {
  return [
    "# NegotiationForge local runtime config",
    "# Saved from the frontend setup panel. Restart backend to apply changes.",
    "",
    `LLM_PROVIDER=${config.provider}`,
    "",
    `DEEPSEEK_API_KEY=${config.deepseek.apiKey}`,
    `DEEPSEEK_BASE_URL=${config.deepseek.baseUrl}`,
    `DEEPSEEK_MODEL=${config.deepseek.model}`,
    "",
    `OPENAI_API_KEY=${config.openai.apiKey}`,
    `OPENAI_BASE_URL=${config.openai.baseUrl}`,
    `OPENAI_MODEL=${config.openai.model}`,
    "",
    `GEMINI_API_KEY=${config.gemini.apiKey}`,
    `GEMINI_BASE_URL=${config.gemini.baseUrl}`,
    `GEMINI_MODEL=${config.gemini.model}`,
    "",
    `APP_ENV=${config.appEnv}`,
    `APP_HOST=${config.appHost}`,
    `APP_PORT=${config.appPort}`,
    `DEBUG=${String(config.debug).toLowerCase()}`,
    `ALLOWED_ORIGINS=${config.allowedOrigins}`,
    `DATABASE_URL=${config.databaseUrl}`,
    "",
  ].join("\n");
}

function normalizeConfig(config: LocalLLMConfig): LocalLLMConfig {
  return {
    provider: toProvider(config.provider),
    deepseek: normalizeProfile(config.deepseek, DEFAULT_CONFIG.deepseek),
    openai: normalizeProfile(config.openai, DEFAULT_CONFIG.openai),
    gemini: normalizeProfile(config.gemini, DEFAULT_CONFIG.gemini),
    appEnv: config.appEnv.trim() || DEFAULT_CONFIG.appEnv,
    appHost: config.appHost.trim() || DEFAULT_CONFIG.appHost,
    appPort: config.appPort.trim() || DEFAULT_CONFIG.appPort,
    debug: Boolean(config.debug),
    allowedOrigins: config.allowedOrigins.trim() || DEFAULT_CONFIG.allowedOrigins,
    databaseUrl: config.databaseUrl.trim() || DEFAULT_CONFIG.databaseUrl,
  };
}

function normalizeProfile(
  profile: LocalProviderProfile,
  fallback: LocalProviderProfile
): LocalProviderProfile {
  return {
    apiKey: profile.apiKey.trim(),
    baseUrl: profile.baseUrl.trim() || fallback.baseUrl,
    model: profile.model.trim() || fallback.model,
  };
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

function toProvider(value: string | undefined): LocalProviderName {
  if (value === "openai" || value === "gemini" || value === "deepseek") {
    return value;
  }

  return DEFAULT_CONFIG.provider;
}
