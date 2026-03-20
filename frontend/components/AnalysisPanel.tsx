"use client";

import {
  type AnalysisResult,
  type OpponentState,
  type SessionStatusValue,
  type SituationScores,
} from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import {
  getCopy,
  getScoreDimensionLabels,
  getStrategyLabel,
} from "@/lib/localization";
import { formatAgreementProbability } from "@/lib/view-models";

interface AnalysisPanelProps {
  opponentState: OpponentState | null;
  results: AnalysisResult[];
  pendingRound: number | null;
  sessionStatus: SessionStatusValue;
  onShowSummary: () => void;
}

export default function AnalysisPanel({
  opponentState,
  results,
  pendingRound,
  sessionStatus,
  onShowSummary,
}: AnalysisPanelProps) {
  const { locale } = useLocale();
  const copy = getCopy(locale);
  const dimensions = getScoreDimensionLabels(locale);
  const latest = results.length > 0 ? results[results.length - 1] : null;
  const metrics = deriveMetrics(opponentState, latest);
  const strategyStream = results.slice(-4).reverse().map((result) => describeResult(result, locale));

  return (
    <section className="flat-panel flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-forge-border px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
              {copy.analysis.lens}
            </p>
            <h2 className="mt-3 font-serif text-[1.6rem] text-forge-text">
              {copy.analysis.title}
            </h2>
          </div>

          {pendingRound !== null ? (
            <span className="forge-chip forge-chip-accent">
              {copy.analysis.analyzingRound(pendingRound)}
            </span>
          ) : latest?.is_turning_point ? (
            <span className="forge-chip forge-chip-alt">{copy.analysis.turningPointDetected}</span>
          ) : (
            <span className="forge-chip">{copy.analysis.liveScoring}</span>
          )}
        </div>

        <div className="mt-5 grid gap-3">
          <InfoRow
            label={copy.analysis.currentStrategy}
            value={
              getStrategyLabel(opponentState?.current_strategy, locale) ??
              copy.analysis.waitingToStart
            }
          />
          <InfoRow
            label={copy.analysis.rounds}
            value={
              opponentState
                ? copy.common.round(Math.max(opponentState.round_count - 1, 0))
                : copy.analysis.waitingToStart
            }
          />
          <InfoRow
            label={copy.analysis.agreementProbability}
            value={latest ? formatAgreementProbability(latest.scores.agreement_prob) : "--"}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-6">
          <div className="grid gap-3">
            <DerivedMeter
              label={locale === "en" ? "Break Risk" : "破裂风险"}
              value={metrics.breakRisk}
              tone="danger"
            />
            <DerivedMeter
              label={locale === "en" ? "Concession Window" : "让步窗口"}
              value={metrics.concessionWindow}
              tone="success"
            />
            <DerivedMeter
              label={locale === "en" ? "Bottom-Line Pressure" : "底线逼近"}
              value={metrics.bottomLinePressure}
              tone="warning"
            />
          </div>

          <SectionCard
            title={copy.analysis.opponentState}
            meta={locale === "en" ? "Live state" : "实时状态"}
          >
            <div className="space-y-4">
              <StatusBar label={copy.analysis.satisfaction} value={opponentState?.satisfaction ?? null} />
              <StatusBar label={copy.analysis.patience} value={opponentState?.patience ?? null} />
              <StatusBar label={copy.analysis.rapport} value={opponentState?.rapport ?? null} />
            </div>
          </SectionCard>

          <SectionCard title={copy.analysis.radar} meta="0 - 10">
            {latest ? (
              <>
                <div className="mt-4 flex justify-center">
                  <RadarChart scores={latest.scores} />
                </div>
                <div className="mt-5 grid gap-2">
                  {dimensions.map((dimension) => (
                    <div key={dimension.key} className="flex items-center justify-between text-sm">
                      <span className="text-forge-secondary">{dimension.label}</span>
                      <span className="font-mono text-forge-text">
                        {latest.scores[dimension.key].toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyViz text={copy.analysis.noRadarYet} />
            )}
          </SectionCard>

          <SectionCard title={copy.analysis.trend} meta={copy.analysis.fullTrend}>
            {results.length > 0 ? (
              <AgreementTrend results={results} />
            ) : (
              <EmptyViz text={copy.analysis.noTrendYet} />
            )}
          </SectionCard>

          <section className="forge-terminal overflow-hidden">
            <div className="flex items-center justify-between border-b border-forge-border px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
                {locale === "en" ? "Strategy Analysis Stream" : "策略分析流"}
              </p>
              <span className="forge-chip">
                {pendingRound !== null
                  ? locale === "en"
                    ? "Streaming"
                    : "生成中"
                  : locale === "en"
                  ? "Live"
                  : "实时"}
              </span>
            </div>

            <div className="space-y-3 px-4 py-4 font-mono text-[12px] leading-6">
              {strategyStream.length > 0 ? (
                strategyStream.map((line, index) => (
                  <div key={`${line.round}-${index}`} className="border border-forge-border bg-forge-bg px-3 py-3 text-forge-secondary">
                    <span className="text-forge-accent">{line.roundLabel}</span>
                    <span className="mx-2 text-forge-muted">::</span>
                    <span>{line.body}</span>
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-forge-border px-4 py-5 text-forge-muted">
                  {locale === "en"
                    ? "Awaiting a scored round. Tactical inference will stream here after the first exchange."
                    : "等待首轮评分结果。第一轮对话完成后，战术推断会滚动显示在这里。"}
                </div>
              )}

              <div className="flex items-center gap-2 text-forge-accent">
                <span className="inline-block h-4 w-2 animate-cursor-blink bg-forge-accent" />
                <span>
                  {pendingRound !== null
                    ? locale === "en"
                      ? "analysis pipeline active"
                      : "analysis pipeline active"
                    : locale === "en"
                    ? "monitoring new signals"
                    : "monitoring new signals"}
                </span>
              </div>
            </div>
          </section>

          {latest?.turning_reason && (
            <section className="border border-forge-alt/40 bg-forge-alt/10 p-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-alt">
                {copy.analysis.turningReason}
              </p>
              <p className="mt-3 text-sm leading-7 text-forge-text">{latest.turning_reason}</p>
            </section>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-forge-border px-5 py-4">
        <button
          type="button"
          onClick={onShowSummary}
          disabled={sessionStatus === "active"}
          className={`flex w-full items-center justify-between border px-4 py-4 text-left transition-colors duration-150 ${
            sessionStatus === "active"
              ? "cursor-not-allowed border-forge-border bg-forge-panel text-forge-secondary"
              : "border-forge-accent/30 bg-forge-accent/10 text-forge-text hover:border-forge-accent/40"
          }`}
        >
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-inherit">
              {sessionStatus === "active" ? copy.analysis.inProgress : copy.analysis.ended}
            </p>
            <p className="mt-2 text-sm">
              {sessionStatus === "active"
                ? copy.analysis.reviewLocked
                : copy.analysis.reviewOpen}
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em]">
            {sessionStatus === "active" ? copy.common.locked : copy.common.open}
          </span>
        </button>
      </footer>
    </section>
  );
}

function SectionCard({
  title,
  meta,
  children,
}: {
  title: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-forge-border bg-forge-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-accent">
          {title}
        </p>
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-forge-secondary">
          {meta}
        </span>
      </div>
      {children}
    </section>
  );
}

function DerivedMeter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "danger" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-forge-success"
      : tone === "warning"
      ? "bg-forge-alt"
      : "bg-forge-danger";

  return (
    <div className="border border-forge-border bg-forge-panel px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-muted">
          {label}
        </p>
        <span className="font-mono text-sm text-forge-text">{value === null ? "--" : `${value}%`}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden bg-forge-border/30">
        <div className={`h-full rounded-full transition-all duration-500 ${toneClass}`} style={{ width: `${value ?? 0}%` }} />
      </div>
    </div>
  );
}

function RadarChart({ scores }: { scores: SituationScores }) {
  const { locale } = useLocale();
  const dimensions = getScoreDimensionLabels(locale);
  const size = 248;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 72;
  const labelRadius = radius + 26;
  const angleStep = (2 * Math.PI) / dimensions.length;
  const startAngle = -Math.PI / 2;
  const gridLevels = [0.25, 0.5, 0.75, 1];

  const toPoint = (index: number, pointRadius: number) => ({
    x: centerX + pointRadius * Math.cos(startAngle + index * angleStep),
    y: centerY + pointRadius * Math.sin(startAngle + index * angleStep),
  });

  const toPath = (points: Array<{ x: number; y: number }>) =>
    `${points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" ")} Z`;

  const dataPoints = dimensions.map((dimension, index) =>
    toPoint(index, (scores[dimension.key] / 10) * radius)
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      {gridLevels.map((level) => (
        <path
          key={level}
          d={toPath(dimensions.map((_, index) => toPoint(index, level * radius)))}
          fill="none"
          stroke="rgba(161,161,170,0.22)"
          strokeWidth={level === 1 ? 1 : 0.8}
        />
      ))}

      {dimensions.map((_, index) => {
        const point = toPoint(index, radius);
        return (
          <line
            key={index}
            x1={centerX}
            y1={centerY}
            x2={point.x}
            y2={point.y}
            stroke="rgba(161,161,170,0.18)"
            strokeWidth={0.8}
          />
        );
      })}

      <path
        d={toPath(dataPoints)}
        fill="rgba(96,165,250,0.2)"
        stroke="var(--accent-warm)"
        strokeWidth={2.2}
        strokeLinejoin="round"
      />

      {dataPoints.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r={3.6} fill="var(--accent-warm)" />
      ))}

      {dimensions.map((dimension, index) => {
        const point = toPoint(index, labelRadius);
        return (
          <text
            key={dimension.key}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontFamily="var(--font-mono)"
            fill="var(--text-secondary)"
          >
            {dimension.label}
          </text>
        );
      })}
    </svg>
  );
}

function AgreementTrend({ results }: { results: AnalysisResult[] }) {
  const width = 290;
  const height = 130;
  const padding = 14;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = results.map((result, index) => ({
    x:
      padding +
      (results.length === 1 ? innerWidth / 2 : (index / (results.length - 1)) * innerWidth),
    y: padding + (1 - result.scores.agreement_prob / 10) * innerHeight,
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    `${linePath} ` +
    `L${points[points.length - 1].x.toFixed(1)},${(height - padding).toFixed(1)} ` +
    `L${padding},${(height - padding).toFixed(1)} Z`;

  return (
    <div className="mt-4">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((level) => {
          const y = padding + level * innerHeight;
          return (
            <line
              key={level}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="rgba(161,161,170,0.22)"
              strokeDasharray="4 6"
            />
          );
        })}

        <path d={areaPath} fill="rgba(96,165,250,0.18)" />
        <path d={linePath} fill="none" stroke="var(--accent-warm)" strokeWidth={2.5} />

        {points.map((point, index) => (
          <g key={results[index].round}>
            <circle cx={point.x} cy={point.y} r={4} fill="var(--accent-warm)" />
            <text
              x={point.x}
              y={height - 2}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-mono)"
              fill="var(--text-secondary)"
            >
              R{results[index].round + 1}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function StatusBar({ label, value }: { label: string; value: number | null }) {
  const tone =
    value === null
      ? "bg-forge-border/40"
      : value >= 65
      ? "bg-forge-success"
      : value >= 35
      ? "bg-forge-alt"
      : "bg-forge-danger";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-forge-secondary">{label}</span>
        <span className="font-mono text-forge-text">{value === null ? "--" : `${value}%`}</span>
      </div>
      <div className="h-2 overflow-hidden bg-forge-border/30">
        <div className={`h-full rounded-full transition-all duration-500 ${tone}`} style={{ width: `${value ?? 0}%` }} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-forge-border bg-forge-bg px-4 py-3">
      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-forge-secondary">
        {label}
      </span>
      <span className="text-sm text-forge-text">{value}</span>
    </div>
  );
}

function EmptyViz({ text }: { text: string }) {
  return (
    <div className="mt-4 flex h-[180px] items-center justify-center border border-dashed border-forge-border bg-forge-bg px-5 text-center text-sm leading-7 text-forge-secondary">
      {text}
    </div>
  );
}

function deriveMetrics(
  opponentState: OpponentState | null,
  latest: AnalysisResult | null
): {
  breakRisk: number | null;
  concessionWindow: number | null;
  bottomLinePressure: number | null;
} {
  const breakRisk =
    latest !== null ? clamp(Math.round((10 - latest.scores.agreement_prob) * 10)) : null;
  const concessionWindow =
    latest !== null
      ? clamp(Math.round(((latest.scores.relationship + latest.scores.satisfaction) / 20) * 100))
      : null;
  const bottomLinePressure =
    opponentState !== null
      ? clamp(Math.round(100 - (opponentState.patience + opponentState.satisfaction) / 2))
      : latest !== null
      ? clamp(Math.round((10 - latest.scores.satisfaction) * 10))
      : null;

  return { breakRisk, concessionWindow, bottomLinePressure };
}

function describeResult(result: AnalysisResult, locale: "zh" | "en") {
  const parts: string[] = [];

  if (result.scores.relationship >= 7) {
    parts.push(locale === "en" ? "rapport remains stable" : "关系温度保持稳定");
  } else if (result.scores.relationship <= 4) {
    parts.push(locale === "en" ? "rapport is cooling" : "关系温度正在下降");
  }

  if (result.scores.leverage >= 7) {
    parts.push(locale === "en" ? "counterparty leverage is high" : "对手筹码占优");
  }

  if (result.scores.info_advantage <= 4) {
    parts.push(locale === "en" ? "information visibility is thin" : "信息透明度偏低");
  }

  if (result.turning_reason) {
    parts.push(result.turning_reason);
  } else {
    parts.push(
      locale === "en"
        ? `agreement odds ${formatAgreementProbability(result.scores.agreement_prob)}`
        : `达成概率 ${formatAgreementProbability(result.scores.agreement_prob)}`
    );
  }

  return {
    round: result.round,
    roundLabel: `R${result.round + 1}`,
    body: parts.join(locale === "en" ? "; " : "；"),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
