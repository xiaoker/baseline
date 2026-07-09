import {
  DECISION_MATRIX,
  getFactorDefinition,
  getIntervalDefinition,
  getQuadrantDefinition,
  type IntervalId,
  type QuadrantId
} from "./strategyDefinitions";
import type {
  BaselineEngineAssessment,
  BaselineState,
  DashboardState,
  FactorStrategicAssessment,
  FactorState,
  IntervalState,
  MarketBreadth,
  MarketScenarioInput,
  PortfolioPlan,
  QuadrantCandidate,
  QuadrantItem
} from "./types";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export function deriveFactorOutlook(score: number): FactorState["outlook"] {
  if (score >= 65) return "optimistic";
  if (score <= 40) return "pessimistic";
  return "neutral";
}

export function normalizeFactorState(factor: FactorState): FactorState {
  const outlook = factor.outlook ?? deriveFactorOutlook(factor.score);
  const outlookSummary =
    factor.outlookSummary ||
    (outlook === "optimistic"
      ? "该因子当前偏乐观，对风险偏好或结构机会形成支持。"
      : outlook === "pessimistic"
        ? "该因子当前偏悲观，需要降低仓位或等待修复。"
        : "该因子当前中性，不构成行情主导变量。");
  return { ...factor, outlook, outlookSummary };
}

export function weightedFactorScore(factors: FactorState[]): number {
  const totalWeight = factors.reduce((sum, factor) => sum + getFactorDefinition(factor.id).defaultWeight, 0);
  if (!totalWeight) return 50;

  const score = factors.reduce((sum, factor) => {
    const definition = getFactorDefinition(factor.id);
    return sum + factor.score * definition.defaultWeight * factor.confidence;
  }, 0);

  const confidenceWeight = factors.reduce((sum, factor) => {
    const definition = getFactorDefinition(factor.id);
    return sum + definition.defaultWeight * factor.confidence;
  }, 0);

  return Math.round(clamp(score / Math.max(confidenceWeight, 0.01)));
}

export function deriveFactorStrategicAssessment(factors: FactorState[]): FactorStrategicAssessment {
  const normalized = factors.map(normalizeFactorState);
  const factorById = (id: FactorState["id"]) => normalized.find((factor) => factor.id === id);
  const denominator = factorById("liquidity_denominator")!;
  const macro = factorById("macro_numerator")!;
  const structure = factorById("structure_numerator")!;
  const ranking = [...normalized]
    .sort((a, b) => b.score - a.score)
    .map((factor, index) => ({
      factorId: factor.id,
      name: getFactorDefinition(factor.id).name,
      score: factor.score,
      outlook: factor.outlook,
      rank: index + 1
    }));

  const structureLead = structure.score - Math.max(denominator.score, macro.score);
  const totalAverage = (denominator.score + macro.score) / 2;
  const evidence = [
    `总量分母 ${denominator.score}，总量分子 ${macro.score}，结构分子 ${structure.score}。`,
    `结构分子相对次强因子差值 ${Math.round(structureLead)}，总量均值 ${Math.round(totalAverage)}。`
  ];

  if (structure.score >= 70 && structureLead >= 10 && denominator.score >= 45) {
    return {
      dominantForce: "structure_led",
      dominantForceLabel: "结构分子占优",
      baselineDirection: "中期基线偏结构性做多",
      baselineStance: "risk_on",
      summary: "分母没有明显压制，结构分子显著强于总量分子，市场更可能由结构牛或结构性主线主导。",
      factorRanking: ranking,
      evidence: [
        ...evidence,
        "符合“分母中性，结构分子占优”的格局：战略上不应看空市场，应聚焦结构性机会。"
      ],
      guidance: [
        "中期基线围绕结构主线设定，不用指数弱波动轻易否定主线。",
        "优先寻找一象限核心和二象限弹性品种。",
        "三象限只能作为短期情绪猎场，不能替代结构分子证据。"
      ]
    };
  }

  if (macro.score <= 40 && macro.score <= denominator.score && structure.score < 70) {
    return {
      dominantForce: "macro_drag",
      dominantForceLabel: "总量分子转弱",
      baselineDirection: "中期基线偏宏观防守",
      baselineStance: denominator.score <= 45 ? "risk_off" : "balanced",
      summary: "总量分子转弱，宏观经济和盈利总量压力会成为市场主导叙事。",
      factorRanking: ranking,
      evidence: [...evidence, "总量分子处于悲观区间且结构分子不足以抵消宏观压力。"],
      guidance: [
        "降低对全市场 beta 的期待。",
        "关注通缩、衰退、盈利下修等宏观主题。",
        "只有被强结构证据支撑的方向才允许保留中期仓位。"
      ]
    };
  }

  if (denominator.score <= 40) {
    return {
      dominantForce: "denominator_pressure",
      dominantForceLabel: "总量分母压制",
      baselineDirection: "中期基线降风险",
      baselineStance: "risk_off",
      summary: "流动性和风险偏好被分母端压制，估值扩张空间受限。",
      factorRanking: ranking,
      evidence: [...evidence, "分母处于悲观区间，优先处理估值和流动性压力。"],
      guidance: [
        "控制总仓位和高估值资产暴露。",
        "等待利率、汇率、资金流和波动率修复。",
        "结构机会需要更高证据门槛。"
      ]
    };
  }

  if (denominator.score >= 65 && macro.score >= 60) {
    return {
      dominantForce: "broad_beta",
      dominantForceLabel: "总量共振",
      baselineDirection: "中期基线偏全市场 beta",
      baselineStance: "risk_on",
      summary: "分母和总量分子同时改善，市场具备更宽的风险偏好和盈利基础。",
      factorRanking: ranking,
      evidence: [...evidence, "分母和总量分子同时处于偏乐观状态。"],
      guidance: [
        "可以提高对指数和顺周期 beta 的关注。",
        "结构分子仍用于寻找超额收益，但不是唯一主导。",
        "仓位可比纯结构行情更均衡。"
      ]
    };
  }

  if (denominator.score >= 65 && macro.score < 60) {
    return {
      dominantForce: "liquidity_beta",
      dominantForceLabel: "分母修复",
      baselineDirection: "中期基线偏估值修复",
      baselineStance: "balanced",
      summary: "分母改善但盈利基础未同步确认，行情更偏估值修复和风险偏好回升。",
      factorRanking: ranking,
      evidence: [...evidence, "分母强于总量分子，盈利基础尚未确认。"],
      guidance: [
        "可以参与风险偏好修复，但避免把估值修复误判为盈利牛。",
        "优先选择有结构分子支撑的修复方向。",
        "观察总量分子是否跟上。"
      ]
    };
  }

  return {
    dominantForce: "balanced",
    dominantForceLabel: "三因子均衡",
    baselineDirection: "中期基线保持中性观察",
    baselineStance: "balanced",
    summary: "三因子没有形成清晰主导力量，系统应等待结构或总量方向进一步确认。",
    factorRanking: ranking,
    evidence,
    guidance: [
      "降低主观预测，等待市场选择主线。",
      "用四区间和四象限观察资金如何重新分配。",
      "保持仓位弹性，避免过早押注单一叙事。"
    ]
  };
}

