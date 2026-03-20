import {
  type AnalysisResult,
  type ForkNode,
  type OpponentState,
  type ScenarioSummary,
  type SituationScores,
} from "@/lib/api";

export type NegotiationPhaseId = OpponentState["current_phase"];
export type NegotiationStatus = "active" | "agreement" | "breakdown";

export interface ScenarioBriefingData {
  scenarioId: string;
  title: string;
  description: string;
  category: string;
  difficulty: ScenarioSummary["difficulty"];
  estimatedRounds: number;
  opponentName: string;
  opponentRole: string;
  opponentIdentity: string;
  opponentObjective: string;
  opponentStyle: string;
  opponentPressureResponse: string;
  contextSetting: string;
  contextBackground: string;
  tags: string[];
}

export interface ScenarioCardData {
  scenarioId: string;
  title: string;
  description: string;
  category: string;
  difficulty: ScenarioSummary["difficulty"];
  difficultyStars: number;
  estimatedRounds: number;
  opponentName: string;
  opponentRole: string;
  tags: string[];
}

export interface NegotiationMessageView {
  id: string;
  role: "player" | "opponent";
  speaker: "user" | "opponent";
  content: string;
  round?: number;
  pending?: boolean;
  strategyTag?: string;
  phase?: NegotiationPhaseId;
  agreementDelta?: number | null;
  agreementProbability?: number | null;
  isTurningPoint?: boolean;
  turningReason?: string | null;
}

export interface NormalizedAnalysisSnapshot {
  scores: SituationScores;
  isTurningPoint: boolean;
  turningReason: string | null;
}

export type ForkBranchTone =
  | "mainline"
  | "aggressive"
  | "concede"
  | "redirect"
  | "neutral";

export interface ForkGraphNodeData {
  [key: string]: unknown;
  node: ForkNode;
  tone: ForkBranchTone;
  strategyLabel: string;
  analysis: NormalizedAnalysisSnapshot | null;
  agreementLabel: string;
  speakerLabel: string;
  isSelected: boolean;
  isDimmed: boolean;
}

export interface ForkGraphEdgeData {
  [key: string]: unknown;
  tone: ForkBranchTone;
  isMainline: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
}

const DIFFICULTY_STARS: Record<ScenarioSummary["difficulty"], number> = {
  easy: 2,
  medium: 3,
  hard: 5,
};

export function difficultyToStars(difficulty: ScenarioSummary["difficulty"]): number {
  return DIFFICULTY_STARS[difficulty];
}

export function formatAgreementProbability(score: number | null | undefined): string {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return "--";
  }

  return `${Math.round(score * 10)}%`;
}

export function formatAgreementDelta(delta: number | null | undefined): string | null {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return null;
  }

  const signed = Math.round(delta * 10);
  return `${signed >= 0 ? "+" : ""}${signed}%`;
}

export function getAgreementDeltaMap(results: AnalysisResult[]): Map<number, number | null> {
  const deltaMap = new Map<number, number | null>();

  results.forEach((result, index) => {
    const previous = results[index - 1];
    deltaMap.set(
      result.round,
      previous ? result.scores.agreement_prob - previous.scores.agreement_prob : null
    );
  });

  return deltaMap;
}

export function normalizeAnalysisSnapshot(
  snapshot: Record<string, unknown> | null
): NormalizedAnalysisSnapshot | null {
  if (!snapshot) {
    return null;
  }

  const scores = snapshot.scores;
  if (!isSituationScores(scores)) {
    return null;
  }

  return {
    scores,
    isTurningPoint: Boolean(snapshot.is_turning_point),
    turningReason:
      typeof snapshot.turning_reason === "string" ? snapshot.turning_reason : null,
  };
}

export function resolveForkBranchTone(strategyLabel: string, isMainline: boolean): ForkBranchTone {
  if (isMainline) {
    return "mainline";
  }

  const source = strategyLabel.toLowerCase();
  if (containsAny(source, ["施压", "press", "aggressive", "hardline", "强硬", "压价"])) {
    return "aggressive";
  }
  if (containsAny(source, ["让步", "conced", "妥协", "示弱", "缓和"])) {
    return "concede";
  }
  if (containsAny(source, ["转移", "redirect", "换题", "焦点", "拖延", "stall"])) {
    return "redirect";
  }

  return "neutral";
}

export function buildScenarioTags(
  briefing: Pick<ScenarioBriefingData, "category" | "opponentRole" | "title" | "description">
): string[] {
  const tags = new Set<string>([briefing.category, briefing.opponentRole]);
  const keywordSource = `${briefing.title} ${briefing.description}`.toLowerCase();

  if (containsAny(keywordSource, ["薪资", "salary", "offer", "compensation"])) {
    tags.add("薪资");
  }
  if (containsAny(keywordSource, ["职场", "入职", "候选人", "hr", "workplace"])) {
    tags.add("职场");
  }
  if (containsAny(keywordSource, ["商务", "客户", "合作", "business"])) {
    tags.add("商务");
  }
  if (containsAny(keywordSource, ["生活", "daily", "rent", "family"])) {
    tags.add("生活");
  }

  return [...tags].slice(0, 4);
}

function containsAny(source: string, fragments: string[]): boolean {
  return fragments.some((fragment) => source.includes(fragment));
}

function isSituationScores(value: unknown): value is SituationScores {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return ["leverage", "info_advantage", "relationship", "agreement_prob", "satisfaction"].every(
    (key) => typeof candidate[key] === "number"
  );
}
