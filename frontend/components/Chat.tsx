"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { testLLM, type Message } from "@/lib/api";

// ── 类型 ──

interface ChatMessage extends Message {
  id: string;
  pending?: boolean;  // 流式输出进行中
}

// ── 子组件：单条消息气泡 ──

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <div
      className={`flex gap-3 animate-fade-up ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* 角色标签 */}
      <div
        className={`
          flex-shrink-0 w-7 h-7 rounded-sm text-[10px] font-mono font-semibold
          flex items-center justify-center border
          ${isUser
            ? "bg-forge-accent/10 border-forge-accent/30 text-forge-accent"
            : "bg-forge-danger/10 border-forge-danger/20 text-forge-danger"
          }
        `}
      >
        {isUser ? "YOU" : "OPP"}
      </div>

      {/* 气泡内容 */}
      <div
        className={`
          max-w-[75%] px-4 py-3 rounded-sm border text-sm leading-relaxed
          ${isUser
            ? "bg-forge-user-bubble border-forge-border text-forge-text"
            : "bg-forge-ai-bubble border-forge-border/60 text-forge-text"
          }
        `}
      >
        {msg.content}
        {msg.pending && (
          <span className="inline-block w-[7px] h-[14px] ml-1 bg-forge-accent animate-cursor-blink align-text-bottom" />
        )}
      </div>
    </div>
  );
}

// ── 主组件 ──

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content: "系统就绪。Phase 0 验证模式——直接与 LLM 对话，谈判场景将在 Phase 1 接入。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 自适应 textarea 高度
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };

    const assistantMsgId = `a-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      pending: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    try {
      // Phase 0：调用 LLM 测试接口（非流式），Phase 1 替换为真实流式谈判接口
      const result = await testLLM();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: result.reply, pending: false }
            : m
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── 消息列表 ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {/* 错误提示 */}
        {error && (
          <div className="text-xs text-forge-danger border border-forge-danger/20 bg-forge-danger/5 rounded-sm px-3 py-2">
            ⚠ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── 输入区 ── */}
      <div className="border-t border-forge-border px-4 py-3">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的回应…（Enter 发送，Shift+Enter 换行）"
            disabled={loading}
            rows={1}
            className="
              flex-1 resize-none bg-forge-surface border border-forge-border
              rounded-sm px-3 py-2.5 text-sm text-forge-text
              placeholder:text-forge-muted
              focus:outline-none focus:border-forge-accent/50
              disabled:opacity-40 transition-colors duration-150
              font-mono leading-relaxed
            "
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="
              flex-shrink-0 px-4 py-2.5 text-xs font-semibold tracking-widest
              bg-forge-accent text-forge-bg rounded-sm
              hover:bg-forge-accent/90 active:scale-[0.97]
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-all duration-150
            "
          >
            {loading ? "..." : "SEND"}
          </button>
        </div>

        <p className="mt-2 text-[10px] text-forge-muted">
          Phase 0 验证模式 · 当前模型：DeepSeek V3.2 · Enter 发送
        </p>
      </div>
    </div>
  );
}