export function calculateEntropyScore(candidate: QuadrantCandidate, breadth: MarketBreadth): number {
  const trendInstability = 100 - candidate.trendScore;
  const crowdingPenalty = candidate.hotMoney > 80 ? 12 : candidate.hotMoney > 68 ? 6 : 0;
  return Math.round(
    clamp(
      trendInstability * 0.32 +
        breadth.volatilityScore * 0.28 +
        breadth.dispersionScore * 0.24 +
        crowdingPenalty +
        (100 - candidate.liquidityScore) * 0.16
    )
  );
}

export function deriveIntervalState(
  breadth: MarketBreadth,
  mediumBaseline: BaselineState,
  shortBaseline: BaselineState
): IntervalState {
  const entropyScore = Math.round(
    clamp(breadth.volatilityScore * 0.35 + breadth.dispersionScore * 0.4 + (100 - shortBaseline.connectionScore!) * 0.25)
  );
  const premium = breadth.premiumDiscountScore;
  const sentiment = breadth.sentimentScore;

  let id: IntervalId = "interval_2_disorder";
  let phase = "区间二：正常失序";
  let confidence = 66;
  let storyStage: IntervalState["storyStage"] = "believing_story";
  const evidence: string[] = [];

  if (premium <= 38 && sentiment <= 45 && mediumBaseline.stance !== "risk_off") {
    id = "interval_1_discount";
    phase = "区间一：贴水修复前后";
    confidence = 72;
    storyStage = "telling_story";
    evidence.push("市场价格和情绪低于中期基线，适合寻找低熵核心。");
  } else if (premium >= 72 && sentiment >= 72 && breadth.heatScore >= 68) {
    id = "interval_3_premium";
    phase = "区间三：升水扩散";
    confidence = 74;
    storyStage = "consensus_spreading";
    evidence.push("情绪和热度高于中期锚，后排扩散概率上升。");
  } else if (entropyScore >= 70 && breadth.volatilityScore >= 68 && sentiment < 62) {
    id = "interval_4_reversion";
    phase = "区间四：高波回归";
    confidence = 70;
    storyStage = "reality_reversion";
    evidence.push("高波动和高熵并存，升水后的回归风险占优。");
  } else {
    id = "interval_2_disorder";
    phase = sentiment >= 62 && shortBaseline.connectionScore! >= 68 ? "区间二：加速" : "区间二：选主线";
    confidence = phase.includes("加速") ? 78 : 68;
    storyStage = "believing_story";
    evidence.push("贴水修复后资金仍在重新分配，市场正在选择主线。");
  }

  evidence.push(
    `短期故事与中期基线连接度 ${shortBaseline.connectionScore}，情绪温度 ${shortBaseline.emotionTemperature}。`
  );
  evidence.push(`贴水/升水 ${premium}，信息熵 ${entropyScore}，市场情绪 ${sentiment}。`);

  const definition = getIntervalDefinition(id);
  const storyStageLabel =
    storyStage === "telling_story"
      ? "讲故事"
      : storyStage === "believing_story"
        ? "信故事"
        : storyStage === "consensus_spreading"
          ? "共识扩散"
          : "情绪回归现实";
  const nextWatch =
    id === "interval_1_discount"
      ? ["观察贴水修复是否扩展为强势集群。", "确认结构分子亮点是否被资金承接。"]
      : id === "interval_2_disorder"
        ? ["观察主线是否从散点变成共识扩散。", "警惕后排快速补涨带来的升水。"]
        : id === "interval_3_premium"
          ? ["观察高熵和后排扩散是否演变成退潮。", "控制三象限快进快出风险。"]
          : ["等待高波收敛和下一次贴水。", "观察资金是否回到低熵核心品种。"];
  return {
    id,
    label: `${definition.name}｜${definition.state}`,
    phase,
    confidence,
    premiumDiscountScore: premium,
    entropyScore,
    sentimentScore: sentiment,
    storyStage,
    storyStageLabel,
    cycleDriver: "短期基线推动“讲故事-信故事-市场共识扩散-情绪回归现实”；中期基线评判贴水/升水幅度。",
    nextWatch,
    strategyPosture: definition.posture,
    evidence
  };
}

