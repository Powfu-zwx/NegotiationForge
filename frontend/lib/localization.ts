import { type SessionStatusValue } from "@/lib/api";
import {
  type NegotiationPhaseId,
  type ScenarioBriefingData,
  type ScenarioCardData,
} from "@/lib/view-models";

export type Locale = "zh" | "en";

export interface PhaseDescriptor {
  id: NegotiationPhaseId;
  label: string;
  shortLabel: string;
  description: string;
}

type CopyValue = string | ((value?: string | number | null) => string);

export interface CopyTree {
  common: {
    language: string;
    chinese: string;
    english: string;
    close: string;
    open: string;
    locked: string;
    loading: string;
    round: (round: number) => string;
    current: string;
    liveSession: string;
    agreement: string;
    breakdown: string;
    reset: string;
    full: string;
    backToList: string;
    yes: string;
    no: string;
  };
  app: {
    idleSubtitle: string;
    engineLabel: string;
  };
  scenario: {
    library: string;
    title: string;
    description: string;
    currentSetup: string;
    trainingFocus: string;
    trainingFocusBody: string;
    experienceGoal: string;
    experienceGoalBody: string;
    difficulty: string;
    opponentRole: string;
    estimatedRounds: (rounds: number) => string;
    briefing: string;
    overview: string;
    opponentProfile: string;
    openingNote: string;
    openingHint: (rounds: number) => string;
    enter: string;
    initializing: string;
    loadFailed: string;
    untitled: string;
    uncategorized: string;
    unknownOpponent: string;
    unknownRole: string;
  };
  chat: {
    console: string;
    opponentLabel: string;
    placeholder: string;
    send: string;
    sending: string;
    markAgreement: string;
    markBreakdown: string;
    processing: string;
    readOnly: string;
    readonlyTitleAgreement: string;
    readonlyTitleBreakdown: string;
    readonlyBody: string;
    pivot: string;
    agreementProbability: string;
    currentProbability: string;
    phase: string;
    you: string;
  };
  analysis: {
    title: string;
    lens: string;
    analyzingRound: (round: number) => string;
    turningPointDetected: string;
    liveScoring: string;
    currentStrategy: string;
    rounds: string;
    agreementProbability: string;
    waitingToStart: string;
    opponentState: string;
    stateLegend: string;
    satisfaction: string;
    patience: string;
    rapport: string;
    radar: string;
    trend: string;
    fullTrend: string;
    noRadarYet: string;
    noTrendYet: string;
    turningReason: string;
    inProgress: string;
    ended: string;
    reviewLocked: string;
    reviewOpen: string;
    verdictPrompt: string;
  };
  forkTree: {
    title: string;
    subtitle: string;
    waitingEnd: string;
    pending: string;
    generating: string;
    done: string;
    failed: string;
    keyBranches: string;
    totalNodes: string;
    status: string;
    elapsed: string;
    elapsedLive: string;
    view: string;
    waitingTitle: string;
    waitingBody: string;
    pendingTitle: string;
    pendingBody: string;
    trigger: string;
    starting: string;
    generatingTitle: string;
    generatingBody: string;
    hintDivergence: string;
    hintDivergenceBody: string;
    hintResponse: string;
    hintResponseBody: string;
    hintClosure: string;
    hintClosureBody: string;
    errorTitle: string;
    emptyTitle: string;
    emptyBody: string;
    retry: string;
    fullscreen: string;
    exitFullscreen: string;
    readingGuide: string;
    timeline: string;
    timelineBody: string;
    mainline: string;
    branch: (label: string) => string;
    branchFromRound: (round: number) => string;
    branchPath: string;
    mainlinePath: string;
    slotYou: string;
    slotOpponent: string;
    detailMessage: string;
    detailContext: string;
    detailBranch: string;
    detailContextBody: string;
    detailBranchBody: string;
    detailScores: string;
    detailTurningReason: string;
    detailEmpty: string;
    readHintTitle: string;
    readHintBody: string;
    legendMainline: string;
    legendAggressive: string;
    legendConcede: string;
    legendRedirect: string;
    legendNeutral: string;
    realPath: string;
    alternatePath: string;
    escHint: string;
  };
  summary: {
    title: string;
    recap: string;
    noSummary: string;
    generate: string;
    analyzing: string;
    overallVerdict: string;
    turningPoints: string;
    yourMove: string;
    opponentReaction: string;
    strategyAnalysis: string;
    suggestions: string;
    closedAgreement: string;
    closedBreakdown: string;
  };
}

