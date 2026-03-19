/**
 * 后端 API 通信工具函数。
 * Phase 0：健康检查 + LLM 连通测试 + 流式对话。
 * Phase 1+ 的场景、谈判、分析接口在此逐步添加。
 */

const API_BASE = "/api/v1";

// ── 类型定义 ──

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

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// ── 基础请求封装 ──

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? `请求失败：${res.status}`);
  }
  return res.json();
}

// ── Phase 0 接口 ──

/** 健康检查，确认后端在线 */
export const checkHealth = () =>
  request<HealthData>("/health");

/** LLM 连通性测试，确认 API Key 有效 */
export const testLLM = () =>
  request<LLMTestData>("/llm/test");

/**
 * 流式对话（Phase 0 简化版，直接调用 LLM 测试接口）。
 * Phase 1 会替换为完整的谈判对话接口。
 *
 * @param messages  完整对话历史
 * @param onChunk   每收到一个文本块时的回调
 * @param onDone    流结束时的回调
 */
export async function streamChat(
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void,
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? `请求失败：${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("无法获取响应流");

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    // 解析 SSE 格式：data: <text>\n\n
    for (const line of chunk.split("\n")) {
      if (line.startsWith("data: ")) {
        const text = line.slice(6);
        if (text && text !== "[DONE]") onChunk(text);
      }
    }
  }
  onDone();
}
