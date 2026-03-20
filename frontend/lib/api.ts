const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, error.detail ?? `请求失败：${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Phase 0 遗留（保留，不删）
// ---------------------------------------------------------------------------

export interface HealthData {
  status: string;
  env: string;
  llm_provider: string;
  llm_provider_configured: boolean;
}

export interface LLMTestData {
  provider: string;
  model: string;
  reply: string;
  input_tokens: number;
  output_tokens: number;
}

export const checkHealth = () => request<HealthData>("/health");
export const testLLM = () => request<LLMTestData>("/llm/test");

// ---------------------------------------------------------------------------
// Phase 1：场景
// ---------------------------------------------------------------------------

export interface ScenarioSummary {
  scenario_id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  estimated_rounds: number;
}

export const getScenarios = () => request<ScenarioSummary[]>("/scenarios");

// ---------------------------------------------------------------------------
// Phase 1：会话
// ---------------------------------------------------------------------------

export interface SessionInfo {
  session_id: string;
  scenario_id: string;
  opponent_name: string;
  opponent_role: string;
  context_setting: string;
  context_background: string;
}

export const createSession = (scenario_id: string) =>
  request<SessionInfo>("/sessions", {
    method: "POST",
    body: JSON.stringify({ scenario_id }),
  });

// ---------------------------------------------------------------------------
// Phase 1：对话
// ---------------------------------------------------------------------------

export interface OpponentState {
  round_count: number;
  satisfaction: number;
  patience: number;
  rapport: number;
  current_strategy: string;
  current_phase: string;
}

export type SessionStatusValue = "active" | "agreement" | "breakdown";
export type CompletionStatusValue = Exclude<SessionStatusValue, "active">;

export interface ChatResponse {
  reply: string;
  state: OpponentState;
  session_status: SessionStatusValue;
}

export interface CompleteSessionResponse {
  session_id: string;
  session_status: CompletionStatusValue;
  message: string;
}

export const sendMessage = (session_id: string, message: string) =>
  request<ChatResponse>(`/sessions/${session_id}/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });

export const completeSession = (session_id: string, status: CompletionStatusValue) =>
  request<CompleteSessionResponse>(`/sessions/${session_id}/complete`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });

// ---------------------------------------------------------------------------
// Phase 2：态势分析
// ---------------------------------------------------------------------------

export interface SituationScores {
  leverage: number;
  info_advantage: number;
  relationship: number;
  agreement_prob: number;
  satisfaction: number;
}

export interface AnalysisResult {
  session_id: string;
  round: number;
  is_turning_point: boolean;
  turning_reason: string | null;
  scores: SituationScores;
}

export interface AnalysisListResponse {
  session_id: string;
  results: AnalysisResult[];
}

export const getAnalysis = (session_id: string) =>
  request<AnalysisListResponse>(`/sessions/${session_id}/analysis`);

// ---------------------------------------------------------------------------
// Phase 2：复盘
// ---------------------------------------------------------------------------

export interface TurningPointSummary {
  round: number;
  reason: string;
  player_move: string;
  opponent_reaction: string;
}

export interface SummaryContent {
  turning_points: TurningPointSummary[];
  strategy_analysis: string;
  improvement_suggestions: string[];
  final_verdict: string;
}

export interface SummaryResponse {
  session_id: string;
  summary: SummaryContent;
}

export const createSummary = (session_id: string) =>
  request<SummaryResponse>(`/sessions/${session_id}/summary`, {
    method: "POST",
  });

export const getSummary = (session_id: string) =>
  request<SummaryResponse>(`/sessions/${session_id}/summary`);

// ---------------------------------------------------------------------------
// Phase 3：分叉树
// ---------------------------------------------------------------------------

export interface ForkNode {
  node_id: string;
  turn: number;
  speaker: "user" | "opponent";
  content: string;
  strategy_label: string;
  is_mainline: boolean;
  analysis_snapshot: Record<string, unknown> | null;
  children: ForkNode[];
}

export interface ForkTree {
  session_id: string;
  status: "pending" | "generating" | "done" | "error";
  error_message: string | null;
  created_at: string;
  updated_at: string;
  root: ForkNode | null;
  fork_count: number;
  total_nodes: number;
}

export interface ForkTreeStatusResponse {
  session_id: string;
  status: "pending" | "generating" | "done" | "error";
  error_message: string | null;
  fork_count: number;
  total_nodes: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface TriggerForkTreeResponse {
  session_id: string;
  status: "pending" | "generating" | "done" | "error";
  message: string;
}

export const triggerForkTree = (session_id: string) =>
  request<TriggerForkTreeResponse>(`/sessions/${session_id}/fork-tree`, {
    method: "POST",
  });

export const getForkTree = (session_id: string) =>
  request<ForkTree | ForkTreeStatusResponse>(`/sessions/${session_id}/fork-tree`);