const COPY: Record<Locale, CopyTree> = {
  zh: {
    common: {
      language: "语言",
      chinese: "中文",
      english: "English",
      close: "关闭",
      open: "打开",
      locked: "锁定",
      loading: "加载中...",
      round: (round) => `第 ${round + 1} 轮`,
      current: "当前",
      liveSession: "进行中",
      agreement: "达成协议",
      breakdown: "谈判破裂",
      reset: "重新选择",
      full: "全屏",
      backToList: "返回列表",
      yes: "是",
      no: "否",
    },
    app: {
      idleSubtitle: "选择一个场景，进入你的第一条谈判主线。",
      engineLabel: "平行结果引擎",
    },
    scenario: {
      library: "场景库",
      title: "选择一条起始主线，再进入你的第一个平行世界。",
      description:
        "这不是和 AI 聊天练口才，而是在同一场谈判里看见不同策略如何改变后果。先确认场景与对手画像，再进入对抗。",
      currentSetup: "当前设置",
      trainingFocus: "演练重点",
      trainingFocusBody: "对手画像、策略分叉、关键转折",
      experienceGoal: "体验目标",
      experienceGoalBody: "先建立心理预期，再进入完整桌面工作台",
      difficulty: "难度",
      opponentRole: "对手角色",
      estimatedRounds: (rounds) => `预计 ${rounds} 轮`,
      briefing: "进入引导",
      overview: "场景简介",
      opponentProfile: "对手画像",
      openingNote: "开始前提示",
      openingHint: (rounds) =>
        `预计 ${rounds} 轮进入主要交锋阶段。进入后会直接加载完整工作台，分叉树区域先显示占位状态。`,
      enter: "进入谈判",
      initializing: "初始化中...",
      loadFailed: "场景列表加载失败",
      untitled: "未命名场景",
      uncategorized: "未分类",
      unknownOpponent: "未知对手",
      unknownRole: "未知角色",
    },
    chat: {
      console: "谈判控制台",
      opponentLabel: "当前对手",
      placeholder: "输入你的回应... Enter 发送，Shift+Enter 换行",
      send: "发送",
      sending: "发送中...",
      markAgreement: "达成协议",
      markBreakdown: "结束谈判",
      processing: "处理中...",
      readOnly: "只读模式",
      readonlyTitleAgreement: "谈判已达成协议",
      readonlyTitleBreakdown: "谈判已宣告破裂",
      readonlyBody: "本轮对话已经封存。你可以在中间面板查看复盘，在右侧查看替代路径与平行结果。",
      pivot: "关键转折",
      agreementProbability: "协议概率",
      currentProbability: "当前",
      phase: "谈判阶段",
      you: "我方",
    },
    analysis: {
      title: "态势分析",
      lens: "态势镜头",
      analyzingRound: (round) => `第 ${round + 1} 轮分析中`,
      turningPointDetected: "检测到关键转折",
      liveScoring: "实时评分",
      currentStrategy: "当前策略",
      rounds: "轮次",
      agreementProbability: "达成概率",
      waitingToStart: "等待开场",
      opponentState: "对手状态",
      stateLegend: "绿 / 黄 / 红",
      satisfaction: "满意度",
      patience: "耐心值",
      rapport: "关系温度",
      radar: "五维雷达",
      trend: "协议达成概率走势",
      fullTrend: "全程趋势",
      noRadarYet: "第一轮结束后显示雷达评分",
      noTrendYet: "发送消息后开始累计走势",
      turningReason: "转折原因",
      inProgress: "进行中",
      ended: "谈判结束",
      reviewLocked: "谈判结束后可查看完整复盘",
      reviewOpen: "查看复盘与关键策略点评",
      verdictPrompt: "查看复盘",
    },
    forkTree: {
      title: "博弈分叉树",
      subtitle: "主线是一次真实发生的谈判。分支是关键节点上的其他打法，以及它们可能带来的后果。",
      waitingEnd: "等待结束",
      pending: "待生成",
      generating: "生成中",
      done: "已完成",
      failed: "失败",
      keyBranches: "关键分支",
      totalNodes: "总节点",
      status: "状态",
      elapsed: "耗时",
      elapsedLive: "已耗时",
      view: "视图",
      waitingTitle: "谈判结束后将在此生成博弈分叉树",
      waitingBody: "当前先保留真实主线。待会话结束后，你可以基于关键转折点触发平行路径推演。",
      pendingTitle: "主线已封存，准备生成平行路径",
      pendingBody: "系统会围绕关键转折点生成替代策略，并继续向后推演即时回应与后续收束。",
      trigger: "生成博弈分叉树",
      starting: "启动中...",
      generatingTitle: "正在构建平行世界",
      generatingBody: "系统会先生成不同替代策略，再补出对手即时回应与后续回合，最终形成可比较的完整树图。",
      hintDivergence: "策略分歧",
      hintDivergenceBody: "围绕关键回合生成明显不同的谈判打法，而不是改写措辞。",
      hintResponse: "即时回应",
      hintResponseBody: "保持原角色设定，模拟对手在新路径之下的第一反应。",
      hintClosure: "后续收束",
      hintClosureBody: "继续补一轮追击与收束，形成可比较的短链结构。",
      errorTitle: "分叉树生成失败",
      emptyTitle: "当前会话没有可展开的分叉树",
      emptyBody: "本次谈判虽然已经结束，但没有足够明确的关键转折点可用于后续推演。",
      retry: "重新生成",
      fullscreen: "全屏查看",
      exitFullscreen: "退出全屏",
      readingGuide: "阅读方式",
      timeline: "时间轴",
      timelineBody: "每一列对应一轮谈判，上层是我方，下层是对手。",
      mainline: "主线",
      branch: (label) => `分支 ${label}`,
      branchFromRound: (round) => `从第 ${round + 1} 轮关键转折处分叉。`,
      branchPath: "替代路径",
      mainlinePath: "真实发生的谈判路径。",
      slotYou: "我方",
      slotOpponent: "对手",
      detailMessage: "完整发言",
      detailContext: "同轮上下文",
      detailBranch: "分支全貌",
      detailContextBody: "同一轮的双边发言",
      detailBranchBody: "完整替代路径",
      detailScores: "五维评分",
      detailTurningReason: "转折原因",
      detailEmpty: "点击上方任意卡片，在这里查看完整发言、同轮上下文和五维评分。",
      readHintTitle: "阅读方式",
      readHintBody:
        "最上方是实际发生的主线。下方每一行是一条替代路径，起点来自某个关键转折轮次。点击任意卡片，底部会展开完整发言和评分。",
      legendMainline: "主线",
      legendAggressive: "强硬策略",
      legendConcede: "让步策略",
      legendRedirect: "转移焦点",
      legendNeutral: "其他策略",
      realPath: "真实发生",
      alternatePath: "替代路径",
      escHint: "Esc 退出全屏",
    },
    summary: {
      title: "谈判复盘",
      recap: "谈判复盘",
      noSummary: "复盘会总结关键转折点、策略得失和下一次的改进方向。首次生成需要额外的 LLM 分析时间。",
      generate: "生成复盘报告",
      analyzing: "分析中，请稍候...",
      overallVerdict: "总体评价",
      turningPoints: "关键转折点",
      yourMove: "我方",
      opponentReaction: "对手",
      strategyAnalysis: "策略得失",
      suggestions: "改进建议",
      closedAgreement: "已达成协议",
      closedBreakdown: "已破裂",
    },
  },
  en: {
    common: {
      language: "Language",
      chinese: "中文",
      english: "English",
      close: "Close",
      open: "Open",
      locked: "Locked",
      loading: "Loading...",
      round: (round) => `Round ${round + 1}`,
      current: "Current",
      liveSession: "Live Session",
      agreement: "Agreement",
      breakdown: "Breakdown",
      reset: "Reset",
      full: "Full",
      backToList: "Back to list",
      yes: "Yes",
      no: "No",
    },
    app: {
      idleSubtitle: "Pick a scenario and step into your first negotiation timeline.",
      engineLabel: "Parallel Outcome Engine",
    },
    scenario: {
      library: "Scenario Library",
      title: "Choose an opening timeline, then enter your first parallel world.",
      description:
        "This is not casual AI roleplay. It is a decision lab where you can see how different strategies reshape the outcome of the same negotiation.",
      currentSetup: "Current Setup",
      trainingFocus: "Training Focus",
      trainingFocusBody: "Opponent profile, branch alternatives, and turning points",
      experienceGoal: "Experience Goal",
      experienceGoalBody: "Set expectations first, then enter the full negotiation workspace",
      difficulty: "Difficulty",
      opponentRole: "Opponent",
      estimatedRounds: (rounds) => `${rounds} expected rounds`,
      briefing: "Briefing",
      overview: "Scenario Overview",
      opponentProfile: "Opponent Profile",
      openingNote: "Before You Enter",
      openingHint: (rounds) =>
        `Expect the core bargaining phase around round ${rounds}. Once inside, the full workspace loads immediately and the fork tree starts in a placeholder state.`,
      enter: "Enter Negotiation",
      initializing: "Initializing...",
      loadFailed: "Failed to load scenarios.",
      untitled: "Untitled Scenario",
      uncategorized: "Uncategorized",
      unknownOpponent: "Unknown Opponent",
      unknownRole: "Unknown Role",
    },
    chat: {
      console: "Negotiation Console",
      opponentLabel: "Current Opponent",
      placeholder: "Write your move... Press Enter to send, Shift+Enter for a new line",
      send: "Send",
      sending: "Sending...",
      markAgreement: "Mark Agreement",
      markBreakdown: "End Negotiation",
      processing: "Processing...",
      readOnly: "Read Only",
      readonlyTitleAgreement: "Negotiation closed with an agreement",
      readonlyTitleBreakdown: "Negotiation ended in a breakdown",
      readonlyBody: "This conversation is archived. Use the middle panel for the recap and the right panel for alternate paths and parallel outcomes.",
      pivot: "Turning Point",
      agreementProbability: "Agreement",
      currentProbability: "Current",
      phase: "Negotiation Phase",
      you: "You",
    },
    analysis: {
      title: "Situation Analysis",
      lens: "Situation Lens",
      analyzingRound: (round) => `Analyzing round ${round + 1}`,
      turningPointDetected: "Turning point detected",
      liveScoring: "Live scoring",
      currentStrategy: "Current strategy",
      rounds: "Rounds",
      agreementProbability: "Agreement probability",
      waitingToStart: "Waiting for opening move",
      opponentState: "Opponent State",
      stateLegend: "Green / Yellow / Red",
      satisfaction: "Satisfaction",
      patience: "Patience",
      rapport: "Rapport",
      radar: "Five-Dimension Radar",
      trend: "Agreement Probability Trend",
      fullTrend: "Full timeline",
      noRadarYet: "Radar scores appear after the first completed round.",
      noTrendYet: "The trend line starts after the first analyzed exchange.",
      turningReason: "Why This Turn Mattered",
      inProgress: "In Progress",
      ended: "Negotiation Closed",
      reviewLocked: "The recap unlocks after the negotiation ends.",
      reviewOpen: "Open the recap and inspect the key strategic moments.",
      verdictPrompt: "Open Recap",
    },
    forkTree: {
      title: "Fork Tree",
      subtitle: "The mainline is what actually happened. Each branch is another move at a critical moment and the consequence it could have triggered.",
      waitingEnd: "Waiting",
      pending: "Pending",
      generating: "Generating",
      done: "Done",
      failed: "Failed",
      keyBranches: "Key Branches",
      totalNodes: "Total Nodes",
      status: "Status",
      elapsed: "Elapsed",
      elapsedLive: "Live Elapsed",
      view: "View",
      waitingTitle: "The fork tree appears here after the negotiation ends.",
      waitingBody: "For now the system keeps only the real mainline. Once the session ends, you can generate parallel paths from the critical turning points.",
      pendingTitle: "The mainline is archived and the parallel paths are ready to generate.",
      pendingBody: "The system will build alternative strategies around each turning point and continue the path with immediate replies and short downstream closure.",
      trigger: "Generate Fork Tree",
      starting: "Starting...",
      generatingTitle: "Building the parallel worlds",
      generatingBody: "The system is generating alternative moves first, then simulating the opponent response and the short continuation of each path.",
      hintDivergence: "Strategic divergence",
      hintDivergenceBody: "Generate meaningfully different negotiation moves instead of cosmetic rewrites.",
      hintResponse: "Immediate response",
      hintResponseBody: "Keep the original role logic and simulate the opponent's first reaction on the new path.",
      hintClosure: "Short closure",
      hintClosureBody: "Add one more exchange so each branch remains comparable and readable.",
      errorTitle: "Failed to generate the fork tree",
      emptyTitle: "This session has no expandable fork tree",
      emptyBody: "The negotiation ended, but the system did not find strong enough turning points to generate useful alternative paths.",
      retry: "Generate Again",
      fullscreen: "Fullscreen",
      exitFullscreen: "Exit Fullscreen",
      readingGuide: "How to Read",
      timeline: "Timeline",
      timelineBody: "Each column is one round. The upper slot is your move and the lower slot is the opponent response.",
      mainline: "Mainline",
      branch: (label) => `Branch ${label}`,
      branchFromRound: (round) => `Forked from the turning point in round ${round + 1}.`,
      branchPath: "Alternate path",
      mainlinePath: "The path that actually happened.",
      slotYou: "You",
      slotOpponent: "Opponent",
      detailMessage: "Full Message",
      detailContext: "Same-Round Context",
      detailBranch: "Full Branch",
      detailContextBody: "Both sides of the same round",
      detailBranchBody: "Entire alternate path",
      detailScores: "Situation Scores",
      detailTurningReason: "Turning Reason",
      detailEmpty: "Click any card above to inspect the full message, same-round context, and score profile here.",
      readHintTitle: "How to Read",
      readHintBody:
        "The top row is the real path. Every row below it is an alternate path that branches off from one turning point. Click any card to expand the full content and evaluation below.",
      legendMainline: "Mainline",
      legendAggressive: "Aggressive",
      legendConcede: "Concede",
      legendRedirect: "Redirect",
      legendNeutral: "Other",
      realPath: "What happened",
      alternatePath: "Alternate path",
      escHint: "Press Esc to exit fullscreen",
    },
    summary: {
      title: "Negotiation Recap",
      recap: "Negotiation Recap",
      noSummary: "The recap summarizes the key turning points, what worked or failed strategically, and what to improve next time. The first run needs an extra LLM pass.",
      generate: "Generate Recap",
      analyzing: "Analyzing, please wait...",
      overallVerdict: "Overall Verdict",
      turningPoints: "Turning Points",
      yourMove: "Your move",
      opponentReaction: "Opponent reaction",
      strategyAnalysis: "Strategy Analysis",
      suggestions: "Improvement Suggestions",
      closedAgreement: "Agreement reached",
      closedBreakdown: "Breakdown",
    },
  },
};

