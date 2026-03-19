const API_BASE = "/api/v1";
export interface HealthData { status: string; env: string; llm_provider: string; llm_provider_configured: boolean; }
export interface LLMTestData { provider: string; model: string; reply: string; input_tokens: number; output_tokens: number; }
export interface Message { role: "user" | "assistant" | "system"; content: string; }
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) { const error = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(error.detail ?? `请求失败：${res.status}`); }
  return res.json();
}
export const checkHealth = () => request<HealthData>("/health");
export const testLLM = () => request<LLMTestData>("/llm/test");
