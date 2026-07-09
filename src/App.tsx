import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Database,
  GitBranch,
  LayoutDashboard,
  RefreshCw,
  Save,
  Settings,
  ShieldAlert,
  Target,
  TrendingUp
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { fetchDashboard, fetchDataSources, updateDataSource } from "./lib/api";
import { DEFAULT_DATA_SOURCE_DASHBOARD } from "./lib/dataSources";
import { EMPTY_DASHBOARD } from "./lib/emptyState";
import {
  BASELINE_DEFINITIONS,
  DECISION_MATRIX,
  FACTOR_DEFINITIONS,
  INTERVAL_DEFINITIONS,
  INTERVAL_QUADRANT_FOCUS,
  QUADRANT_DEFINITIONS
} from "./lib/strategyDefinitions";
import type { CollectionRun, DashboardState, DataSourceConfig, DataSourceDashboard, QuadrantItem } from "./lib/types";

type ViewId = "dashboard" | "factors" | "baseline" | "intervals" | "quadrants" | "sources" | "review";

const viewItems: Array<{ id: ViewId; label: string; Icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "驾驶舱", Icon: LayoutDashboard },
  { id: "factors", label: "三因子", Icon: TrendingUp },
  { id: "baseline", label: "基线", Icon: GitBranch },
  { id: "intervals", label: "四区间", Icon: Activity },
  { id: "quadrants", label: "四象限", Icon: Target },
  { id: "sources", label: "数据源", Icon: Database },
  { id: "review", label: "复盘", Icon: BookOpenCheck }
];

const quadrantColors: Record<string, string> = {
  quadrant_1_core: "#247a5a",
  quadrant_2_trading: "#2563eb",
  quadrant_3_hunt: "#d94f45",
  quadrant_4_transition: "#8a5cf6"
};

const riskLabel = {
  green: "积极",
  yellow: "谨慎",
  red: "防守"
};

const factorOutlookLabel = {
  optimistic: "乐观",
  neutral: "中性",
  pessimistic: "悲观"
};

const freshnessLabel = {
  live: "实时数据",
  stale: "部分数据",
  empty: "等待数据"
};