const PHASES: Record<Locale, PhaseDescriptor[]> = {
  zh: [
    { id: "opening", label: "开场", shortLabel: "开场", description: "建立位置，抛出基准。" },
    { id: "probing", label: "试探", shortLabel: "试探", description: "摸清边界，交换线索。" },
    { id: "bargaining", label: "交锋", shortLabel: "交锋", description: "真实交换与让步发生在这里。" },
    { id: "closing", label: "收尾", shortLabel: "收尾", description: "收拢条件，逼近结果。" },
  ],
  en: [
    { id: "opening", label: "Opening", shortLabel: "Open", description: "Set positions and establish the first anchor." },
    { id: "probing", label: "Probing", shortLabel: "Probe", description: "Test boundaries and exchange signal." },
    { id: "bargaining", label: "Bargaining", shortLabel: "Bargain", description: "This is where real exchange and concession happen." },
    { id: "closing", label: "Closing", shortLabel: "Close", description: "Tighten terms and move toward an outcome." },
  ],
};

const STRATEGY_LABELS: Array<{
  keywords: string[];
  zh: string;
  en: string;
}> = [
  { keywords: ["anchoring", "锚定"], zh: "锚定", en: "Anchoring" },
  { keywords: ["probing", "试探"], zh: "试探", en: "Probing" },
  { keywords: ["conceding", "让步", "妥协"], zh: "让步", en: "Concession" },
  { keywords: ["pressuring", "施压", "强硬"], zh: "施压", en: "Pressure" },
  { keywords: ["face_saving", "给台阶"], zh: "给台阶", en: "Face-saving" },
  { keywords: ["stalling", "拖延"], zh: "拖延", en: "Stalling" },
  { keywords: ["主线", "mainline"], zh: "主线", en: "Mainline" },
  { keywords: ["对手回应", "response"], zh: "对手回应", en: "Opponent Response" },
  { keywords: ["对手收束", "closure"], zh: "对手收束", en: "Opponent Closure" },
  { keywords: ["转移焦点", "redirect", "换取条件"], zh: "转移焦点", en: "Redirect" },
  { keywords: ["示弱"], zh: "示弱", en: "Softening" },
  { keywords: ["坚守底线"], zh: "坚守底线", en: "Hold the Line" },
];

