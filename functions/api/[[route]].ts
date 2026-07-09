import { Hono } from "hono";
import { DEFAULT_DATA_SOURCES, DEFAULT_DATA_SOURCE_DASHBOARD } from "../../src/lib/dataSources";
import { createEmptyDashboard } from "../../src/lib/emptyState";
import { buildDashboardState } from "../../src/lib/strategyEngine";
import type {
  CollectionRun,
  DashboardState,
  DataSourceConfig,
  DataSourceDashboard,
  FactorState,
  MarketScenarioInput,
  QuadrantCandidate
} from "../../src/lib/types";

type Bindings = {
  DB?: D1Database;
  APP_ENV?: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "baseline",
    generatedAt: new Date().toISOString()
  })
);

app.get("/dashboard", async (c) => {
  const date = c.req.query("date");
  const dashboard = await loadDashboard(c.env.DB, date);
  return c.json(dashboard);
});

app.get("/quadrants", async (c) => {
  const date = c.req.query("date");
  const dashboard = await loadDashboard(c.env.DB, date);
  return c.json({ date: dashboard.date, items: dashboard.quadrants });
});

app.get("/portfolio-plan", async (c) => {
  const date = c.req.query("date");
  const dashboard = await loadDashboard(c.env.DB, date);
  return c.json(dashboard.portfolioPlan);
});

app.get("/data-sources", async (c) => {
  const state = await loadDataSources(c.env.DB);
  return c.json(state);
});

app.patch("/data-sources/:id", async (c) => {
  if (!c.env.DB) return c.json({ ok: false, error: "D1 binding missing" }, 503);
  const sourceId = c.req.param("id");
  const payload = await c.req.json<Record<string, unknown>>();
  const current = await c.env.DB.prepare("SELECT * FROM data_sources WHERE id = ?1").bind(sourceId).first<Record<string, unknown>>();
  if (!current) return c.json({ ok: false, error: "Data source not found" }, 404);

  await c.env.DB
    .prepare(
      `UPDATE data_sources
       SET enabled = ?1, schedule = ?2, freshness_hours = ?3, target_tables_json = ?4,
           purpose = ?5, owner = ?6, config_json = ?7, notes = ?8, updated_at = datetime('now')
       WHERE id = ?9`
    )
    .bind(
      typeof payload.enabled === "boolean" ? (payload.enabled ? 1 : 0) : Number(current.enabled ?? 1),
      String(payload.schedule ?? current.schedule),
      Number(payload.freshnessHours ?? current.freshness_hours ?? 24),
      JSON.stringify(payload.targetTables ?? parseJson(current.target_tables_json, [])),
      String(payload.purpose ?? current.purpose ?? ""),
      String(payload.owner ?? current.owner ?? ""),
      JSON.stringify(payload.config ?? parseJson(current.config_json, {})),
      String(payload.notes ?? current.notes ?? ""),
      sourceId
    )
    .run();

  return c.json({ ok: true });
});

app.post("/collection-runs", async (c) => {
  if (!c.env.DB) return c.json({ ok: false, error: "D1 binding missing" }, 503);
  const payload = await c.req.json<Record<string, unknown>>();
  const sourceId = String(payload.sourceId ?? "manual_request");
  const now = new Date().toISOString();
  const id = String(payload.id ?? `${sourceId}-${Date.now()}`);

  await c.env.DB
    .prepare(
      `INSERT OR REPLACE INTO data_collection_runs
       (id, source_id, status, started_at, finished_at, rows_written, message, log_url, raw_json, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))`
    )
    .bind(
      id,
      sourceId,
      String(payload.status ?? "queued"),
      String(payload.startedAt ?? now),
      payload.finishedAt ? String(payload.finishedAt) : null,
      Number(payload.rowsWritten ?? 0),
      String(payload.message ?? "后台记录了一次采集请求。实际 Python 采集由 GitHub Actions 执行。"),
      payload.logUrl ? String(payload.logUrl) : null,
      JSON.stringify(payload.raw ?? {})
    )
    .run();

  return c.json({ ok: true, id });
});

app.post("/narratives", async (c) => {
  const payload = await c.req.json<Record<string, unknown>>();
  if (!c.env.DB) return c.json({ ok: false, error: "D1 binding missing" }, 503);

  await c.env.DB
    .prepare(
      `INSERT INTO narrative_events (trade_date, theme_id, title, source, impact_score, evidence, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))`
    )
    .bind(
      String(payload.tradeDate ?? new Date().toISOString().slice(0, 10)),
      String(payload.themeId ?? "manual"),
      String(payload.title ?? "人工叙事"),
      String(payload.source ?? "manual"),
      Number(payload.impactScore ?? 50),
      JSON.stringify(payload.evidence ?? [])
    )
    .run();

  return c.json({ ok: true });
});

