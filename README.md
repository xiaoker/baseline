# 模型化A股决策驾驶舱

把策略文档中的“三因子 -> 中短基线 -> 四区间 -> 四象限 -> 组合建议 -> 复盘”落成一个可计算、可解释、可部署的研究系统。

## 技术栈

- React + Vite + TypeScript
- Hono + Cloudflare Pages Functions
- Cloudflare D1 免费 SQLite 兼容数据库
- GitHub Actions 定时数据采集
- Python ETL：AKShare + yfinance

## 本地运行

```bash
npm install
npm run dev
```

只有前端开发服务器且没有 API/D1 数据时，界面会显示“等待真实数据接入”的空状态，不会使用内置市场案例。要连 Pages Functions 和本地 D1：

```bash
npm run pages:dev
```

## D1 初始化

```bash
npx wrangler d1 create baseline
npx wrangler d1 execute baseline --remote --file migrations/0001_initial.sql
npx wrangler d1 execute baseline --remote --file data/seed.sql
```

把创建出来的 `database_id` 写入 `wrangler.toml` 后再部署。GitHub Actions 采集任务还需要配置仓库 secret：

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

## 核心文件

- `src/lib/strategyDefinitions.ts`：三因子、中短基线、四区间、四象限的系统定义。
- `src/lib/strategyEngine.ts`：把数据转换成状态、象限和组合动作。
- `src/lib/dataSources.ts`：后台数据源默认配置。
- `src/lib/emptyState.ts`：无真实数据时的空状态。
- `functions/api/[[route]].ts`：Cloudflare API。
- `migrations/0001_initial.sql`：D1 schema。
- `scripts/collect_market_data.py`：交易日收盘后的主动数据采集和模型状态自动派生。

## 策略工作台

- 驾驶舱：查看当前区间、风险灯、组合动作和高优先级象限对象。
- 三因子：单独查看总量分母、总量分子、结构分子的定义、评分、乐观/中性/悲观判断、核心变量、判断方法、权重、置信度、数据字段、正负信号和证据链。
- 三因子动态关系：识别市场主导力量、因子强弱排序、中期基线方向和战略指导。
- 基线：查看中期基线和短期基线的叙事、锚资产、核心板块和失效条件。
- 中短基线双轨：查看中期红绿灯、过滤器、短期三大纪律、情绪监控和中短共振状态。
- 四区间：查看当前市场运行区间和择时依据。
- 四区间周期：查看“讲故事 -> 信故事 -> 共识扩散 -> 情绪回归现实”的周期位置和完整策略表。
- 四象限：查看作战地图、当前区间的象限侧重、完整四象限策略表、动作矩阵和品种归类证据。
- 数据源：配置和追踪采集来源。

## 数据源后台

系统内置“数据源”后台页，用于查看：

- AKShare A股行情采集配置。
- AKShare 行业/概念板块采集配置。
- AKShare 宏观慢变量采集配置。
- yfinance 港美与商品锚采集配置。
- 宏观慢变量和结构叙事的人工补强入口设计。
- 模型状态自动派生任务配置。
- GitHub Actions ETL 的运行状态。
- 每次采集写入的行数、状态、错误和日志链接。

每张数据源卡片可以编辑：

- 启用/暂停。
- 调度说明。
- 新鲜度阈值。
- 目标表。
- 用途、责任方、备注。
- 配置 JSON，例如 `script`、`package`、`function`、`tickers`、`maxRows`。

页面中的“采集实现”会明确显示数据来自哪里，例如：

- `script: scripts/collect_market_data.py`
- `package: akshare`
- `function: stock_zh_a_spot_em`
- `tables: market_prices, market_breadth`

## 自动派生

GitHub Actions 运行 `scripts/collect_market_data.py` 后，不只写入原始行情，也会自动派生：

- `factor_states`：总量分母、总量分子、结构分子。
- `baseline_states`：中期基线和短期基线。
- `quadrant_items`：由行业/概念板块强弱生成的象限候选。
- `narrative_events`：自动识别的强势主题证据。

如果宏观或产业微观数据缺失，系统会降低置信度或保持中性，不会用内置案例替代真实判断。

Cloudflare Pages Functions 负责 `/api/data-sources`、`/api/collection-runs` 等配置和状态 API。Python 数据采集仍由 GitHub Actions 执行，避免在 Cloudflare Worker 里运行不适合的 Python 依赖。

## 风险提示

本系统只用于研究、复盘和决策辅助，不构成投资建议，不自动下单。