const ROLE_LABELS: Record<string, { zh: string; en: string }> = {
  "HR 总监": { zh: "HR 总监", en: "HR Director" },
  候选人: { zh: "候选人", en: "Candidate" },
  职场: { zh: "职场", en: "Workplace" },
  商务: { zh: "商务", en: "Business" },
  生活: { zh: "生活", en: "Daily Life" },
  薪资: { zh: "薪资", en: "Compensation" },
  招聘: { zh: "招聘", en: "Hiring" },
  谈判: { zh: "谈判", en: "Negotiation" },
};

const SCORE_LABELS = {
  zh: [
    { key: "leverage", label: "议价力" },
    { key: "info_advantage", label: "信息优势" },
    { key: "relationship", label: "关系温度" },
    { key: "agreement_prob", label: "达成概率" },
    { key: "satisfaction", label: "满意度" },
  ],
  en: [
    { key: "leverage", label: "Leverage" },
    { key: "info_advantage", label: "Info Advantage" },
    { key: "relationship", label: "Rapport" },
    { key: "agreement_prob", label: "Agreement Odds" },
    { key: "satisfaction", label: "Satisfaction" },
  ],
} as const;

const SCENARIO_OVERRIDES: Record<string, Partial<ScenarioBriefingData>> = {
  salary_001: {
    title: "Backend Engineer Salary Negotiation",
    description:
      "A backend engineer with three years of experience negotiates an offer with a tech company's HR director.",
    category: "Workplace",
    opponentRole: "HR Director",
    opponentIdentity: "The HR director leading this offer negotiation.",
    opponentObjective: "Fill the role at the lowest salary the company can justify.",
    opponentStyle: "Direct and pragmatic. Prefers clean reasoning over emotional framing.",
    opponentPressureResponse:
      "Under pressure, the opponent may soften slightly but will usually ask for evidence and buy time.",
    contextSetting:
      "A midsize technology company has finished the interview loop and moved into the compensation discussion.",
    contextBackground:
      "Both sides know the candidate has three years of backend experience, passed the interviews, and is now in the offer stage.",
    tags: ["Workplace", "Compensation", "Hiring", "HR"],
  },
};