app.post("/overrides", async (c) => {
  const payload = await c.req.json<Record<string, unknown>>();
  if (!c.env.DB) return c.json({ ok: false, error: "D1 binding missing" }, 503);

  await c.env.DB
    .prepare(
      `INSERT INTO manual_overrides (trade_date, target_type, target_id, before_json, after_json, reason, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))`
    )
    .bind(
      String(payload.tradeDate ?? new Date().toISOString().slice(0, 10)),
      String(payload.targetType ?? "unknown"),
      String(payload.targetId ?? "unknown"),
      JSON.stringify(payload.before ?? {}),
      JSON.stringify(payload.after ?? {}),
      String(payload.reason ?? "manual override")
    )
    .run();

  return c.json({ ok: true });
});

app.post("/reviews", async (c) => {
  const payload = await c.req.json<Record<string, unknown>>();
  if (!c.env.DB) return c.json({ ok: false, error: "D1 binding missing" }, 503);

  await c.env.DB
    .prepare(
      `INSERT INTO decision_reviews (trade_date, summary, factor_review, baseline_review, interval_review, quadrant_review, pnl_notes, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))`
    )
    .bind(
      String(payload.tradeDate ?? new Date().toISOString().slice(0, 10)),
      String(payload.summary ?? ""),
      String(payload.factorReview ?? ""),
      String(payload.baselineReview ?? ""),
      String(payload.intervalReview ?? ""),
      String(payload.quadrantReview ?? ""),
      String(payload.pnlNotes ?? "")
    )
    .run();

  return c.json({ ok: true });
});

export const onRequest: PagesFunction<Bindings> = (context) => app.fetch(context.request, context.env);

async function loadDashboard(db?: D1Database, date?: string): Promise<DashboardState> {
  if (!db) return createEmptyDashboard(date);

  try {
    const selectedDate = date ?? (await latestDate(db));
    if (!selectedDate) return createEmptyDashboard(date);

    const factorRows = await db
      .prepare("SELECT factor_id, score, direction, outlook, outlook_summary, confidence, evidence_json FROM factor_states WHERE trade_date = ?1")
      .bind(selectedDate)
      .all<{
        factor_id: FactorState["id"];
        score: number;
        direction: FactorState["direction"];
        outlook?: FactorState["outlook"];
        outlook_summary?: string;
        confidence: number;
        evidence_json: string;
      }>();

    const medium = await db
      .prepare("SELECT * FROM baseline_states WHERE trade_date = ?1 AND horizon = 'medium' LIMIT 1")
      .bind(selectedDate)
      .first<Record<string, unknown>>();
    const short = await db
      .prepare("SELECT * FROM baseline_states WHERE trade_date = ?1 AND horizon = 'short' LIMIT 1")
      .bind(selectedDate)
      .first<Record<string, unknown>>();
    const breadth = await db
      .prepare("SELECT * FROM market_breadth WHERE trade_date = ?1 LIMIT 1")
      .bind(selectedDate)
      .first<Record<string, unknown>>();
    const candidateRows = await db
      .prepare("SELECT * FROM quadrant_items WHERE trade_date = ?1")
      .bind(selectedDate)
      .all<Record<string, unknown>>();

    if (!hasCompleteFactorSet(factorRows.results) || !medium || !short) {
      return createEmptyDashboard(selectedDate);
    }

    const factors: FactorState[] = factorRows.results.map((row) => ({
      id: row.factor_id,
      score: row.score,
      direction: row.direction,
      outlook: row.outlook ?? (row.score >= 65 ? "optimistic" : row.score <= 40 ? "pessimistic" : "neutral"),
      outlookSummary: row.outlook_summary ?? "",
      confidence: row.confidence,
      metrics: [],
      evidence: parseJson<string[]>(row.evidence_json, [])
    }));
    const dataFreshness: DashboardState["dataFreshness"] = !breadth || !candidateRows.results.length ? "stale" : "live";

    const scenario: MarketScenarioInput = {
      date: selectedDate,
      title: `${selectedDate} 模型化A股决策驾驶舱${dataFreshness === "stale" ? "（部分数据）" : ""}`,
      factors,
      breadth: breadthFromRow(breadth),
      mediumBaseline: baselineFromRow(medium, "medium"),
      shortBaseline: baselineFromRow(short, "short"),
      candidates: candidateRows.results.map(candidateFromRow)
    };

    return buildDashboardState(scenario, dataFreshness);
  } catch {
    return createEmptyDashboard(date);
  }
}

async function latestDate(db: D1Database): Promise<string | null> {
  const row = await db.prepare("SELECT trade_date FROM factor_states ORDER BY trade_date DESC LIMIT 1").first<{ trade_date: string }>();
  return row?.trade_date ?? null;
}