export function deriveBaselineEngineAssessment(
  mediumBaseline: BaselineState,
  shortBaseline: BaselineState,
  factorStrategy: FactorStrategicAssessment,
  breadth: MarketBreadth
): BaselineEngineAssessment {
  const connectionScore = shortBaseline.connectionScore ?? 50;
  const emotionTemperature = shortBaseline.emotionTemperature ?? breadth.sentimentScore;
  const sameDirection = mediumBaseline.direction === shortBaseline.direction;
  const volatilityPenalty = shortBaseline.volatilityMode === "expanded" ? 8 : shortBaseline.volatilityMode === "compressed" ? -4 : 0;
  const resonanceScore = Math.round(
    clamp(connectionScore * 0.42 + (sameDirection ? 26 : 8) + mediumBaseline.confidence * 0.18 + emotionTemperature * 0.14 - volatilityPenalty)
  );

  let resonanceState: BaselineEngineAssessment["resonanceState"] = "connected";
  let resonanceLabel = "丝连但未强共振";
  if (!sameDirection && connectionScore < 55) {
    resonanceState = "conflicted";
    resonanceLabel = "中短冲突";
  } else if (resonanceScore >= 72) {
    resonanceState = "resonant";
    resonanceLabel = "中短共振";
  } else if (connectionScore < 45) {
    resonanceState = "detached";
    resonanceLabel = "短线脱线";
  }

  const redGreenLight =
    factorStrategy.baselineStance === "risk_off" || mediumBaseline.stance === "risk_off"
      ? "red"
      : factorStrategy.baselineStance === "risk_on" && mediumBaseline.stance === "risk_on"
        ? "green"
        : "yellow";
  const redGreenLightLabel = redGreenLight === "green" ? "绿灯：可围绕中期基线做多" : redGreenLight === "red" ? "红灯：中期基线降风险" : "黄灯：结构参与，控制总仓";

  const filterRules = [
    `只优先处理与“${mediumBaseline.narrative}”相连的板块。`,
    `核心板块：${mediumBaseline.coreSectors.join("、") || "未配置"}。`,
    `锚资产：${mediumBaseline.anchorAssets.join("、") || "未配置"}。`,
    ...mediumBaseline.invalidation.map((item) => `失效条件：${item}`)
  ];

  const disciplines = [
    "偶要断：短期故事按情绪和波动率交易，不用高频基本面解释每一次波动。",
    "丝要连：短期故事必须能从中期基线偷逻辑，否则只能低仓位试错。",
    "情绪监控：用连接度、情绪温度、波动状态、筹码/成交拥挤度监控短线风险。"
  ];

  const guidance = [
    redGreenLightLabel,
    resonanceState === "resonant"
      ? "短期故事与中期趋势方向一致，行情级别可能放大，允许手部更积极。"
      : resonanceState === "detached"
        ? "短期故事缺少中期基线支撑，只能按三象限短打，不能升级为中期仓位。"
        : resonanceState === "conflicted"
          ? "中短方向冲突，优先保护中期仓位，不追短线扩散。"
          : "短期故事与中期基线保持丝连，可试错但需要观察共振能否增强。",
    "中期基线负责方向和仓位锚定，短期基线负责情绪溢价和波动率交易。"
  ];

  return {
    redGreenLight,
    redGreenLightLabel,
    mediumTradingMode: "趋势交易 / 相对收益 / 仓位锚定",
    shortTradingMode: "波动率交易 / 情绪试错 / 手部操作",
    resonanceState,
    resonanceLabel,
    resonanceScore,
    mediumAnchor: {
      role: "中期基线是趋势锚点，为短期交易提供红绿灯和过滤器。",
      cadence: "低频、高耐心、日度检查、周度确认；一周甚至更久无需调整。",
      filterRules
    },
    shortHandle: {
      role: "短期基线是情绪与波动率抓手，赚取故事传播和情绪修复的溢价。",
      disciplines,
      emotionMonitor: [
        `连接度 ${connectionScore}`,
        `情绪温度 ${emotionTemperature}`,
        `波动状态 ${shortBaseline.volatilityMode ?? "normal"}`,
        `市场情绪 ${breadth.sentimentScore}`,
        `信息熵/离散度 ${breadth.dispersionScore}`
      ]
    },
    evidence: [
      `中期方向 ${mediumBaseline.direction}，短期方向 ${shortBaseline.direction}。`,
      `短期故事与中期基线连接度 ${connectionScore}，共振分 ${resonanceScore}。`,
      `三因子给出的基线方向：${factorStrategy.baselineDirection}。`
    ],
    guidance
  };
}