export function getCopy(locale: Locale): CopyTree {
  return COPY[locale];
}

export function getPhaseDescriptors(locale: Locale): PhaseDescriptor[] {
  return PHASES[locale];
}

export function getPhaseDescriptor(
  phase: NegotiationPhaseId | undefined,
  locale: Locale
): PhaseDescriptor {
  return getPhaseDescriptors(locale).find((item) => item.id === phase) ?? getPhaseDescriptors(locale)[0];
}

export function getStrategyLabel(
  strategy: string | undefined,
  locale: Locale
): string | undefined {
  if (!strategy) {
    return undefined;
  }

  const lower = strategy.toLowerCase();
  const matched = STRATEGY_LABELS.find(({ keywords }) =>
    keywords.some((keyword) => lower.includes(keyword.toLowerCase()))
  );

  if (matched) {
    return locale === "zh" ? matched.zh : matched.en;
  }

  return strategy;
}

export function getSpeakerLabel(
  speaker: "user" | "opponent",
  locale: Locale
): string {
  if (locale === "en") {
    return speaker === "user" ? "You" : "Opponent";
  }

  return speaker === "user" ? "我方" : "对手";
}

export function getScoreDimensionLabels(locale: Locale) {
  return SCORE_LABELS[locale];
}

export function localizeSessionStatus(
  status: SessionStatusValue,
  locale: Locale
): string {
  const common = getCopy(locale).common;

  if (status === "agreement") {
    return common.agreement;
  }

  if (status === "breakdown") {
    return common.breakdown;
  }

  return common.liveSession;
}