function parseJson<T>(value: unknown, fallback: T): T {
  try {
    return typeof value === "string" ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function hasCompleteFactorSet(rows: Array<{ factor_id: FactorState["id"] }>) {
  const ids = new Set(rows.map((row) => row.factor_id));
  return ids.has("liquidity_denominator") && ids.has("macro_numerator") && ids.has("structure_numerator");
}

function breadthFromRow(row: Record<string, unknown> | null) {
  return {
    advancers: Number(row?.advancers ?? 0),
    decliners: Number(row?.decliners ?? 0),
    limitUp: Number(row?.limit_up ?? 0),
    limitDown: Number(row?.limit_down ?? 0),
    turnoverCnyBn: Number(row?.turnover_cny_bn ?? 0),
    volatilityScore: Number(row?.volatility_score ?? 50),
    dispersionScore: Number(row?.dispersion_score ?? 50),
    sentimentScore: Number(row?.sentiment_score ?? 50),
    premiumDiscountScore: Number(row?.premium_discount_score ?? 50),
    heatScore: Number(row?.heat_score ?? 50)
  };
}

function baselineFromRow(row: Record<string, unknown>, horizon: "medium" | "short") {
  return {
    horizon,
    narrative: String(row.narrative ?? ""),
    direction: row.direction as "up" | "flat" | "down",
    stance: row.stance as "risk_on" | "balanced" | "risk_off",
    confidence: Number(row.confidence ?? 50),
    anchorAssets: parseJson<string[]>(row.anchor_assets_json, []),
    coreSectors: parseJson<string[]>(row.core_sectors_json, []),
    invalidation: parseJson<string[]>(row.invalidation_json, []),
    evidence: parseJson<string[]>(row.evidence_json, []),
    connectionScore: Number(row.connection_score ?? 70),
    emotionTemperature: Number(row.emotion_temperature ?? 60),
    volatilityMode: String(row.volatility_mode ?? "normal") as "compressed" | "normal" | "expanded"
  };
}

function candidateFromRow(row: Record<string, unknown>): QuadrantCandidate {
  return {
    symbol: String(row.symbol),
    name: String(row.name),
    assetType: String(row.asset_type ?? "sector") as QuadrantCandidate["assetType"],
    theme: String(row.theme ?? ""),
    institutionConsensus: Number(row.institution_consensus ?? 50),
    fundamentalEvidence: Number(row.fundamental_evidence ?? 50),
    hotMoney: Number(row.hot_money ?? 50),
    narrativeStrength: Number(row.narrative_strength ?? 50),
    trendScore: Number(row.trend_score ?? 50),
    entropyScore: Number(row.entropy_score ?? 50),
    liquidityScore: Number(row.liquidity_score ?? 50),
    evidence: parseJson<string[]>(row.evidence_json, [])
  };
}

async function loadDataSources(db?: D1Database): Promise<DataSourceDashboard> {
  if (!db) return DEFAULT_DATA_SOURCE_DASHBOARD;

  try {
    const sourceRows = await db.prepare("SELECT * FROM data_sources ORDER BY category, id").all<Record<string, unknown>>();
    const runRows = await db
      .prepare(
        `SELECT r.*, s.name AS source_name
         FROM data_collection_runs r
         LEFT JOIN data_sources s ON s.id = r.source_id
         ORDER BY r.started_at DESC
         LIMIT 30`
      )
      .all<Record<string, unknown>>();

    const sources = sourceRows.results.length ? sourceRows.results.map(sourceFromRow) : DEFAULT_DATA_SOURCES;
    const runs = runRows.results.map(runFromRow);

    return {
      sources,
      runs,
      generatedAt: new Date().toISOString(),
      mode: "live"
    };
  } catch {
    return DEFAULT_DATA_SOURCE_DASHBOARD;
  }
}

function sourceFromRow(row: Record<string, unknown>): DataSourceConfig {
  return {
    id: String(row.id),
    name: String(row.name),
    provider: String(row.provider),
    kind: String(row.kind) as DataSourceConfig["kind"],
    category: String(row.category) as DataSourceConfig["category"],
    purpose: String(row.purpose),
    enabled: Number(row.enabled ?? 1) === 1,
    schedule: String(row.schedule),
    targetTables: parseJson<string[]>(row.target_tables_json, []),
    freshnessHours: Number(row.freshness_hours ?? 24),
    config: parseJson<Record<string, unknown>>(row.config_json, {}),
    owner: String(row.owner),
    notes: String(row.notes ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function runFromRow(row: Record<string, unknown>): CollectionRun {
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    sourceName: String(row.source_name ?? row.source_id),
    status: String(row.status) as CollectionRun["status"],
    startedAt: String(row.started_at),
    finishedAt: row.finished_at ? String(row.finished_at) : undefined,
    rowsWritten: Number(row.rows_written ?? 0),
    message: String(row.message ?? ""),
    logUrl: row.log_url ? String(row.log_url) : undefined
  };
}
