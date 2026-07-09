export type FactorId =
  | "liquidity_denominator"
  | "macro_numerator"
  | "structure_numerator";

export type IntervalId =
  | "interval_1_discount"
  | "interval_2_disorder"
  | "interval_3_premium"
  | "interval_4_reversion";

export type QuadrantId =
  | "quadrant_1_core"
  | "quadrant_2_trading"
  | "quadrant_3_hunt"
  | "quadrant_4_transition";

export type BaselineHorizon = "medium" | "short";

export interface FactorDefinition {
  id: FactorId;
  name: string;
  shortName: string;
  purpose: string;
  coreVariables: string[];
  dataFields: string[];
  judgementMethod: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  defaultWeight: number;
}

export interface IntervalDefinition {
  id: IntervalId;
  name: string;
  state: string;
  baselineFeature: string;
  detection: string[];
  posture: string;
  philosophy: string;
  storyStage: string;
}

export interface QuadrantDefinition {
  id: QuadrantId;
  name: string;
  coordinates: string;
  capitalType: string;
  pricingLogic: string;
  representativeAssets: string[];
  portfolioRole: string;
  intervalRole: string;
  defaultRisk: "low" | "medium" | "high";
}

export interface BaselineDefinition {
  horizon: BaselineHorizon;
  name: string;
  definition: string;
  updateCadence: string;
  outputFields: string[];
  hardRules: string[];
}

export const FACTOR_DEFINITIONS: FactorDefinition[] = [
  {
    id: "liquidity_denominator",
    name: "总量分母",
    shortName: "总量分母",
    purpose: "代表货币环境和流动性溢价，决定市场的风险偏好中枢。",
    coreVariables: ["美联储/央行政策", "利率", "缩表/扩表", "全球资本流向", "汇率", "市场流动性"],
    dataFields: [
      "联邦基金利率/美债利率",
      "央行公开市场操作",
      "美元指数",
      "人民币汇率",
      "北向/全球资金流",
      "A股成交额",
      "融资余额",
      "指数波动率"
    ],
    judgementMethod: [
      "利率和美元走弱、人民币稳定、资金回流时偏乐观。",
      "利率和美元走强、资金流出、波动率抬升时偏悲观。",
      "分母主要决定能不能给估值扩张，不直接决定哪个赛道有超额收益。"
    ],
    positiveSignals: ["利率下行", "人民币稳定", "成交额温和放大", "波动率下降"],
    negativeSignals: ["利率上行", "美元走强", "成交萎缩", "波动率快速上升"],
    defaultWeight: 0.3
  },
  {
    id: "macro_numerator",
    name: "总量分子",
    shortName: "总量分子",
    purpose: "代表宏观经济周期和企业盈利总量趋势，决定市场的盈利基础。",
    coreVariables: ["GDP", "PMI", "就业", "通胀", "社融", "工业企业利润", "上市公司盈利"],
    dataFields: ["GDP/高频增长指标", "PMI", "就业", "CPI/PPI", "工业企业利润", "社融", "指数盈利", "行业盈利趋势"],
    judgementMethod: [
      "PMI、利润、就业、社融和盈利预期同步改善时偏乐观。",
      "通缩、利润收缩、PMI回落和盈利下修时偏悲观。",
      "总量分子决定是否存在全市场 beta；没有总量分子时，只能按结构性行情处理。"
    ],
    positiveSignals: ["PMI改善", "利润周期上行", "社融改善", "盈利预期上修"],
    negativeSignals: ["PMI下行", "通缩压力", "利润收缩", "盈利预期下修"],
    defaultWeight: 0.25
  },
  {
    id: "structure_numerator",
    name: "结构分子",
    shortName: "结构分子",
    purpose: "代表特定行业或赛道的结构性景气与微观叙事，决定市场的超额收益来源。",
    coreVariables: ["AI资本开支", "新能源渗透率", "订单/产能", "供需缺口", "产业事件", "赛道资金强度"],
    dataFields: [
      "主题池与主题资产映射",
      "板块相对强弱",
      "成交占比变化",
      "港美映射",
      "商品价格",
      "产业事件",
      "订单/产能/资本开支证据",
      "人工确认叙事"
    ],
    judgementMethod: [
      "先用人工或事件录入确认赛道叙事，例如产业资本开支、供给约束、新能源渗透率。",
      "再用行情验证：板块相对强弱、成交占比、趋势稳定性、扩散宽度和熵值。",
      "再用外部锚验证：港股/美股映射、商品价格、产业链上游价格是否共振。",
      "最后用微观证据确认：订单、产能、资本开支、供需缺口是否支持叙事。",
      "结构分子只有在叙事、市场资金和产业证据同时改善时才判为乐观。"
    ],
    positiveSignals: ["核心板块趋势新高", "港美锚共振", "商品或订单验证", "叙事扩散"],
    negativeSignals: ["主线断裂", "锚资产走弱", "叙事无法验证", "资金过度拥挤"],
    defaultWeight: 0.45
  }
];

