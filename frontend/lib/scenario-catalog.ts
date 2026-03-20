import "server-only";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { type ScenarioBriefingData, buildScenarioTags } from "@/lib/view-models";

interface ScenarioFile {
  scenario_id: string;
  metadata: {
    title: string;
    description: string;
    category: string;
    difficulty: "easy" | "medium" | "hard";
    estimated_rounds: number;
  };
  context: {
    setting: string;
    background_shared: string;
  };
  opponent: {
    name: string;
    role: string;
    identity: string;
    objective: string;
    personality: {
      style: string;
      description: string;
      pressure_response: string;
    };
  };
}

const SCENARIO_DIRECTORY = path.resolve(process.cwd(), "../backend/scenarios");

export async function getScenarioCatalog(): Promise<ScenarioBriefingData[]> {
  try {
    const fileNames = await readdir(SCENARIO_DIRECTORY);
    const scenarios = await Promise.all(
      fileNames
        .filter((fileName) => fileName.endsWith(".json"))
        .map(async (fileName) => readScenarioFile(path.join(SCENARIO_DIRECTORY, fileName)))
    );

    return scenarios
      .filter((item): item is ScenarioBriefingData => item !== null)
      .sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
  } catch {
    return [];
  }
}

async function readScenarioFile(filePath: string): Promise<ScenarioBriefingData | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as ScenarioFile;

    const briefing: ScenarioBriefingData = {
      scenarioId: parsed.scenario_id,
      title: parsed.metadata.title,
      description: parsed.metadata.description,
      category: parsed.metadata.category,
      difficulty: parsed.metadata.difficulty,
      estimatedRounds: parsed.metadata.estimated_rounds,
      opponentName: parsed.opponent.name,
      opponentRole: parsed.opponent.role,
      opponentIdentity: parsed.opponent.identity,
      opponentObjective: parsed.opponent.objective,
      opponentStyle: parsed.opponent.personality.description || parsed.opponent.personality.style,
      opponentPressureResponse: parsed.opponent.personality.pressure_response,
      contextSetting: parsed.context.setting,
      contextBackground: parsed.context.background_shared,
      tags: [],
    };

    return {
      ...briefing,
      tags: buildScenarioTags(briefing),
    };
  } catch {
    return null;
  }
}
