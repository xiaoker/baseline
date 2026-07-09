import { describe, expect, it } from "vitest";
import { DEFAULT_DATA_SOURCE_DASHBOARD, DEFAULT_DATA_SOURCES } from "../src/lib/dataSources";
import { DECISION_MATRIX, INTERVAL_QUADRANT_FOCUS, QUADRANT_DEFINITIONS } from "../src/lib/strategyDefinitions";
import {
  buildDashboardState,
  classifyQuadrant,
  deriveFactorOutlook,
  deriveFactorStrategicAssessment,
  deriveBaselineEngineAssessment,
  weightedFactorScore
} from "../src/lib/strategyEngine";
import { JAN_2026_SCENARIO } from "./fixtures/jan2026Replay";

describe("strategy engine", () => {
  it("weights the structure numerator as the dominant factor in the replay fixture", () => {
    const score = weightedFactorScore(JAN_2026_SCENARIO.factors);
    expect(score).toBeGreaterThan(65);
  });

  it("shows explicit factor outlooks for denominator, numerator and structure", () => {
    const dashboard = buildDashboardState(JAN_2026_SCENARIO, "live");
    expect(dashboard.factors.find((item) => item.id === "liquidity_denominator")?.outlook).toBe("neutral");
    expect(dashboard.factors.find((item) => item.id === "macro_numerator")?.outlook).toBe("neutral");
    expect(dashboard.factors.find((item) => item.id === "structure_numerator")?.outlook).toBe("optimistic");
  });

  it("uses relative factor strength to set the strategic baseline direction", () => {
    const assessment = deriveFactorStrategicAssessment(JAN_2026_SCENARIO.factors);
    expect(assessment.dominantForce).toBe("structure_led");
    expect(assessment.dominantForceLabel).toBe("结构分子占优");
    expect(assessment.baselineDirection).toContain("结构性做多");
    expect(assessment.guidance.join(" ")).toContain("一象限");
  });

  it("derives the medium-short baseline engine state from factor soil and baseline connection", () => {
    const dashboard = buildDashboardState(JAN_2026_SCENARIO, "live");
    const engine = deriveBaselineEngineAssessment(
      dashboard.mediumBaseline,
      dashboard.shortBaseline,
      dashboard.factorStrategy,
      JAN_2026_SCENARIO.breadth
    );
    expect(engine.redGreenLight).toBe("green");
    expect(engine.resonanceState).toBe("resonant");
    expect(engine.mediumAnchor.filterRules.join(" ")).toContain("上游供给");
    expect(engine.shortHandle.disciplines.join(" ")).toContain("偶要断");
    expect(engine.shortHandle.disciplines.join(" ")).toContain("丝要连");
  });

  it("derives optimistic neutral and pessimistic labels from factor scores", () => {
    expect(deriveFactorOutlook(72)).toBe("optimistic");
    expect(deriveFactorOutlook(50)).toBe("neutral");
    expect(deriveFactorOutlook(35)).toBe("pessimistic");
  });

  it("identifies the 2026-01-15 replay as interval two acceleration", () => {
    const dashboard = buildDashboardState(JAN_2026_SCENARIO, "live");
    expect(dashboard.interval.id).toBe("interval_2_disorder");
    expect(dashboard.interval.phase).toContain("加速");
    expect(dashboard.interval.storyStage).toBe("believing_story");
    expect(dashboard.interval.cycleDriver).toContain("讲故事");
  });

  it("classifies commercial aerospace as a high-volatility quadrant three item", () => {
    const space = JAN_2026_SCENARIO.candidates.find((item) => item.symbol === "SPACE")!;
    expect(classifyQuadrant(space)).toBe("quadrant_3_hunt");
  });

  it("moves capital from quadrant three toward quadrant two and four in interval two", () => {
    const dashboard = buildDashboardState(JAN_2026_SCENARIO, "live");
    expect(dashboard.portfolioPlan.reduceList).toContain("商业航天");
    expect(dashboard.portfolioPlan.tradingBook).toContain("国产算力");
    expect(dashboard.portfolioPlan.watchList).toContain("AI应用");
  });

  it("keeps the core position rule explicit in the decision matrix", () => {
    expect(DECISION_MATRIX.interval_1_discount.quadrant_1_core).toContain("增持");
    expect(DECISION_MATRIX.interval_4_reversion.quadrant_3_hunt).toContain("退出");
  });

  it("defines quadrant focus by strategy interval", () => {
    expect(INTERVAL_QUADRANT_FOCUS.interval_2_disorder).toContain("选好车");
    expect(INTERVAL_QUADRANT_FOCUS.interval_3_premium).toContain("重一守三攻");
    expect(QUADRANT_DEFINITIONS.find((item) => item.id === "quadrant_3_hunt")?.intervalRole).toContain("区间三");
  });

  it("explains why each asset is assigned to a quadrant", () => {
    const dashboard = buildDashboardState(JAN_2026_SCENARIO, "live");
    const space = dashboard.quadrants.find((item) => item.symbol === "SPACE")!;
    expect(space.quadrant).toBe("quadrant_3_hunt");
    expect(space.classificationReason.join(" ")).toContain("情绪资金");
    expect(space.classificationReason.join(" ")).toContain("叙事强度");
  });

  it("ships data-source defaults for ETL, anchors, macro and narrative inputs without sample run data", () => {
    expect(DEFAULT_DATA_SOURCES.map((source) => source.id)).toEqual(
      expect.arrayContaining([
        "akshare_a_spot",
        "akshare_boards",
        "akshare_macro",
        "yfinance_anchors",
        "model_derivation",
        "manual_macro",
        "manual_narratives",
        "github_actions_etl"
      ])
    );
    expect(DEFAULT_DATA_SOURCE_DASHBOARD.runs).toHaveLength(0);
    expect(DEFAULT_DATA_SOURCE_DASHBOARD.mode).toBe("configured");
  });
});