export const BASELINE_DEFINITIONS: BaselineDefinition[] = [
  {
    horizon: "medium",
    name: "中期基线",
    definition: "由三因子累积变化形成的慢变量趋势锚，决定核心叙事和估值基准。",
    updateCadence: "日度检查，周度确认；除非因子明显变盘，否则不频繁切换。",
    outputFields: ["主叙事", "方向", "多空状态", "核心锚资产", "核心板块", "置信度", "失效条件"],
    hardRules: [
      "中期基线是仓位锚，不用短期波动轻易否定。",
      "结构分子强而总量不差时，系统默认寻找结构性机会。",
      "总量分母和总量分子同时转弱时，中期基线降风险。"
    ]
  },
  {
    horizon: "short",
    name: "短期基线",
    definition: "围绕中期基线波动的故事、情绪和波动率抓手，是手部交易依据。",
    updateCadence: "日度更新，盘后复核；情绪急变时允许人工覆盖。",
    outputFields: ["当前故事", "传播强度", "情绪温度", "波动状态", "参与板块", "基线连接度"],
    hardRules: [
      "短期故事可以和中期基本面偶断，但必须和中期基线丝连。",
      "脱离中期基线的故事只能低仓位、短周期处理。",
      "短期基线只指导手部，不轻易动摇屁股仓。"
    ]
  }
];

export const INTERVAL_DEFINITIONS: IntervalDefinition[] = [
  {
    id: "interval_1_discount",
    name: "区间一",
    state: "贴水状态",
    baselineFeature: "情绪过度悲观，市场定价低于中期基线。三因子中，总量因子偏弱但结构分子有亮点。",
    detection: ["情绪过度悲观", "核心品种低熵", "价格低于中期基线", "结构分子仍有亮点"],
    posture: "增持靠近中期基线的一象限核心品种。",
    philosophy: "信自己：识别并买入被错杀的锚。",
    storyStage: "讲故事：短期基线开始从悲观中寻找能偷中期逻辑的故事。"
  },
  {
    id: "interval_2_disorder",
    name: "区间二",
    state: "正常状态（失序）",
    baselineFeature: "贴水修复后，市场对新资金分配混乱，信息熵膨胀，结构分散，波动大但主线开始被筛选。",
    detection: ["贴水修复", "资金分配混乱", "信息熵膨胀", "强势集群开始被市场选择"],
    posture: "选好车，尊重图形和资金集群。",
    philosophy: "信别人：放弃主观预判，跟随市场共识的形成。",
    storyStage: "信故事：资金开始相信故事，并通过图形和集群行为选择主线。"
  },
  {
    id: "interval_3_premium",
    name: "区间三",
    state: "升水状态",
    baselineFeature: "情绪过热，市场定价显著高于中期基线，后排品种开始插上，扩散效应明显。",
    detection: ["情绪过热", "价格显著高于中期基线", "后排扩散", "高弹性品种补涨"],
    posture: "核心坐稳，手部加速，控制三象限风险。",
    philosophy: "清空脑子：不纠缠基本面，享受情绪惯性。",
    storyStage: "共识扩散：市场共识从核心扩散到后排，情绪惯性主导。"
  },
  {
    id: "interval_4_reversion",
    name: "区间四",
    state: "高波回归",
    baselineFeature: "升水结束，所有品种都处于高熵状态，市场进入高波失序的混沌期。",
    detection: ["升水结束", "全市场高熵", "波动放大", "高风险叙事退潮"],
    posture: "防守，减高熵，回到低熵核心。",
    philosophy: "克制，回归：锁定盈利，等待下一次贴水周期。",
    storyStage: "情绪回归现实：故事溢价消退，资金重新回到中期基线附近。"
  }
];

