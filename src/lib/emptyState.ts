import type { DashboardState } from "./types";

const today = () => new Date().toISOString().slice(0, 10);

export function createEmptyDashboard(date = today()): DashboardState {
  return {
    date,
    title: "等待真实数据接入",
    factorScore: 0,
    factors: [],
    factorStrategy: {
      dominantForce: "balanced",
      dominantForceLabel: "未生成",
      baselineDirection: "等待三因子数据",
      baselineStance: "balanced",
      summary: "系统尚未采集或写入完整行情、宏观、结构叙事和象限数据，因此不会输出市场判断。",
      factorRanking: [],
      evidence: ["未发现完整的 factor_states、baseline_states、market_breadth 和 quadrant_items。"],
      guidance: ["请先在数据源页确认采集配置，运行 ETL 后再生成决策链条。"]
    },
    mediumBaseline: {
      horizon: "medium",
      narrative: "等待中期基线",
      direction: "flat",
      stance: "balanced",
      confidence: 0,
      anchorAssets: [],
      coreSectors: [],
      invalidation: [],
      evidence: []
    },
    shortBaseline: {
      horizon: "short",
      narrative: "等待短期基线",
      direction: "flat",
      stance: "balanced",
      confidence: 0,
      anchorAssets: [],
      coreSectors: [],
      invalidation: [],
      evidence: [],
      connectionScore: 0,
      emotionTemperature: 0,
      volatilityMode: "normal"
    },
    baselineEngine: {
      redGreenLight: "yellow",
      redGreenLightLabel: "未生成：等待真实数据",
      mediumTradingMode: "等待中期基线",
      shortTradingMode: "等待短期基线",
      resonanceState: "connected",
      resonanceLabel: "未生成",
      resonanceScore: 0,
      mediumAnchor: {
        role: "等待三因子和结构分子写入后生成趋势锚点。",
        cadence: "未生成",
        filterRules: []
      },
      shortHandle: {
        role: "等待短期故事、情绪和波动率数据写入后生成。",
        disciplines: [],
        emotionMonitor: []
      },
      evidence: [],
      guidance: []
    },
    interval: {
      id: "interval_2_disorder",
      label: "未生成",
      phase: "等待四区间",
      confidence: 0,
      premiumDiscountScore: 0,
      entropyScore: 0,
      sentimentScore: 0,
      storyStage: "believing_story",
      storyStageLabel: "未生成",
      cycleDriver: "等待中短基线和市场宽度数据。",
      nextWatch: [],
      strategyPosture: "等待真实数据，不输出动作建议。",
      evidence: []
    },
    quadrants: [],
    portfolioPlan: {
      date,
      riskLight: "yellow",
      posture: "等待真实数据，不输出组合动作。",
      coreBook: [],
      tradingBook: [],
      watchList: [],
      reduceList: [],
      actionNotes: []
    },
    dataFreshness: "empty",
    generatedAt: new Date().toISOString()
  };
}

export const EMPTY_DASHBOARD = createEmptyDashboard();