export function classifyQuadrant(candidate: QuadrantCandidate): QuadrantId {
  const institutional = candidate.institutionConsensus >= 60;
  const fundamental = candidate.fundamentalEvidence >= 60;
  const hot = candidate.hotMoney >= 60;
  const narrative = candidate.narrativeStrength >= 60;

  if (institutional && fundamental) return "quadrant_1_core";
  if (hot && fundamental) return "quadrant_2_trading";
  if (institutional && narrative) return "quadrant_4_transition";
  if (hot && narrative) return "quadrant_3_hunt";
  if (fundamental) return "quadrant_2_trading";
  return narrative ? "quadrant_4_transition" : "quadrant_3_hunt";
}

function quadrantScore(candidate: QuadrantCandidate, quadrant: QuadrantId): number {
  const scoreMap: Record<QuadrantId, number> = {
    quadrant_1_core: candidate.institutionConsensus * 0.35 + candidate.fundamentalEvidence * 0.35 + candidate.trendScore * 0.2 + candidate.liquidityScore * 0.1,
    quadrant_2_trading: candidate.hotMoney * 0.32 + candidate.fundamentalEvidence * 0.28 + candidate.trendScore * 0.25 + candidate.liquidityScore * 0.15,
    quadrant_3_hunt: candidate.hotMoney * 0.38 + candidate.narrativeStrength * 0.32 + candidate.trendScore * 0.2 + candidate.liquidityScore * 0.1,
    quadrant_4_transition: candidate.institutionConsensus * 0.28 + candidate.narrativeStrength * 0.32 + candidate.fundamentalEvidence * 0.2 + candidate.trendScore * 0.2
  };
  return Math.round(clamp(scoreMap[quadrant]));
}

function migrationFor(candidate: QuadrantCandidate, quadrant: QuadrantId): QuadrantItem["migration"] {
  if (quadrant === "quadrant_3_hunt" && candidate.entropyScore >= 70) return "shrinking";
  if (quadrant === "quadrant_4_transition" && candidate.fundamentalEvidence >= 50) return "transitioning";
  if (candidate.trendScore >= 75 && candidate.liquidityScore >= 65) return "expanding";
  return "stable";
}

function riskFor(candidate: QuadrantCandidate, quadrant: QuadrantId): QuadrantItem["risk"] {
  if (quadrant === "quadrant_3_hunt" || candidate.entropyScore >= 72) return "high";
  if (quadrant === "quadrant_2_trading" || quadrant === "quadrant_4_transition") return "medium";
  return "low";
}