export const QUADRANT_DEFINITIONS: QuadrantDefinition[] = [
  {
    id: "quadrant_1_core",
    name: "一象限",
    coordinates: "机构共识 + 基本面驱动",
    capitalType: "公募、保险、外资等大资金",
    pricingLogic: "数据驱动、中长期景气度",
    representativeAssets: ["光模块", "铜铝", "黄金"],
    portfolioRole: "屁股仓核心",
    intervalRole: "核心屁股：在区间一、四增持；在区间三守护。",
    defaultRisk: "low"
  },
  {
    id: "quadrant_2_trading",
    name: "二象限",
    coordinates: "游资情绪 + 基本面驱动",
    capitalType: "游资、量化、灵活机构",
    pricingLogic: "基本面有锚但弹性更大",
    representativeAssets: ["国产算力", "光纤光缆", "储能材料"],
    portfolioRole: "手部主战场",
    intervalRole: "手部主场：高抛低吸，博取中期基线延伸的情绪溢价。",
    defaultRisk: "medium"
  },
  {
    id: "quadrant_3_hunt",
    name: "三象限",
    coordinates: "游资情绪 + 叙事驱动",
    capitalType: "纯游资、散户、高风险偏好量化",
    pricingLogic: "纯情绪和远期预期",
    representativeAssets: ["商业航天", "AI应用早期", "油气"],
    portfolioRole: "高波猎场",
    intervalRole: "对手盘/猎场：在区间三用于套利；区间一、四需规避。",
    defaultRisk: "high"
  },
  {
    id: "quadrant_4_transition",
    name: "四象限",
    coordinates: "机构共识 + 叙事驱动",
    capitalType: "游资抱团后获得机构认可",
    pricingLogic: "叙事向基本面过渡",
    representativeAssets: ["PCB上游", "从三象限成功突围的品种"],
    portfolioRole: "过渡区",
    intervalRole: "过渡区：从三象限向一二象限迁移的桥梁。",
    defaultRisk: "medium"
  }
];

export const INTERVAL_QUADRANT_FOCUS: Record<IntervalId, string> = {
  interval_1_discount: "区间一：重点增持一象限，吃贴水，规避三象限高波叙事。",
  interval_2_disorder: "区间二：所有象限选好车，尊重市场选择出的主线和核心品种。",
  interval_3_premium: "区间三：重一守三攻，一象限守核心，二/三象限做手部加速。",
  interval_4_reversion: "区间四：右缩左扩，缩三象限高熵品种，扩一象限低熵核心。"
};

export const DECISION_MATRIX: Record<IntervalId, Record<QuadrantId, string>> = {
  interval_1_discount: {
    quadrant_1_core: "增持核心低熵品种，建立或修复屁股仓。",
    quadrant_2_trading: "小仓试错，确认资金承接后再扩大手部。",
    quadrant_3_hunt: "规避高波叙事，等待情绪修复。",
    quadrant_4_transition: "观察叙事验证，低波位置可少量跟踪。"
  },
  interval_2_disorder: {
    quadrant_1_core: "保留核心，筛掉弱于基线的品种。",
    quadrant_2_trading: "承接资金，高抛低吸，寻找市场选出的主线。",
    quadrant_3_hunt: "缩圈观察，只留图形和流动性最强者。",
    quadrant_4_transition: "低波布局，关注从故事到基本面的迁移。"
  },
  interval_3_premium: {
    quadrant_1_core: "屁股坐稳，不轻易卖掉中期筹码。",
    quadrant_2_trading: "手部加速，快节奏兑现弹性。",
    quadrant_3_hunt: "只做快进快出，严控回撤和流动性。",
    quadrant_4_transition: "选择能被机构接住的叙事，避免纯扩散尾部。"
  },
  interval_4_reversion: {
    quadrant_1_core: "回到低熵核心，保留中期基线资产。",
    quadrant_2_trading: "降低频率，等待波动收敛。",
    quadrant_3_hunt: "减仓或退出，避免高波回撤。",
    quadrant_4_transition: "只保留证据改善者，等待下一轮贴水。"
  }
};

export function getFactorDefinition(id: FactorId): FactorDefinition {
  return FACTOR_DEFINITIONS.find((item) => item.id === id)!;
}

export function getIntervalDefinition(id: IntervalId): IntervalDefinition {
  return INTERVAL_DEFINITIONS.find((item) => item.id === id)!;
}

export function getQuadrantDefinition(id: QuadrantId): QuadrantDefinition {
  return QUADRANT_DEFINITIONS.find((item) => item.id === id)!;
}
