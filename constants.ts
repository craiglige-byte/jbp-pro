import { JBPData, TemplateStrategy } from './types';

export const OWNER_COLORS: Record<string, { bg: string, text: string, border: string, badge: string }> = {
  '经销商老板': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  '业务主管': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  '城市经理': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  '品牌专员': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  '财务': { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200', badge: 'bg-slate-200 text-slate-700' },
  '采购': { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700' },
  '仓管': { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-700' },
  '数据分析': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
  '仓库主管': { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', badge: 'bg-teal-100 text-teal-700' },
  '业务员': { bg: 'bg-lime-50', text: 'text-lime-800', border: 'border-lime-200', badge: 'bg-lime-100 text-lime-700' },
};

export const ACTION_OWNERS = [
  '经销商老板',
  '业务主管',
  '城市经理',
  '品牌专员',
  '财务',
  '采购',
  '仓管',
  '数据分析',
  '仓库主管',
  '业务员'
];

export const INITIAL_DATA: JBPData = {
  distributorName: 'XX商贸有限公司',
  managerName: '张三',
  period: 'FY2027',
  contractType: '',
  contractDetail: '',
  selectedRelatedCustomers: [],
  authorizedRegions: [],
  authorizationConfirmed: false,
  authorizationPolygons: [],
  performance: {
    sellIn: 1200,
    sellOut: 1150,
    coverage: 3500,
    distribution: 85,
    coolers: 450,
    efficiency: 120,
    profit: 180,
    profitMargin: 15,
    investment: 85,
    roi: 212
  },
  channelAnalysis: [
    { id: '1', name: '自贩机', sales: 320, growth: 15, profitMargin: 12, contribution: 28 },
    { id: '2', name: '现代', sales: 450, growth: 25, profitMargin: 18, contribution: 39 },
    { id: '3', name: '传统', sales: 210, growth: -5, profitMargin: 10, contribution: 18 },
    { id: '4', name: '餐饮', sales: 120, growth: 8, profitMargin: 15, contribution: 10 },
    { id: '5', name: '大娱乐', sales: 50, growth: 35, profitMargin: 20, contribution: 5 },
    { id: '6', name: '学校', sales: 80, growth: 20, profitMargin: 16, contribution: 8 },
    { id: '7', name: '运动', sales: 60, growth: 18, profitMargin: 14, contribution: 6 },
    { id: '8', name: '景区', sales: 70, growth: 22, profitMargin: 17, contribution: 7 },
    { id: '9', name: '交通', sales: 90, growth: 12, profitMargin: 13, contribution: 9 },
    { id: '10', name: '办公场所', sales: 110, growth: 10, profitMargin: 11, contribution: 11 },
    { id: '11', name: '医院', sales: 40, growth: 15, profitMargin: 19, contribution: 4 },
    { id: '12', name: '线上', sales: 150, growth: 30, profitMargin: 21, contribution: 12 },
  ],
  teamAnalysis: [
    { id: '1', name: '张经理', status: 'active', sales: 350, growth: 20, profitMargin: 15, contribution: 30 },
    { id: '2', name: '李主管', status: 'active', sales: 280, growth: 15, profitMargin: 13, contribution: 24 },
    { id: '3', name: '王业代', status: 'active', sales: 210, growth: 10, profitMargin: 12, contribution: 18 },
    { id: '4', name: '赵业代', status: 'active', sales: 180, growth: 5, profitMargin: 11, contribution: 15 },
    { id: '5', name: '孙业代', status: 'active', sales: 130, growth: 2, profitMargin: 10, contribution: 11 },
    { id: '6', name: '钱业代 (离职)', status: 'resigned', sales: 0, growth: 0, profitMargin: 0, contribution: 2 },
  ],
  operations: {
    warehouse: 1200,
    vehicles: [
      { id: 'v1', name: '4.2米厢货', count: 5 },
      { id: 'v2', name: '金杯面包', count: 8 },
      { id: 'v3', name: '电动三轮', count: 12 }
    ],
    personnel: [
      { id: 'p1', name: '销售主管', count: 1 },
      { id: 'p2', name: '巡店业代', count: 15 },
      { id: 'p3', name: '配送司机', count: 8 },
      { id: 'p4', name: '财务后勤', count: 3 }
    ],
    capital: [
      { id: 'c1', name: '常态库存资金', amount: 200 },
      { id: 'c2', name: '市场垫资', amount: 50 },
      { id: 'c3', name: '信贷保证金', amount: 20 }
    ]
  },
  marketStats: {
    population: '150万',
    gdp: '850亿',
    perCapitaConsumption: '58元'
  },
  competitors: [
    { id: 'comp1', name: '农夫山泉', abbr: 'NFSQ', target: '1.5亿', achievement: 95, outlets: 4200 },
    { id: 'comp2', name: '怡宝', abbr: 'YB', target: '1.2亿', achievement: 92, outlets: 3800 }
  ],
  trends: [
    { month: '1月', inventory: 15000, days: 45, sellIn: 100, sellOut: 95 },
    { month: '2月', inventory: 18000, days: 52, sellIn: 80, sellOut: 70 },
    { month: '3月', inventory: 16000, days: 48, sellIn: 90, sellOut: 92 },
    { month: '4月', inventory: 14000, days: 42, sellIn: 110, sellOut: 105 },
    { month: '5月', inventory: 12000, days: 35, sellIn: 120, sellOut: 125 },
    { month: '6月', inventory: 10000, days: 28, sellIn: 150, sellOut: 160 },
    { month: '7月', inventory: 9000, days: 25, sellIn: 160, sellOut: 170 },
    { month: '8月', inventory: 9500, days: 26, sellIn: 155, sellOut: 150 },
    { month: '9月', inventory: 11000, days: 32, sellIn: 130, sellOut: 120 },
    { month: '10月', inventory: 13000, days: 38, sellIn: 100, sellOut: 90 },
    { month: '11月', inventory: 14500, days: 43, sellIn: 90, sellOut: 85 },
    { month: '12月', inventory: 16000, days: 46, sellIn: 110, sellOut: 100 }
  ],
  issues: [],
  opportunities: [],
  objectives: [
    { id: 'obj1', title: '达成进货承诺', targetValue: '', strategies: [] },
    { id: 'obj2', title: '实现销售目标', targetValue: '', strategies: [] },
    { id: 'obj3', title: '守住库存健康', targetValue: '', strategies: [] },
    { id: 'obj4', title: '提升盈利能力', targetValue: '', strategies: [] }
  ],
  productCategories: [
    { id: 'cat1', name: '电解质水', color: '#3b82f6', sales: 450, growth: 18, profitMargin: 15 },
    { id: 'cat2', name: '气泡水', color: '#10b981', sales: 320, growth: 12, profitMargin: 12 },
    { id: 'cat3', name: '冰茶', color: '#f59e0b', sales: 280, growth: 8, profitMargin: 10 },
    { id: 'cat4', name: '维生素水', color: '#8b5cf6', sales: 180, growth: 25, profitMargin: 18 },
    { id: 'cat5', name: '好自在', color: '#ec4899', sales: 120, growth: 35, profitMargin: 20 },
    { id: 'cat6', name: '其他', color: '#64748b', sales: 50, growth: 5, profitMargin: 8 }
  ]
};

export const OBJECTIVE_TEMPLATES: { id: string; label: string; suggestedStrategies: TemplateStrategy[] }[] = [
  {
    id: 'obj1',
    label: '达成进货承诺',
    suggestedStrategies: [
      { text: '资金前置储备：提前测算旺季资金缺口，落实银行授信或自有资金增资，确保打款无忧。', measure: '旺季前资金到位率100%', tag: '资金' },
      { text: '年度规划与动态复盘双循环：制定年度进货规划，并建立月度预实分析、季度策略调整机制，确保目标不偏航。', measure: '季度进货目标达成率≥95%', tag: '管理' },
      { text: '月度预估与订货微调双保险：基于历史数据与最新动销预测月度需求，订货前结合库存水位动态微调，精准下单。', measure: '月度订货准确率≥90%', tag: '运营' }
    ]
  },
  {
    id: 'obj2',
    label: '实现销售目标',
    suggestedStrategies: [
      { text: '人效提升与激励绑定：优化人员片区匹配，设计高激励提成方案，将个人收入与销售目标强挂钩。', measure: '人均销售额提升15%', tag: '团队' },
      { text: '存量维持与单品突破：稳住核心老品基本盘，集中资源打造1-2个战略大单品，带动整体增长。', measure: '核心单品增长率≥20%', tag: '产品' },
      { text: '终端分级与单店产出提升：实施终端分级管理（A/B/C类），对高产出A类店进行资源倾斜与精细化服务。', measure: 'A类店单店产出提升10%', tag: '渠道' },
      { text: '渠道拓展与空白区域开发：针对未覆盖的特通、餐饮或新开发区进行专项攻坚，寻找增量。', measure: '新开有效终端数≥500家', tag: '渠道' },
      { text: '过程管控与数据复盘：建立日报周报机制，强化过程指标（拜访、陈列）管控，通过数据复盘及时纠偏。', measure: '拜访执行率100%', tag: '管理' }
    ]
  },
  {
    id: 'obj3',
    label: '守住库存健康',
    suggestedStrategies: [
      { text: '动态安全库存与补货预警：建立各品类安全库存模型，设置系统预警线，低于安全线及时补货，高于警戒线暂停进货。', measure: '断货率<2%，滞销占比<5%', tag: '供应链' },
      { text: '进销存数据滚动预测：建立进销存滚动预测模型，每周更新销售预测与到货计划，前置识别库存风险。', measure: '库存预测准确率≥85%', tag: '数据' },
      { text: '临期品专项处理机制：建立临期品预警清单，针对临期3个月产品启动专项促销或特通消化通道。', measure: '临期品报损率<0.5%', tag: '运营' },
      { text: '库存盘点与责任制度：实施月度抽盘、季度全盘制度，将库存准确率与仓管绩效挂钩。', measure: '账实相符率100%', tag: '管理' },
      { text: '进销联动与库存健康考核：将库存周转天数纳入采购与销售主管的共同考核指标，倒逼进销协同。', measure: '库存周转天数≤35天', tag: '考核' }
    ]
  },
  {
    id: 'obj4',
    label: '提升盈利能力',
    suggestedStrategies: [
      { text: '产品结构优化与毛利提升：分析各SKU毛利贡献，主推高毛利产品，淘汰负毛利或低效产品。', measure: '高毛利产品占比提升5%', tag: '产品' },
      { text: '渠道精耕与单点价值挖掘：聚焦高产出、高利润的优质网点，提升单点销售额与利润贡献。', measure: '单店利润额提升10%', tag: '渠道' },
      { text: '市场费用精准化与效能提升：严控无效市场投入，建立费用投放ROI评估机制，每一分钱花在刀刃上。', measure: '费效比优化至12%以内', tag: '财务' },
      { text: '供应链与运营成本精益化：优化仓储物流布局，提升车辆满载率，降低单箱物流成本。', measure: '单箱物流成本降低0.2元', tag: '运营' },
      { text: '运营费用管控与效率提升：推行无纸化办公、节能降耗，严控行政差旅等非业务性支出。', measure: '管理费用率下降1%', tag: '管理' },
      { text: '厂家返利政策研究与最大化获取：吃透厂家返利政策，通过精准达成各项指标，拿满厂家返利。', measure: '厂家返利获取率100%', tag: '财务' }
    ]
  }
];
