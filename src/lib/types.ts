import type { FactorId, IntervalId, QuadrantId } from "./strategyDefinitions";

export interface FactorMetric {
  name: string;
  value: number;
  unit?: string;
  direction: "positive" | "neutral" | "negative";
  weight: number;
  evidence: string;
}

export interface FactorState {
  id: FactorId;
  score: number;
  direction: "bullish" | "neutral" | "bearish";
  outlook: "optimistic" | "neutral" | "pessimistic";
  outlookSummary: string;
  confidence: number;
  metrics: FactorMetric[];
  evidence: string[];
}

export interface FactorStrategicAssessment {
  dominantForce:
    | "structure_led"
    | "macro_drag"
    | "denominator_pressure"
    | "liquidity_beta"
    | "broad_beta"
    | "balanced";
  dominantForceLabel: string;
  baselineDirection: string;
  baselineStance: "risk_on" | "balanced" | "risk_off";
  summary: string;
  factorRanking: Array<{
    factorId: FactorId;
    name: string;
    score: number;
    outlook: FactorState["outlook"];
    rank: number;
  }>;
  evidence: string[];
  guidance: string[];
}

export interface MarketBreadth {
  advancers: number;
  decliners: number;
  limitUp: number;
  limitDown: number;
  turnoverCnyBn: number;
  volatilityScore: number;
  dispersionScore: number;
  sentimentScore: number;
  premiumDiscountScore: number;
  heatScore: number;
}

export interface BaselineState {
  horizon: "medium" | "short";
  narrative: string;
  direction: "up" | "flat" | "down";
  stance: "risk_on" | "balanced" | "risk_off";
  confidence: number;
  anchorAssets: string[];
  coreSectors: string[];
  invalidation: string[];
  evidence: string[];
  connectionScore?: number;
  emotionTemperature?: number;
  volatilityMode?: "compressed" | "normal" | "expanded";
}

export interface BaselineEngineAssessment {
  redGreenLight: "green" | "yellow" | "red";
  redGreenLightLabel: string;
  mediumTradingMode: string;
  shortTradingMode: string;
  resonanceState: "resonant" | "connected" | "detached" | "conflicted";
  resonanceLabel: string;
  resonanceScore: number;
  mediumAnchor: {
    role: string;
    cadence: string;
    filterRules: string[];
  };
  shortHandle: {
    role: string;
    disciplines: string[];
    emotionMonitor: string[];
  };
  evidence: string[];
  guidance: string[];
}

export interface IntervalState {
  id: IntervalId;
  label: string;
  phase: string;
  confidence: number;
  premiumDiscountScore: number;
  entropyScore: number;
  sentimentScore: number;
  storyStage: "telling_story" | "believing_story" | "consensus_spreading" | "reality_reversion";
  storyStageLabel: string;
  cycleDriver: string;
  nextWatch: string[];
  strategyPosture: string;
  evidence: string[];
}

export interface QuadrantCandidate {
  symbol: string;
  name: string;
  assetType: "stock" | "sector" | "index" | "commodity" | "theme";
  theme: string;
  institutionConsensus: number;
  fundamentalEvidence: number;
  hotMoney: number;
  narrativeStrength: number;
  trendScore: number;
  entropyScore: number;
  liquidityScore: number;
  evidence: string[];
}

export interface QuadrantItem extends QuadrantCandidate {
  quadrant: QuadrantId;
  quadrantName: string;
  score: number;
  migration: "stable" | "expanding" | "shrinking" | "transitioning";
  action: string;
  classificationReason: string[];
  risk: "low" | "medium" | "high";
}

export interface PortfolioPlan {
  date: string;
  riskLight: "green" | "yellow" | "red";
  posture: string;
  coreBook: string[];
  tradingBook: string[];
  watchList: string[];
  reduceList: string[];
  actionNotes: string[];
}

export interface MarketScenarioInput {
  date: string;
  title: string;
  factors: FactorState[];
  breadth: MarketBreadth;
  mediumBaseline: BaselineState;
  shortBaseline: BaselineState;
  candidates: QuadrantCandidate[];
}

export interface DashboardState {
  date: string;
  title: string;
  factorScore: number;
  factors: FactorState[];
  factorStrategy: FactorStrategicAssessment;
  mediumBaseline: BaselineState;
  shortBaseline: BaselineState;
  baselineEngine: BaselineEngineAssessment;
  interval: IntervalState;
  quadrants: QuadrantItem[];
  portfolioPlan: PortfolioPlan;
  dataFreshness: "live" | "stale" | "empty";
  generatedAt: string;
}

export type DataSourceKind = "akshare" | "yfinance" | "manual" | "github_actions" | "cloudflare_worker";

export interface DataSourceConfig {
  id: string;
  name: string;
  provider: string;
  kind: DataSourceKind;
  category: "market" | "macro" | "anchor" | "narrative" | "orchestration";
  purpose: string;
  enabled: boolean;
  schedule: string;
  targetTables: string[];
  freshnessHours: number;
  config: Record<string, unknown>;
  owner: string;
  notes: string;
  updatedAt?: string;
}

export interface CollectionRun {
  id: string;
  sourceId: string;
  sourceName: string;
  status: "success" | "failed" | "running" | "queued" | "skipped";
  startedAt: string;
  finishedAt?: string;
  rowsWritten: number;
  message: string;
  logUrl?: string;
}

export interface DataSourceDashboard {
  sources: DataSourceConfig[];
  runs: CollectionRun[];
  generatedAt: string;
  mode: "live" | "configured";
}
