import type { DataSourceDashboard, DataSourceConfig } from "./types";

export const DEFAULT_DATA_SOURCES: DataSourceConfig[] = [
  {
    id: "akshare_a_spot",
    name: "A股实时行情",
    provider: "AKShare",
    kind: "akshare",
    category: "market",
    purpose: "采集全市场个股价格、涨跌幅、成交额，用于市场宽度、情绪、热度和个股基础行情。",
    enabled: true,
    schedule: "交易日 17:20 Asia/Shanghai",
    targetTables: ["market_prices", "market_breadth"],
    freshnessHours: 28,
    config: {
      script: "scripts/collect_market_data.py",
      package: "akshare",
      primary: "eastmoney_direct_clist",
      fallbacks: ["stock_zh_a_spot_em", "stock_zh_a_spot_sina"],
      maxRows: 400,
      retries: 3
    },
    owner: "GitHub Actions Python ETL",
    notes: "首版只落前 400 行行情和全市场宽度统计，避免 D1 免费层写入过大。"
  },
  {
    id: "akshare_boards",
    name: "行业与概念板块",
    provider: "AKShare",
    kind: "akshare",
    category: "market",
    purpose: "采集行业和概念板块强弱、扩散、热度，用于自动识别结构分子、短期故事和四象限候选。",
    enabled: true,
    schedule: "交易日 17:20 Asia/Shanghai",
    targetTables: ["themes", "narrative_events", "quadrant_items"],
    freshnessHours: 28,
    config: {
      script: "scripts/collect_market_data.py",
      package: "akshare",
      primary: "eastmoney_direct_board_clist",
      functions: ["stock_board_industry_name_em", "stock_board_concept_name_em"],
      fallbacks: ["stock_board_industry_name_em", "stock_board_concept_name_em"],
      maxThemes: 12
    },
    owner: "GitHub Actions Python ETL",
    notes: "该数据只用于板块强弱和主题识别；产业订单/产能仍需要事件证据或人工确认补强。"
  },
  {
    id: "akshare_macro",
    name: "宏观慢变量自动采集",
    provider: "AKShare",
    kind: "akshare",
    category: "macro",
    purpose: "尝试采集 PMI、CPI、PPI、社融等慢变量，用于自动派生总量分子。",
    enabled: true,
    schedule: "交易日 17:20 Asia/Shanghai",
    targetTables: ["macro_observations"],
    freshnessHours: 720,
    config: {
      script: "scripts/collect_market_data.py",
      package: "akshare",
      functions: ["macro_china_pmi_yearly", "macro_china_cpi_yearly", "macro_china_ppi_yearly", "macro_china_shrzgm"]
    },
    owner: "GitHub Actions Python ETL",
    notes: "如果宏观接口不可用，系统不会编造方向，而是以中性低置信度处理总量分子。"
  },
  {
    id: "yfinance_anchors",
    name: "港美与商品锚",
    provider: "yfinance",
    kind: "yfinance",
    category: "anchor",
    purpose: "采集港股、美股、商品、汇率等外部锚，支持中期基线确认。",
    enabled: true,
    schedule: "交易日 17:20 Asia/Shanghai",
    targetTables: ["anchor_assets"],
    freshnessHours: 36,
    config: {
      script: "scripts/collect_market_data.py",
      package: "yfinance",
      function: "yf.download",
      tickers: ["HG=F", "ALI=F", "GC=F", "CL=F", "DX-Y.NYB", "^TNX", "USDCNY=X"],
      period: "1mo"
    },
    owner: "GitHub Actions Python ETL",
    notes: "yfinance 用于个人研究用途，部署前应确认数据使用边界。"
  },
  {
    id: "manual_macro",
    name: "宏观慢变量",
    provider: "Manual",
    kind: "manual",
    category: "macro",
    purpose: "人工补充或覆盖 PMI、CPI/PPI、工业企业利润、社融、指数盈利等低频变量。",
    enabled: true,
    schedule: "数据发布日人工录入",
    targetTables: ["macro_observations", "factor_states"],
    freshnessHours: 720,
    config: { approvalRequired: true },
    owner: "人工确认",
    notes: "自动宏观采集失败或数据口径不合适时，用该入口人工补强证据。"
  },
  {
    id: "manual_narratives",
    name: "结构叙事与产业事件",
    provider: "Manual",
    kind: "manual",
    category: "narrative",
    purpose: "人工补充结构主题、产业事件、主题资产映射和人工确认。",
    enabled: true,
    schedule: "盘后复盘时录入",
    targetTables: ["themes", "narrative_events", "factor_states", "baseline_states", "quadrant_items"],
    freshnessHours: 72,
    config: { approvalRequired: true, supportsOverrides: true },
    owner: "人工确认",
    notes: "短期故事必须记录与中期基线的连接证据。"
  },
  {
    id: "github_actions_etl",
    name: "收盘后采集任务",
    provider: "GitHub Actions",
    kind: "github_actions",
    category: "orchestration",
    purpose: "在收盘后运行 Python ETL，生成 SQL 并写入 Cloudflare D1。",
    enabled: true,
    schedule: "20 9 * * 1-5 UTC",
    targetTables: ["data_collection_runs", "market_prices", "market_breadth", "anchor_assets", "macro_observations"],
    freshnessHours: 28,
    config: { workflow: ".github/workflows/collect-market-data.yml", script: "scripts/collect_market_data.py", writesRunLog: true },
    owner: "GitHub Actions",
    notes: "Cloudflare Worker 不跑 Python，只负责 API、配置和状态查看。"
  },
  {
    id: "model_derivation",
    name: "模型状态自动派生",
    provider: "Python ETL",
    kind: "github_actions",
    category: "orchestration",
    purpose: "根据原始行情、板块、宏观和锚资产数据自动生成三因子、基线和四象限候选。",
    enabled: true,
    schedule: "跟随收盘后采集任务",
    targetTables: ["factor_states", "baseline_states", "themes", "narrative_events", "quadrant_items"],
    freshnessHours: 28,
    config: {
      script: "scripts/collect_market_data.py",
      stage: "derive_model_state",
      inputs: ["market_breadth", "anchor_assets", "macro_observations", "AKShare board snapshots"]
    },
    owner: "GitHub Actions Python ETL",
    notes: "派生结果带证据链；微观订单/产能缺失时降低置信度或提示人工补强。"
  },
  {
    id: "cloudflare_health",
    name: "Cloudflare 健康检查",
    provider: "Cloudflare Workers",
    kind: "cloudflare_worker",
    category: "orchestration",
    purpose: "提供 /api/health 和轻量状态检查，后续可扩展为定时重算状态。",
    enabled: true,
    schedule: "按需请求",
    targetTables: ["data_sources", "data_collection_runs"],
    freshnessHours: 24,
    config: { endpoint: "/api/health" },
    owner: "Cloudflare Pages Functions",
    notes: "不承担 AKShare/yfinance 采集。"
  }
];

export const DEFAULT_DATA_SOURCE_DASHBOARD: DataSourceDashboard = {
  sources: DEFAULT_DATA_SOURCES,
  runs: [],
  generatedAt: new Date().toISOString(),
  mode: "configured"
};
