import type { MarketScenarioInput } from "../../src/lib/types";

export const JAN_2026_SCENARIO: MarketScenarioInput = {
  date: "2026-01-15",
  title: "区间二加速下的上游供给与象限切换",
  factors: [
    {
      id: "liquidity_denominator",
      score: 58,
      direction: "neutral",
      outlook: "neutral",
      outlookSummary: "分母端中性偏多：流动性没有形成全面牛市推力，但也没有压制结构性行情。",
      confidence: 0.72,
      metrics: [
        {
          name: "货币环境",
          value: 52,
          direction: "neutral",
          weight: 0.3,
          evidence: "美债利率震荡，联储/央行政策没有提供强估值扩张。"
        },
        {
          name: "市场流动性",
          value: 64,
          direction: "positive",
          weight: 0.4,
          evidence: "成交维持活跃，结构性资金承接仍在。"
        },
        {
          name: "风险偏好",
          value: 45,
          direction: "neutral",
          weight: 0.3,
          evidence: "监管扰动提升局部波动，但未形成系统性风险。"
        }
      ],
      evidence: ["分母端不提供全局牛市，但没有否定结构性机会。", "人民币和外部流动性处于可承受区间。"]
    },
    {
      id: "macro_numerator",
      score: 46,
      direction: "neutral",
      outlook: "neutral",
      outlookSummary: "总量分子中性偏弱：没有全市场总量 beta，行情级别应定义为结构性。",
      confidence: 0.62,
      metrics: [
        {
          name: "宏观周期",
          value: 42,
          direction: "neutral",
          weight: 0.45,
          evidence: "GDP/PMI等总量变量没有形成全市场 beta。"
        },
        {
          name: "企业盈利",
          value: 48,
          direction: "neutral",
          weight: 0.35,
          evidence: "盈利趋势未成为主导变量。"
        },
        {
          name: "信用与通胀",
          value: 50,
          direction: "neutral",
          weight: 0.2,
          evidence: "社融、就业、通胀等慢变量没有明显突破。"
        }
      ],
      evidence: ["总量分子不是本轮行情主因。", "系统把行情级别定义为结构性，而非全局性。"]
    },
    {
      id: "structure_numerator",
      score: 84,
      direction: "bullish",
      outlook: "optimistic",
      outlookSummary: "结构分子乐观：AI Infra 与上游供给共振，是当前中期基线的主导因子。",
      confidence: 0.86,
      metrics: [
        {
          name: "赛道景气",
          value: 86,
          direction: "positive",
          weight: 0.25,
          evidence: "AI资本开支和上游供给叙事扩散，AI Infra 景气从绝对稀缺扩散到相对稀缺。"
        },
        {
          name: "微观订单/产能",
          value: 88,
          direction: "positive",
          weight: 0.25,
          evidence: "上游供给、产能紧张和产业链价格信号支持叙事。"
        },
        {
          name: "板块资金强度",
          value: 82,
          direction: "positive",
          weight: 0.25,
          evidence: "核心板块相对强势，成交占比和趋势稳定性改善。"
        },
        {
          name: "港美/商品锚",
          value: 78,
          direction: "positive",
          weight: 0.25,
          evidence: "美股铜铝、半导体设备维持趋势性走强。"
        }
      ],
      evidence: ["结构分子是主导因子。", "新中期叙事由上游供给确认并扩散。"]
    }
  ],
  breadth: {
    advancers: 2830,
    decliners: 2050,
    limitUp: 76,
    limitDown: 8,
    turnoverCnyBn: 1170,
    volatilityScore: 58,
    dispersionScore: 64,
    sentimentScore: 67,
    premiumDiscountScore: 61,
    heatScore: 66
  },
  mediumBaseline: {
    horizon: "medium",
    narrative: "上游供给 + AI Infra 结构性扩散",
    direction: "up",
    stance: "risk_on",
    confidence: 82,
    anchorAssets: ["铜", "铝", "黄金", "美股半导体设备", "光模块"],
    coreSectors: ["光模块", "PCB上游", "半导体设备", "铜铝"],
    invalidation: ["港美锚连续走弱", "铜铝趋势破位", "AI Infra 核心品种失去资金承接"],
    evidence: ["1月4日确认上游供给叙事。", "1月6日观察到铝铜和中芯联动。", "结构分子扩散强于总量因子。"]
  },
  shortBaseline: {
    horizon: "short",
    narrative: "商业航天分歧释放资金，国产算力和半导体设备承接",
    direction: "up",
    stance: "risk_on",
    confidence: 76,
    anchorAssets: ["商业航天", "国产算力", "半导体设备", "AI应用"],
    coreSectors: ["国产算力", "半导体设备", "AI应用", "商业航天"],
    invalidation: ["商业航天高波扩散成系统性亏钱效应", "二象限承接失败", "监管压力导致全局缩量"],
    evidence: ["商业航天进入分歧第二日。", "资金从三象限释放并流向更健康的低波板块。", "情绪线与基准线逐渐共振。"],
    connectionScore: 74,
    emotionTemperature: 68,
    volatilityMode: "expanded"
  },
  candidates: [
    {
      symbol: "CPO",
      name: "光模块核心",
      assetType: "sector",
      theme: "AI Infra",
      institutionConsensus: 88,
      fundamentalEvidence: 86,
      hotMoney: 52,
      narrativeStrength: 78,
      trendScore: 82,
      entropyScore: 38,
      liquidityScore: 82,
      evidence: ["一象限核心底仓。", "源杰、中际等核心品种保留最强者。"]
    },
    {
      symbol: "CUAL",
      name: "铜铝",
      assetType: "commodity",
      theme: "上游供给",
      institutionConsensus: 82,
      fundamentalEvidence: 84,
      hotMoney: 48,
      narrativeStrength: 72,
      trendScore: 80,
      entropyScore: 42,
      liquidityScore: 78,
      evidence: ["上游供给主叙事锚资产。", "与美股资源品趋势共振。"]
    },
    {
      symbol: "AIDC",
      name: "国产算力",
      assetType: "sector",
      theme: "AI Infra",
      institutionConsensus: 54,
      fundamentalEvidence: 72,
      hotMoney: 84,
      narrativeStrength: 82,
      trendScore: 76,
      entropyScore: 56,
      liquidityScore: 74,
      evidence: ["承接商业航天释放的资金。", "与中期 AI Infra 基线丝连。"]
    },
    {
      symbol: "SEMI-EQ",
      name: "半导体设备",
      assetType: "sector",
      theme: "上游供给",
      institutionConsensus: 58,
      fundamentalEvidence: 74,
      hotMoney: 72,
      narrativeStrength: 78,
      trendScore: 74,
      entropyScore: 52,
      liquidityScore: 70,
      evidence: ["美股 AMAT 等锚资产趋势性上涨。", "处于二象限手部主战场。"]
    },
    {
      symbol: "SPACE",
      name: "商业航天",
      assetType: "theme",
      theme: "高波叙事",
      institutionConsensus: 28,
      fundamentalEvidence: 36,
      hotMoney: 88,
      narrativeStrength: 82,
      trendScore: 62,
      entropyScore: 76,
      liquidityScore: 65,
      evidence: ["三象限高波释放。", "分歧第二日，按图缩圈。"]
    },
    {
      symbol: "PCB-UP",
      name: "PCB上游",
      assetType: "sector",
      theme: "AI Infra 上游",
      institutionConsensus: 64,
      fundamentalEvidence: 56,
      hotMoney: 58,
      narrativeStrength: 80,
      trendScore: 70,
      entropyScore: 48,
      liquidityScore: 68,
      evidence: ["从三象限向四象限迁移。", "叙事开始获得机构认可。"]
    },
    {
      symbol: "AI-APP",
      name: "AI应用",
      assetType: "theme",
      theme: "AI应用",
      institutionConsensus: 62,
      fundamentalEvidence: 48,
      hotMoney: 66,
      narrativeStrength: 84,
      trendScore: 68,
      entropyScore: 58,
      liquidityScore: 72,
      evidence: ["从纯情绪走向机构共识过渡。", "适合手部低波布局。"]
    },
    {
      symbol: "SEMI-MAT",
      name: "半导体材料",
      assetType: "sector",
      theme: "低波轮动",
      institutionConsensus: 66,
      fundamentalEvidence: 52,
      hotMoney: 46,
      narrativeStrength: 70,
      trendScore: 62,
      entropyScore: 44,
      liquidityScore: 62,
      evidence: ["低波填仓方向。", "等待从四象限向一二象限验证。"]
    }
  ]
};