export function translateRoleLabel(value: string, locale: Locale): string {
  const matched = ROLE_LABELS[value];
  if (matched) {
    return locale === "zh" ? matched.zh : matched.en;
  }

  return value;
}

export function localizeScenarioBriefing(
  briefing: ScenarioBriefingData | null,
  locale: Locale
): ScenarioBriefingData | null {
  if (!briefing) {
    return null;
  }

  if (locale === "zh") {
    return briefing;
  }

  const override = SCENARIO_OVERRIDES[briefing.scenarioId] ?? {};

  return {
    ...briefing,
    title: override.title ?? briefing.title,
    description: override.description ?? briefing.description,
    category: override.category ?? translateRoleLabel(briefing.category, locale),
    opponentRole: override.opponentRole ?? translateRoleLabel(briefing.opponentRole, locale),
    opponentIdentity: override.opponentIdentity ?? briefing.opponentIdentity,
    opponentObjective: override.opponentObjective ?? briefing.opponentObjective,
    opponentStyle: override.opponentStyle ?? briefing.opponentStyle,
    opponentPressureResponse: override.opponentPressureResponse ?? briefing.opponentPressureResponse,
    contextSetting: override.contextSetting ?? briefing.contextSetting,
    contextBackground: override.contextBackground ?? briefing.contextBackground,
    tags: override.tags ?? briefing.tags.map((tag) => translateRoleLabel(tag, locale)),
  };
}

export function localizeScenarioCard(
  scenario: ScenarioCardData,
  locale: Locale
): ScenarioCardData {
  if (locale === "zh") {
    return scenario;
  }

  const override = SCENARIO_OVERRIDES[scenario.scenarioId] ?? {};

  return {
    ...scenario,
    title: override.title ?? scenario.title,
    description: override.description ?? scenario.description,
    category: override.category ?? translateRoleLabel(scenario.category, locale),
    opponentRole: override.opponentRole ?? translateRoleLabel(scenario.opponentRole, locale),
    tags: override.tags ?? scenario.tags.map((tag) => translateRoleLabel(tag, locale)),
  };
}