function App() {
  const [view, setView] = useState<ViewId>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardState>(EMPTY_DASHBOARD);
  const [dataSources, setDataSources] = useState<DataSourceDashboard>(DEFAULT_DATA_SOURCE_DASHBOARD);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [state, sourceState] = await Promise.all([fetchDashboard(), fetchDataSources()]);
    setDashboard(state);
    setDataSources(sourceState);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const factorChartData = useMemo(
    () =>
      dashboard.factors.map((factor) => ({
        name: FACTOR_DEFINITIONS.find((item) => item.id === factor.id)?.shortName,
        score: factor.score,
        confidence: Math.round(factor.confidence * 100)
      })),
    [dashboard.factors]
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>模型化A股</strong>
            <span>Decision OS</span>
          </div>
        </div>

        <nav className="nav-list">
          {viewItems.map(({ id, label, Icon }) => (
            <button key={id} className={view === id ? "nav-button active" : "nav-button"} onClick={() => setView(id)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="side-status">
          <Database size={18} />
          <div>
            <strong>{freshnessLabel[dashboard.dataFreshness]}</strong>
            <span>{dashboard.date}</span>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">{dashboard.date}</p>
            <h1>{dashboard.title}</h1>
          </div>
          <button className="icon-command" onClick={load} disabled={loading} title="刷新">
            <RefreshCw size={18} className={loading ? "spin" : ""} />
            <span>刷新</span>
          </button>
        </header>

        {dashboard.dataFreshness === "empty" && view !== "sources" && <EmptyDashboardView />}
        {dashboard.dataFreshness === "stale" && view !== "sources" && <PartialDataNotice />}
        {dashboard.dataFreshness !== "empty" && view === "dashboard" && <DashboardView dashboard={dashboard} factorChartData={factorChartData} />}
        {dashboard.dataFreshness !== "empty" && view === "factors" && <FactorsView dashboard={dashboard} factorChartData={factorChartData} />}
        {dashboard.dataFreshness !== "empty" && view === "baseline" && <BaselineView dashboard={dashboard} />}
        {dashboard.dataFreshness !== "empty" && view === "intervals" && <IntervalsView dashboard={dashboard} />}
        {dashboard.dataFreshness !== "empty" && view === "quadrants" && <QuadrantsView dashboard={dashboard} />}
        {view === "sources" && <DataSourcesView state={dataSources} />}
        {dashboard.dataFreshness !== "empty" && view === "review" && <ReviewView dashboard={dashboard} />}
      </main>
    </div>
  );
}

function PartialDataNotice() {
  return (
    <section className="data-warning">
      <ShieldAlert size={18} />
      <span>本日模型为部分数据状态：系统已展示可计算的三因子和基线，但缺失的行情宽度或板块候选会按中性低置信度处理。</span>
    </section>
  );
}

function EmptyDashboardView() {
  return (
    <div className="view-stack">
      <section className="empty-dashboard">
        <Database size={28} />
        <div>
          <p className="eyebrow">暂无真实决策状态</p>
          <h2>等待数据采集与模型写入</h2>
          <span>系统不会使用内置案例生成三因子、基线、四区间或四象限结论。请先在数据源页确认配置，运行 ETL 后由系统从原始数据自动派生决策链条；人工录入只用于补强证据和覆盖判断。</span>
        </div>
      </section>

      <section className="definition-grid">
        <article className="definition-card">
          <h3>自动采集行情</h3>
          <p>AKShare 写入 `market_breadth`、`market_prices`，用于情绪、热度、贴水/升水和市场宽度。</p>
        </article>
        <article className="definition-card">
          <h3>自动识别板块</h3>
          <p>AKShare 行业/概念板块用于生成结构分子、主题池、短期故事和四象限候选。</p>
        </article>
        <article className="definition-card">
          <h3>自动采集锚资产</h3>
          <p>yfinance 写入 `anchor_assets`，用于总量分母压力和中期基线外部确认。</p>
        </article>
        <article className="definition-card">
          <h3>自动派生模型</h3>
          <p>Python ETL 写入 `factor_states`、`baseline_states`、`quadrant_items`，页面再生成四区间和组合动作。</p>
        </article>
      </section>
    </div>
  );
}

function FactorsView({
  dashboard,
  factorChartData
}: {
  dashboard: DashboardState;
  factorChartData: Array<{ name?: string; score: number; confidence: number }>;
}) {
  return (
    <div className="view-stack">
      <section className="kpi-grid">
        <MetricTile icon={<TrendingUp size={20} />} label="三因子总分" value={dashboard.factorScore} suffix="/100" tone="green" />
        <MetricTile icon={<BarChart3 size={20} />} label="主导格局" value={dashboard.factorStrategy.dominantForceLabel} tone="blue" />
        <MetricTile icon={<CheckCircle2 size={20} />} label="基线方向" value={dashboard.factorStrategy.baselineDirection} tone="green" />
        <MetricTile icon={<ShieldAlert size={20} />} label="风险灯" value={riskLabel[dashboard.portfolioPlan.riskLight]} tone={dashboard.portfolioPlan.riskLight} />
      </section>

      <section className="two-column">
        <Panel title="因子评分" icon={<BarChart3 size={18} />}>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={factorChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" radius={[5, 5, 0, 0]}>
                  {factorChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.score >= 70 ? "#247a5a" : entry.score >= 55 ? "#2563eb" : "#b45309"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="系统解释" icon={<BookOpenCheck size={18} />}>
          <div className="factor-summary">
            <strong>{dashboard.factorStrategy.dominantForceLabel}</strong>
            <span>{dashboard.factorStrategy.summary}</span>
            <EvidenceList items={dashboard.factorStrategy.evidence} />
          </div>
        </Panel>
      </section>

      <section className="factor-strategy-grid">
        <Panel title="相对强弱排序" icon={<TrendingUp size={18} />}>
          <div className="factor-ranking">
            {dashboard.factorStrategy.factorRanking.map((item) => (
              <div key={item.factorId} className="factor-rank-row">
                <span>#{item.rank}</span>
                <strong>{item.name}</strong>
                <span>{factorOutlookLabel[item.outlook]}</span>
                <b>{item.score}</b>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="战略指导" icon={<Target size={18} />}>
          <div className="factor-summary">
            <strong>{dashboard.factorStrategy.baselineDirection}</strong>
            <EvidenceList items={dashboard.factorStrategy.guidance} />
          </div>
        </Panel>
      </section>

      <section className="factor-grid">
        {dashboard.factors.map((factor) => {
          const definition = FACTOR_DEFINITIONS.find((item) => item.id === factor.id)!;
          return <FactorCard key={factor.id} factor={factor} definition={definition} />;
        })}
      </section>
    </div>
  );
}

function FactorCard({
  factor,
  definition
}: {
  factor: DashboardState["factors"][number];
  definition: (typeof FACTOR_DEFINITIONS)[number];
}) {
  return (
    <article className="factor-card">
      <div className="factor-card-head">
        <div>
          <h3>{definition.name}</h3>
          <span>{definition.purpose}</span>
        </div>
        <div className={`factor-score ${factor.direction}`}>
          <strong>{factor.score}</strong>
          <span>{factorOutlookLabel[factor.outlook]}</span>
        </div>
      </div>

      <div className={`factor-outlook ${factor.outlook}`}>
        <strong>{definition.name}判断：{factorOutlookLabel[factor.outlook]}</strong>
        <span>{factor.outlookSummary}</span>
      </div>

      <div className="factor-meta-row">
        <span>权重 {Math.round(definition.defaultWeight * 100)}%</span>
        <span>置信度 {Math.round(factor.confidence * 100)}%</span>
      </div>

      <PillList label="数据字段" items={definition.dataFields} />
      <PillList label="核心变量" items={definition.coreVariables} />

      <div className="signal-columns">
        <div>
          <strong>判断方法</strong>
          <EvidenceList items={definition.judgementMethod} />
        </div>
        <div>
          <strong>正向信号</strong>
          <EvidenceList items={definition.positiveSignals} />
        </div>
        <div>
          <strong>负向信号</strong>
          <EvidenceList items={definition.negativeSignals} />
        </div>
      </div>

      {factor.metrics.length > 0 ? (
        <div className="metric-list">
          {factor.metrics.map((metric) => (
            <div key={metric.name} className="factor-metric-row">
              <div>
                <strong>{metric.name}</strong>
                <span>{metric.evidence}</span>
              </div>
              <span className={`metric-direction ${metric.direction}`}>{metric.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-factor-metrics">当前 D1 数据未写入指标明细，只展示因子级评分和证据。</div>
      )}

      <EvidenceList items={factor.evidence} />
    </article>
  );
}

function DashboardView({
  dashboard,
  factorChartData
}: {
  dashboard: DashboardState;
  factorChartData: Array<{ name?: string; score: number; confidence: number }>;
}) {
  const topQuadrants = dashboard.quadrants.slice(0, 6);

  return (
    <div className="view-stack">
      <section className="kpi-grid">
        <MetricTile icon={<TrendingUp size={20} />} label="三因子总分" value={dashboard.factorScore} suffix="/100" tone="green" />
        <MetricTile icon={<Activity size={20} />} label="当前区间" value={dashboard.interval.phase} tone="blue" />
        <MetricTile icon={<ShieldAlert size={20} />} label="风险灯" value={riskLabel[dashboard.portfolioPlan.riskLight]} tone={dashboard.portfolioPlan.riskLight} />
        <MetricTile icon={<BarChart3 size={20} />} label="信息熵" value={dashboard.interval.entropyScore} suffix="/100" tone="amber" />
      </section>

      <section className="two-column">
        <Panel title="三因子状态" icon={<BarChart3 size={18} />}>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={factorChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" radius={[5, 5, 0, 0]}>
                  {factorChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.score >= 70 ? "#247a5a" : entry.score >= 55 ? "#2563eb" : "#b45309"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="组合动作" icon={<Archive size={18} />}>
          <ActionBuckets dashboard={dashboard} />
        </Panel>
      </section>

      <section className="table-section">
        <div className="section-heading">
          <h2>象限主线</h2>
          <span>{topQuadrants.length} 个高优先级对象</span>
        </div>
        <div className="asset-table">
          {topQuadrants.map((item) => (
            <AssetRow key={item.symbol} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BaselineView({ dashboard }: { dashboard: DashboardState }) {
  return (
    <div className="view-stack">
      <section className="kpi-grid">
        <MetricTile icon={<ShieldAlert size={20} />} label="中期红绿灯" value={dashboard.baselineEngine.redGreenLightLabel} tone={dashboard.baselineEngine.redGreenLight} />
        <MetricTile icon={<GitBranch size={20} />} label="共振状态" value={dashboard.baselineEngine.resonanceLabel} tone="blue" />
        <MetricTile icon={<Activity size={20} />} label="共振分" value={dashboard.baselineEngine.resonanceScore} suffix="/100" tone="green" />
        <MetricTile icon={<TrendingUp size={20} />} label="基线方向" value={dashboard.factorStrategy.baselineDirection} tone="amber" />
      </section>

      <section className="two-column">
        {[dashboard.mediumBaseline, dashboard.shortBaseline].map((baseline) => {
          const definition = BASELINE_DEFINITIONS.find((item) => item.horizon === baseline.horizon)!;
          return (
            <Panel key={baseline.horizon} title={definition.name} icon={<GitBranch size={18} />}>
              <div className="baseline-card">
                <h3>{baseline.narrative}</h3>
                <div className="baseline-meta">
                  <span>{baseline.direction.toUpperCase()}</span>
                  <span>{baseline.stance}</span>
                  <span>置信度 {baseline.confidence}</span>
                </div>
                <PillList label="锚资产" items={baseline.anchorAssets} />
                <PillList label="核心板块" items={baseline.coreSectors} />
                <EvidenceList items={baseline.evidence} />
              </div>
            </Panel>
          );
        })}
      </section>

      <section className="baseline-engine-grid">
        <Panel title="中期基线：趋势锚点" icon={<GitBranch size={18} />}>
          <div className="baseline-engine-card">
            <strong>{dashboard.baselineEngine.mediumTradingMode}</strong>
            <span>{dashboard.baselineEngine.mediumAnchor.role}</span>
            <span>{dashboard.baselineEngine.mediumAnchor.cadence}</span>
            <EvidenceList items={dashboard.baselineEngine.mediumAnchor.filterRules} />
          </div>
        </Panel>

        <Panel title="短期基线：情绪抓手" icon={<Activity size={18} />}>
          <div className="baseline-engine-card">
            <strong>{dashboard.baselineEngine.shortTradingMode}</strong>
            <span>{dashboard.baselineEngine.shortHandle.role}</span>
            <EvidenceList items={dashboard.baselineEngine.shortHandle.disciplines} />
          </div>
        </Panel>
      </section>

      <section className="baseline-engine-grid">
        <Panel title="中短共振" icon={<Target size={18} />}>
          <div className={`resonance-box ${dashboard.baselineEngine.resonanceState}`}>
            <strong>{dashboard.baselineEngine.resonanceLabel}</strong>
            <span>{dashboard.baselineEngine.resonanceScore}/100</span>
          </div>
          <EvidenceList items={dashboard.baselineEngine.evidence} />
        </Panel>

        <Panel title="情绪监控与战术指导" icon={<BarChart3 size={18} />}>
          <div className="baseline-monitor">
            {dashboard.baselineEngine.shortHandle.emotionMonitor.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <EvidenceList items={dashboard.baselineEngine.guidance} />
        </Panel>
      </section>

      <section className="definition-grid">
        {BASELINE_DEFINITIONS.map((definition) => (
          <article key={definition.horizon} className="definition-card">
            <h3>{definition.name}</h3>
            <p>{definition.definition}</p>
            <span>{definition.updateCadence}</span>
          </article>
        ))}
      </section>
    </div>
  );
}

function IntervalsView({ dashboard }: { dashboard: DashboardState }) {
  const lineData = [
    { name: "贴水/升水", value: dashboard.interval.premiumDiscountScore },
    { name: "情绪", value: dashboard.interval.sentimentScore },
    { name: "信息熵", value: dashboard.interval.entropyScore },
    { name: "连接度", value: dashboard.shortBaseline.connectionScore ?? 0 }
  ];

  return (
    <div className="view-stack">
      <section className="two-column">
        <Panel title="当前区间" icon={<Activity size={18} />}>
          <div className="interval-current">
            <strong>{dashboard.interval.label}</strong>
            <span>{dashboard.interval.phase}</span>
            <div className="story-stage-pill">{dashboard.interval.storyStageLabel}</div>
            <p>{dashboard.interval.strategyPosture}</p>
            <p>{dashboard.interval.cycleDriver}</p>
            <EvidenceList items={dashboard.interval.evidence} />
          </div>
        </Panel>
        <Panel title="状态仪表" icon={<BarChart3 size={18} />}>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="interval-cycle">
        {["讲故事", "信故事", "共识扩散", "情绪回归现实"].map((stage) => (
          <div key={stage} className={dashboard.interval.storyStageLabel === stage ? "cycle-step active" : "cycle-step"}>
            {stage}
          </div>
        ))}
      </section>

      <section className="table-section">
        <div className="section-heading">
          <h2>四区间策略表</h2>
          <span>短期基线与中期基线互动后的择时模型</span>
        </div>
        <div className="interval-table">
          <div className="interval-table-head">区间</div>
          <div className="interval-table-head">核心状态</div>
          <div className="interval-table-head">三因子与基线特征</div>
          <div className="interval-table-head">策略基调</div>
          <div className="interval-table-head">交易哲学</div>
          {INTERVAL_DEFINITIONS.map((definition) => (
            <IntervalTableRow key={definition.id} definition={definition} active={dashboard.interval.id === definition.id} />
          ))}
        </div>
      </section>

      <section className="definition-grid">
        {INTERVAL_DEFINITIONS.map((definition) => (
          <article key={definition.id} className={dashboard.interval.id === definition.id ? "definition-card selected" : "definition-card"}>
            <h3>{definition.name}</h3>
            <strong>{definition.state}</strong>
            <p>{definition.posture}</p>
            <span>{definition.philosophy}</span>
          </article>
        ))}
      </section>
    </div>
  );
}

function IntervalTableRow({
  definition,
  active
}: {
  definition: (typeof INTERVAL_DEFINITIONS)[number];
  active: boolean;
}) {
  return (
    <>
      <div className={active ? "interval-table-cell active" : "interval-table-cell"}>
        <strong>{definition.name}</strong>
      </div>
      <div className={active ? "interval-table-cell active" : "interval-table-cell"}>
        <strong>{definition.state}</strong>
      </div>
      <div className={active ? "interval-table-cell active" : "interval-table-cell"}>{definition.baselineFeature}</div>
      <div className={active ? "interval-table-cell active" : "interval-table-cell"}>{definition.posture}</div>
      <div className={active ? "interval-table-cell active" : "interval-table-cell"}>{definition.philosophy}</div>
    </>
  );
}

function QuadrantsView({ dashboard }: { dashboard: DashboardState }) {
  const items = dashboard.quadrants;
  const interval = dashboard.interval;
  const intervalFocus = INTERVAL_QUADRANT_FOCUS[interval.id];

  return (
    <div className="view-stack">
      <section className="quadrant-focus">
        <div>
          <p className="eyebrow">当前区间作战重点</p>
          <h2>{interval.phase}</h2>
          <strong>{intervalFocus}</strong>
          <span>{interval.strategyPosture}</span>
        </div>
        <div className="quadrant-focus-rules">
          <span>区间一：重点增持一象限</span>
          <span>区间二：所有象限选好车</span>
          <span>区间三：重一守三攻</span>
          <span>区间四：右缩三象限，左扩一象限</span>
        </div>
      </section>

      <section className="two-column">
        <div className="quadrant-map">
          <div className="axis-label x-axis">资金属性：游资情绪 → 机构共识</div>
          <div className="axis-label y-axis">定价逻辑：叙事驱动 → 基本面驱动</div>
          {items.map((item) => (
            <div
              key={item.symbol}
              className="quadrant-dot"
              style={{
                left: `${10 + item.institutionConsensus * 0.78}%`,
                bottom: `${10 + item.fundamentalEvidence * 0.78}%`,
                background: quadrantColors[item.quadrant],
                width: `${Math.max(34, Math.min(58, item.score * 0.64))}px`,
                height: `${Math.max(34, Math.min(58, item.score * 0.64))}px`
              }}
              title={`${item.name}｜${item.quadrantName}`}
            >
              {item.name.slice(0, 2)}
            </div>
          ))}
        </div>

        <Panel title="当前区间动作矩阵" icon={<Target size={18} />}>
          <div className="quadrant-action-grid">
            {QUADRANT_DEFINITIONS.map((definition) => (
              <article key={definition.id} className="quadrant-action-card" style={{ borderColor: quadrantColors[definition.id] }}>
                <div>
                  <strong>{definition.name}</strong>
                  <span>{definition.portfolioRole}</span>
                </div>
                <p>{DECISION_MATRIX[interval.id][definition.id]}</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <section className="table-section">
        <div className="section-heading">
          <h2>四象限作战表</h2>
          <span>给定策略区间下，对品种进行资金属性与定价逻辑分类</span>
        </div>
        <div className="table-scroll">
          <div className="quadrant-strategy-table">
            <div className="quadrant-table-head">象限</div>
            <div className="quadrant-table-head">坐标特征</div>
            <div className="quadrant-table-head">资金属性</div>
            <div className="quadrant-table-head">定价逻辑</div>
            <div className="quadrant-table-head">代表品种</div>
            <div className="quadrant-table-head">在四区间的角色</div>
            {QUADRANT_DEFINITIONS.map((definition) => (
              <QuadrantStrategyRow key={definition.id} definition={definition} />
            ))}
          </div>
        </div>
      </section>

      <section className="table-section">
        <div className="section-heading">
          <h2>品种归类证据</h2>
          <span>展示每个对象为什么落在当前象限</span>
        </div>
        <div className="classification-list">
          {items.map((item) => (
            <ClassificationCard key={item.symbol} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function QuadrantStrategyRow({ definition }: { definition: (typeof QUADRANT_DEFINITIONS)[number] }) {
  return (
    <>
      <div className="quadrant-table-cell">
        <strong>{definition.name}</strong>
      </div>
      <div className="quadrant-table-cell">{definition.coordinates}</div>
      <div className="quadrant-table-cell">{definition.capitalType}</div>
      <div className="quadrant-table-cell">{definition.pricingLogic}</div>
      <div className="quadrant-table-cell">{definition.representativeAssets.join("、")}</div>
      <div className="quadrant-table-cell">{definition.intervalRole}</div>
    </>
  );
}

function ClassificationCard({ item }: { item: QuadrantItem }) {
  const reasons = item.classificationReason?.length
    ? item.classificationReason
    : [
        `机构共识 ${item.institutionConsensus}，基本面证据 ${item.fundamentalEvidence}，情绪资金 ${item.hotMoney}，叙事强度 ${item.narrativeStrength}。`
      ];
  return (
    <article className="classification-card">
      <div className="classification-head">
        <div>
          <strong>{item.name}</strong>
          <span>{item.theme}</span>
        </div>
        <span className="badge" style={{ borderColor: quadrantColors[item.quadrant], color: quadrantColors[item.quadrant] }}>
          {item.quadrantName}
        </span>
      </div>
      <div className="classification-metrics">
        <span>机构 {item.institutionConsensus}</span>
        <span>基本面 {item.fundamentalEvidence}</span>
        <span>情绪 {item.hotMoney}</span>
        <span>叙事 {item.narrativeStrength}</span>
        <span>熵值 {item.entropyScore}</span>
        <span>评分 {item.score}</span>
      </div>
      <EvidenceList items={reasons} />
      <div className="classification-action">
        <strong>当前动作</strong>
        <span>{item.action}</span>
      </div>
    </article>
  );
}

function ReviewView({ dashboard }: { dashboard: DashboardState }) {
  return (
    <div className="view-stack">
      <section className="table-section">
        <div className="section-heading">
          <h2>复盘链路</h2>
          <span>{dashboard.generatedAt}</span>
        </div>
        <div className="review-timeline">
          <ReviewStep label="三因子" value={`结构分子 ${dashboard.factors.find((item) => item.id === "structure_numerator")?.score}`} />
          <ReviewStep label="中期基线" value={dashboard.mediumBaseline.narrative} />
          <ReviewStep label="短期基线" value={dashboard.shortBaseline.narrative} />
          <ReviewStep label="四区间" value={dashboard.interval.phase} />
          <ReviewStep label="组合动作" value={dashboard.portfolioPlan.posture} />
        </div>
      </section>

      <section className="table-section">
        <div className="section-heading">
          <h2>人工覆盖记录</h2>
          <span>写入 `manual_overrides`</span>
        </div>
        <div className="empty-state">
          <ShieldAlert size={24} />
          <span>当前数据未触发人工覆盖。</span>
        </div>
      </section>
    </div>
  );
}

function DataSourcesView({ state }: { state: DataSourceDashboard }) {
  const [drafts, setDrafts] = useState<SourceDraft[]>(() => state.sources.map(createSourceDraft));
  const [saveMessage, setSaveMessage] = useState("配置来自默认配置或 D1；本地预览可修改但不一定写入远端。");
  const [savingAll, setSavingAll] = useState(false);
  const sources = drafts.map((draft) => draft.source);
  const enabledCount = sources.filter((source) => source.enabled).length;
  const successCount = state.runs.filter((run) => run.status === "success").length;

  useEffect(() => {
    setDrafts(state.sources.map(createSourceDraft));
  }, [state.sources]);

  const updateDraft = (id: string, next: SourceDraft) => {
    setDrafts((current) => current.map((draft) => (draft.source.id === id ? next : draft)));
  };

  const handleSave = async (id: string) => {
    const draft = drafts.find((item) => item.source.id === id);
    if (!draft) return;
    const parsed = materializeSourceDraft(draft);
    if (!parsed.source) {
      updateDraft(id, { ...draft, error: parsed.error ?? "配置未通过校验。", dirty: true });
      return;
    }

    updateDraft(id, { ...createSourceDraft(parsed.source), dirty: false });
    const persisted = await updateDataSource(parsed.source);
    setSaveMessage(
      persisted ? `已保存 ${parsed.source.name} 到 D1。` : `已在当前页面更新 ${parsed.source.name}；API 不可用或本地 Vite 预览未连接 D1。`
    );
  };

  const saveAll = async () => {
    setSavingAll(true);
    const parsedDrafts = drafts.map((draft) => ({ draft, parsed: materializeSourceDraft(draft) }));
    const invalidDrafts = parsedDrafts.filter((item) => !item.parsed.source);
    if (invalidDrafts.length) {
      setDrafts((current) =>
        current.map((draft) => {
          const invalid = invalidDrafts.find((item) => item.draft.source.id === draft.source.id);
          return invalid ? { ...draft, error: invalid.parsed.error ?? "配置未通过校验。", dirty: true } : { ...draft, error: "" };
        })
      );
      setSaveMessage(`有 ${invalidDrafts.length} 个数据源配置 JSON 不合法，已停止批量保存。`);
      setSavingAll(false);
      return;
    }

    const parsedSources = parsedDrafts.map((item) => item.parsed.source as DataSourceConfig);
    const results = await Promise.all(parsedSources.map((source) => updateDataSource(source)));
    setDrafts(parsedSources.map((source) => ({ ...createSourceDraft(source), dirty: false })));
    const persistedCount = results.filter(Boolean).length;
    setSaveMessage(
      persistedCount === parsedSources.length
        ? `已全部保存 ${persistedCount} 个数据源到 D1。`
        : `已在当前页面更新 ${parsedSources.length} 个数据源；其中 ${persistedCount} 个写入 D1 成功。`
    );
    setSavingAll(false);
  };

  return (
    <div className="view-stack">
      <section className="kpi-grid">
        <MetricTile icon={<Database size={20} />} label="已配置数据源" value={sources.length} tone="blue" />
        <MetricTile icon={<CheckCircle2 size={20} />} label="启用数据源" value={enabledCount} tone="green" />
        <MetricTile icon={<Clock3 size={20} />} label="最近成功采集" value={successCount} tone="green" />
        <MetricTile icon={<Settings size={20} />} label="模式" value={state.mode === "configured" ? "默认配置" : "实时"} tone="amber" />
      </section>

      <section className="source-note">
        <strong>保存状态</strong>
        <span>{saveMessage}</span>
      </section>

      <section className="table-section">
        <div className="section-heading">
          <h2>数据源配置</h2>
          <div className="section-actions">
            <span>可编辑；部署后写入 `data_sources`</span>
            <button className="save-button" onClick={saveAll} disabled={savingAll}>
              <Save size={16} />
              <span>{savingAll ? "保存中" : "全部保存"}</span>
            </button>
          </div>
        </div>
        <div className="source-grid">
          {drafts.map((draft) => (
            <SourceCard
              key={draft.source.id}
              draft={draft}
              latestRun={state.runs.find((run) => run.sourceId === draft.source.id)}
              onDraftChange={(next) => updateDraft(draft.source.id, next)}
              onSave={() => handleSave(draft.source.id)}
              saving={savingAll}
            />
          ))}
        </div>
      </section>

      <section className="table-section">
        <div className="section-heading">
          <h2>采集运行记录</h2>
          <span>写入 `data_collection_runs`</span>
        </div>
        <div className="run-table">
          {state.runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      </section>

      <section className="source-note">
        <strong>执行边界</strong>
        <span>Cloudflare 后台负责配置、状态和 API；AKShare/yfinance 的 Python 采集由 GitHub Actions 执行，再写入 D1。</span>
      </section>
    </div>
  );
}

type SourceDraft = {
  source: DataSourceConfig;
  configText: string;
  targetTablesText: string;
  error: string;
  dirty: boolean;
};

function createSourceDraft(source: DataSourceConfig): SourceDraft {
  return {
    source,
    configText: JSON.stringify(source.config, null, 2),
    targetTablesText: source.targetTables.join(", "),
    error: "",
    dirty: false
  };
}

function materializeSourceDraft(draft: SourceDraft): { source?: DataSourceConfig; error?: string } {
  try {
    const parsedConfig = JSON.parse(draft.configText) as Record<string, unknown>;
    const targetTables = draft.targetTablesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return { source: { ...draft.source, config: parsedConfig, targetTables } };
  } catch {
    return { error: "配置 JSON 不是合法格式，未保存。" };
  }
}

function SourceCard({
  draft,
  latestRun,
  onDraftChange,
  onSave,
  saving
}: {
  draft: SourceDraft;
  latestRun?: CollectionRun;
  onDraftChange: (draft: SourceDraft) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}) {
  const { source, configText, targetTablesText, error, dirty } = draft;

  const setField = <K extends keyof DataSourceConfig>(key: K, value: DataSourceConfig[K]) => {
    onDraftChange({ ...draft, source: { ...source, [key]: value }, dirty: true, error: "" });
  };

  const save = async () => {
    await onSave();
  };

  return (
    <article className="source-card">
      <div className="source-card-head">
        <div>
          <strong>{source.name}</strong>
          <span>{source.provider}｜{source.category}</span>
        </div>
        <label className="source-toggle">
          <input type="checkbox" checked={source.enabled} onChange={(event) => setField("enabled", event.target.checked)} />
          <span className={source.enabled ? "status-pill enabled" : "status-pill disabled"}>{source.enabled ? "启用" : "暂停"}</span>
        </label>
      </div>

      <label className="source-field">
        <span>用途</span>
        <textarea value={source.purpose} onChange={(event) => setField("purpose", event.target.value)} rows={3} />
      </label>

      <div className="source-meta">
        <label>
          <span>调度</span>
          <input value={source.schedule} onChange={(event) => setField("schedule", event.target.value)} />
        </label>
        <label>
          <span>新鲜度 h</span>
          <input
            type="number"
            min={1}
            value={source.freshnessHours}
            onChange={(event) => setField("freshnessHours", Number(event.target.value))}
          />
        </label>
        <label>
          <span>责任方</span>
          <input value={source.owner} onChange={(event) => setField("owner", event.target.value)} />
        </label>
      </div>

      <label className="source-field">
        <span>目标表</span>
        <input
          value={targetTablesText}
          onChange={(event) => onDraftChange({ ...draft, targetTablesText: event.target.value, dirty: true, error: "" })}
        />
      </label>

      <div className="implementation-box">
        <strong>采集实现</strong>
        <span>{formatImplementation(source)}</span>
      </div>

      <label className="source-field">
        <span>配置 JSON</span>
        <textarea
          className="code-textarea"
          value={configText}
          onChange={(event) => onDraftChange({ ...draft, configText: event.target.value, dirty: true, error: "" })}
          rows={8}
        />
      </label>

      {latestRun && (
        <div className="latest-run">
          <span className={`run-status ${latestRun.status}`}>{latestRun.status}</span>
          <span>{latestRun.rowsWritten} rows</span>
          <span>{latestRun.message}</span>
          {latestRun.logUrl && (
            <a href={latestRun.logUrl} target="_blank" rel="noreferrer">
              日志
            </a>
          )}
        </div>
      )}

      <label className="source-field">
        <span>备注</span>
        <textarea value={source.notes} onChange={(event) => setField("notes", event.target.value)} rows={2} />
      </label>

      {error && <span className="form-error">{error}</span>}
      <button className="save-button" onClick={save} disabled={saving}>
        <Save size={16} />
        <span>{dirty ? "保存配置" : "已同步"}</span>
      </button>
    </article>
  );
}

function formatImplementation(source: DataSourceConfig): string {
  const script = typeof source.config.script === "string" ? source.config.script : undefined;
  const fn = typeof source.config.function === "string" ? source.config.function : undefined;
  const workflow = typeof source.config.workflow === "string" ? source.config.workflow : undefined;
  const tickers = Array.isArray(source.config.tickers) ? source.config.tickers.join(", ") : undefined;
  const pieces = [
    workflow ? `workflow: ${workflow}` : undefined,
    script ? `script: ${script}` : undefined,
    fn ? `function: ${fn}` : undefined,
    tickers ? `tickers: ${tickers}` : undefined,
    `tables: ${source.targetTables.join(", ")}`
  ].filter(Boolean);
  return pieces.join("｜");
}

function RunRow({ run }: { run: CollectionRun }) {
  return (
    <div className="run-row">
      <div>
        <strong>{run.sourceName}</strong>
        <span>{run.startedAt}</span>
      </div>
      <span className={`run-status ${run.status}`}>{run.status}</span>
      <span>{run.rowsWritten}</span>
      <span>{run.message}</span>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  suffix,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  tone: string;
}) {
  return (
    <article className={`metric-tile ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>
        {value}
        {suffix && <small>{suffix}</small>}
      </strong>
    </article>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ActionBuckets({ dashboard }: { dashboard: DashboardState }) {
  const buckets = [
    ["屁股仓", dashboard.portfolioPlan.coreBook],
    ["手部仓", dashboard.portfolioPlan.tradingBook],
    ["观察", dashboard.portfolioPlan.watchList],
    ["减弱", dashboard.portfolioPlan.reduceList]
  ];

  return (
    <div className="bucket-grid">
      {buckets.map(([label, items]) => (
        <div key={label as string} className="bucket">
          <strong>{label as string}</strong>
          {(items as string[]).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

function AssetRow({ item }: { item: QuadrantItem }) {
  return (
    <div className="asset-row">
      <div>
        <strong>{item.name}</strong>
        <span>{item.theme}</span>
      </div>
      <span className="badge" style={{ borderColor: quadrantColors[item.quadrant], color: quadrantColors[item.quadrant] }}>
        {item.quadrantName}
      </span>
      <span>{item.score}</span>
      <span>{item.action}</span>
    </div>
  );
}

function PillList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="pill-list">
      <strong>{label}</strong>
      <div>
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function EvidenceList({ items }: { items: string[] }) {
  return (
    <ul className="evidence-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ReviewStep({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="review-step">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
