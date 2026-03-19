import Chat from "@/components/Chat";

export default function Home() {
  return (
    <main className="h-screen flex flex-col max-w-3xl mx-auto">

      {/* ── 顶部 Header ── */}
      <header className="flex-shrink-0 border-b border-forge-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-lg text-forge-text tracking-tight">
            Negotiation<span className="text-forge-accent">Forge</span>
          </h1>
          <p className="text-[10px] text-forge-muted mt-0.5 font-mono tracking-widest uppercase">
            Phase 0 · 技术验证
          </p>
        </div>

        {/* 状态指示 */}
        <div className="flex items-center gap-2 text-[10px] text-forge-muted font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-forge-accent animate-pulse" />
          DeepSeek V3.2
        </div>
      </header>

      {/* ── 对话区，占满剩余高度 ── */}
      <div className="flex-1 overflow-hidden">
        <Chat />
      </div>

    </main>
  );
}