function classificationReason(candidate: QuadrantCandidate, quadrant: QuadrantId): string[] {
  const definition = getQuadrantDefinition(quadrant);
  return [
    `坐标：${definition.coordinates}。`,
    `机构共识 ${candidate.institutionConsensus}，基本面证据 ${candidate.fundamentalEvidence}，情绪资金 ${candidate.hotMoney}，叙事强度 ${candidate.narrativeStrength}。`,
    `定价逻辑：${definition.pricingLogic}。`,
    `资金属性：${definition.capitalType}。`
  ];
}

export function enrichQuadrants(
  candidates: QuadrantCandidate[],
  interval: IntervalState,
  breadth: MarketBreadth
): QuadrantItem[] {
  return candidates
    .map((candidate) => {
      const entropyScore = candidate.entropyScore || calculateEntropyScore(candidate, breadth);
      const prepared = { ...candidate, entropyScore };
      const quadrant = classifyQuadrant(prepared);
      const definition = getQuadrantDefinition(quadrant);
      return {
        ...prepared,
        quadrant,
        quadrantName: definition.name,
        score: quadrantScore(prepared, quadrant),
        migration: migrationFor(prepared, quadrant),
        action: DECISION_MATRIX[interval.id][quadrant],
        classificationReason: classificationReason(prepared, quadrant),
        risk: riskFor(prepared, quadrant)
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function buildPortfolioPlan(date: string, interval: IntervalState, quadrants: QuadrantItem[]): PortfolioPlan {
  const riskLight: PortfolioPlan["riskLight"] =
    interval.id === "interval_4_reversion" ? "red" : interval.id === "interval_3_premium" ? "yellow" : "green";

  const coreBook = quadrants
    .filter((item) => item.quadrant === "quadrant_1_core" && item.risk !== "high")
    .slice(0, 5)
    .map((item) => item.name);
  const tradingBook = quadrants
    .filter((item) => item.quadrant === "quadrant_2_trading" && item.score >= 65)
    .slice(0, 5)
    .map((item) => item.name);
  const watchList = quadrants
    .filter((item) => item.quadrant === "quadrant_4_transition" || item.migration === "transitioning")
    .slice(0, 5)
    .map((item) => item.name);
  const reduceList = quadrants
    .filter((item) => item.quadrant === "quadrant_3_hunt" && (item.entropyScore >= 62 || interval.id === "interval_4_reversion"))
    .slice(0, 5)
    .map((item) => item.name);

  return {
    date,
    riskLight,
    posture: interval.strategyPosture,
    coreBook,
    tradingBook,
    watchList,
    reduceList,
    actionNotes: [
      interval.id === "interval_2_disorder"
        ? "当前优先做象限切换：保留一象限核心，二象限承接资金，三象限缩圈。"
        : interval.strategyPosture,
      "人工覆盖必须记录理由，避免短期波动误伤中期基线筹码。",
      "所有动作默认用于研究和复盘，不自动下单。"
    ]
  };
}

export function buildDashboardState(input: MarketScenarioInput, dataFreshness: DashboardState["dataFreshness"]): DashboardState {
  const factors = input.factors.map(normalizeFactorState);
  const factorScore = weightedFactorScore(factors);
  const factorStrategy = deriveFactorStrategicAssessment(factors);
  const baselineEngine = deriveBaselineEngineAssessment(input.mediumBaseline, input.shortBaseline, factorStrategy, input.breadth);
  const interval = deriveIntervalState(input.breadth, input.mediumBaseline, input.shortBaseline);
  const quadrants = enrichQuadrants(input.candidates, interval, input.breadth);
  const portfolioPlan = buildPortfolioPlan(input.date, interval, quadrants);
  const adjustedPortfolioPlan: PortfolioPlan =
    dataFreshness === "stale"
      ? {
          ...portfolioPlan,
          riskLight: portfolioPlan.riskLight === "red" ? "red" : ("yellow" as const),
          posture: `部分数据：${portfolioPlan.posture}`,
          actionNotes: [
            "本日行情宽度或板块候选不完整，组合动作只能作为观察建议，不应升级为执行信号。",
            ...portfolioPlan.actionNotes
          ]
        }
      : portfolioPlan;

  return {
    date: input.date,
    title: input.title,
    factorScore,
    factors,
    factorStrategy,
    mediumBaseline: input.mediumBaseline,
    shortBaseline: input.shortBaseline,
    baselineEngine,
    interval,
    quadrants,
    portfolioPlan: adjustedPortfolioPlan,
    dataFreshness,
    generatedAt: new Date().toISOString()
  };
}
