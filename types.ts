export type WizardStep = 'info' | 'business_review' | 'objectives' | 'strategies' | 'actions' | 'budget' | 'review';
export type PlanVersion = 'large' | 'small';

export type ContractType = 'renewal' | 'new' | '';
export type ContractDetailType = '' |
  // 老客户续约选项
  'same_scope' | 'expand_scope' | 'reduce_scope' | 'new_scope' |
  // 新客户签约选项
  'takeover_full' | 'takeover_partial' | 'takeover_merged' | 'new_area';

// 需要选择相关客户的签约类型
export type TakeoverType = 'takeover_full' | 'takeover_partial' | 'takeover_merged';

export interface OriginalCustomer {
  id: string;
  name: string;
}

// 授权区域类型
export interface AuthorizationRegion {
  code: string;
  name: string;
}

// 省级行政区域数据
export const CHINA_PROVINCES: AuthorizationRegion[] = [
  { code: '110000', name: '北京市' },
  { code: '120000', name: '天津市' },
  { code: '130000', name: '河北省' },
  { code: '140000', name: '山西省' },
  { code: '150000', name: '内蒙古自治区' },
  { code: '210000', name: '辽宁省' },
  { code: '220000', name: '吉林省' },
  { code: '230000', name: '黑龙江省' },
  { code: '310000', name: '上海市' },
  { code: '320000', name: '江苏省' },
  { code: '330000', name: '浙江省' },
  { code: '340000', name: '安徽省' },
  { code: '350000', name: '福建省' },
  { code: '360000', name: '江西省' },
  { code: '370000', name: '山东省' },
  { code: '410000', name: '河南省' },
  { code: '420000', name: '湖北省' },
  { code: '430000', name: '湖南省' },
  { code: '440000', name: '广东省' },
  { code: '450000', name: '广西壮族自治区' },
  { code: '460000', name: '海南省' },
  { code: '500000', name: '重庆市' },
  { code: '510000', name: '四川省' },
  { code: '520000', name: '贵州省' },
  { code: '530000', name: '云南省' },
  { code: '540000', name: '西藏自治区' },
  { code: '610000', name: '陕西省' },
  { code: '620000', name: '甘肃省' },
  { code: '630000', name: '青海省' },
  { code: '640000', name: '宁夏回族自治区' },
  { code: '650000', name: '新疆维吾尔自治区' },
  { code: '710000', name: '台湾省' },
  { code: '810000', name: '香港特别行政区' },
  { code: '820000', name: '澳门特别行政区' }
];

export interface JBPData {
  distributorName: string;
  managerName: string;
  period: string;
  contractType: ContractType;
  contractDetail: ContractDetailType;
  selectedRelatedCustomers: string[];  // 存储选中的相关客户ID列表
  authorizedRegions: string[];  // 存储授权的区域code列表
  authorizationConfirmed: boolean;  // 是否已确认授权范围
  authorizationPolygons: any[];  // 地图多边形数据（序列化保存）

  // Business Review Data
  performance: {
    sellIn: number;
    sellOut: number;
    coverage: number;
    distribution: number;
    coolers: number;
    efficiency: number;
    profit: number;
    profitMargin: number;
    investment: number;
    roi: number;
  };
  operations: {
    warehouse: number;
    vehicles: { id: string; name: string; count: number }[];
    personnel: { id: string; name: string; count: number }[];
    capital: { id: string; name: string; amount: number }[];
  };
  marketStats: {
    population: string;
    gdp: string;
    perCapitaConsumption: string;
  };
  competitors: { id: string; name: string; abbr: string; target: string; achievement: number; outlets: number }[];
  trends: JBPTrend[];
  issues: JBPIssue[];
  opportunities: JBPOpportunity[];

  // GSMT Data
  objectives: JBPObjective[];

  // Budget Data
  detailedBudgetPlan?: JBPDetailedBudgetPlan;

  // Product Categories
  productCategories: JBPProductCategory[];

  // Customer Analysis
  customerAnalysis?: JBPCustomerAnalysis;

  // Channel Analysis
  channelAnalysis?: JBPChannelAnalysis[];

  // Team Analysis
  teamAnalysis?: JBPTeamAnalysis[];
}

export interface JBPTrend {
  month: string;
  inventory: number;
  days: number;
  sellIn: number;
  sellOut: number;
}

export interface JBPIssue {
  id: string;
  title: string;
  description: string;
}

export interface JBPOpportunity {
  id: string;
  title: string;
  description: string;
  tag: string;
}

export interface JBPCustomerAnalysis {
  segments: JBPCustomerSegment[];
  insights?: JBPCustomerInsight[];
}

export interface JBPCustomerSegment {
  type: string;
  label: string;
  criteria: string;
  count: number;
  salesShare: number;
  profitShare: number;
  customers?: JBPCustomer[];
}

export interface JBPCustomer {
  id: string;
  name: string;
  sales: number;
  profit: number;
  growth: number;
}

export interface JBPCustomerInsight {
  id: string;
  type: string;
  label: string;
  description: string;
  customerList?: string;
}

export interface JBPProductCategory {
  id: string;
  name: string;
  color: string;
  sales: number;
  growth: number;
  profitMargin: number;
}

export interface JBPObjective {
  id: string;
  title: string;
  targetValue: string;
  metric?: string;
  strategies: JBPStrategy[];
  keyResults?: JBPKeyResult[];
  monthlyTargets?: Record<string, number>;
  lastYearMonthlyTargets?: Record<string, number>;

  // Breakdown Plans
  purchasePlan?: JBPPurchasePlan;
  salesPlan?: JBPSalesPlan;
  inventoryPlan?: JBPInventoryPlan;
  profitabilityPlan?: JBPProfitabilityPlan;
  breakdownItems?: any[];
  channelBreakdownItems?: any[];
  personnelBreakdownItems?: any[];
}

export interface JBPKeyResult {
  id: string;
  text: string;
  target: string;
}

export interface JBPStrategy {
  id: string;
  text: string;
  measure: string;
  contribution?: string;
  actions: JBPAction[];
  suggestedActions?: string[]; // For UI suggestions
  tag?: string;
}

export interface JBPAction {
  id: string;
  title?: string;
  text: string;
  content?: string;
  owners: string[]; // Changed from owner: string
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  startMonth?: string;
  endMonth?: string;
  scheduledMonth?: string;
}

export interface TemplateStrategy {
  text: string;
  measure: string;
  tag?: string;
}

// --- Breakdown Plan Types ---

// Purchase Plan
export interface JBPPurchasePlan {
  categorySplit: { id: string; name: string; ratio: number; amount: number }[];
  quarterSplit: { id: string; name: string; ratio: number; amount: number }[];
  quarterlyCategorySplit?: Record<string, Record<string, { ratio: number; amount: number }>>;
  monthlyWeights?: Record<string, Record<string, number>>;
  monthlyData: Record<string, JBPMonthlyPlan>;
}

export interface JBPMonthlyPlan {
  scenario: string;
  logic: string;
  ratio: number;
  total: number;
  categoryValues: Record<string, number | string>;
}

// Sales Plan
export interface JBPSalesPlan {
  timeBreakdown: JBPSalesTimeBreakdown[];
  personnelBreakdown: JBPSalesPersonnelBreakdown[];
  monthlyAreaTargets: Record<string, Record<string, number>>; // MonthID -> AreaID -> Target
}

export interface JBPSalesTimeBreakdown {
  id: string;
  label: string;
  type: 'month' | 'quarter';
  lastYearActuals: number;
  lastYearRatio: number;
  scenario: string;
  thisYearRatio: number;
  thisYearTarget: number;
}

export interface JBPSalesPersonnelBreakdown {
  id: string;
  area: string;
  lastYearManager: string;
  lastYearActuals: number;
  lastYearRatio: number;
  scenario: string;
  thisYearRatio: number;
  thisYearTarget: number;
  thisYearManager: string;
}

// Inventory Plan
export interface JBPInventoryPlan {
  categorySettings: JBPInventoryCategorySetting[];
  monthlyPlan: JBPInventoryMonthlyData[];
}

export interface JBPInventoryCategorySetting {
  categoryId: string;
  categoryName: string;
  turnoverDays: number;
  ratio: number;
  reason: string;
}

export interface JBPInventoryMonthlyData {
  monthId: string;
  scenario: string;
  salesRatio: number;
  nextMonthSalesTarget: number;
  categoryValues: Record<string, number>;
  total: number;
}

// Profitability Plan
export interface JBPProfitabilityPlan {
  salesRevenue: number;
  rebateRevenue: number;
  cogs: number;
  targetProfitMargin: number;
  targetNetProfit: number;
  maxOperatingExpenses: number;
  expenses: JBPExpenseCategory[];
  totalOperatingExpenses: number;
}

export interface JBPExpenseCategory {
  id: string;
  name: string;
  items: JBPExpenseItem[];
}

export interface JBPExpenseItem {
  id: string;
  name: string;
  lastYearRatio: number;
  lastYearActual: number;
  thisYearTarget: number;
  thisYearRatio: number;
  strategy: string;
}

export interface JBPWarehouseBudget {
  id: string;
  type: string;
  area: number;
  brandRatio: number;
  brandArea: number;
  monthlyRent: number;
  yearlyRent: number;
  brandYearlyRent: number;
  remark: string;
}

export interface JBPVehicleBudget {
  id: string;
  model: string;
  type: string;
  count: number;
  dailyCapacity: number;
  yearlyCost: number;
  brandRatio: number;
  brandYearlyCost: number;
  remark: string;
}

export interface JBPPersonnelBudget {
  id: string;
  role: string;
  count: number;
  monthlyBaseSalary: number;
  yearlyBaseSalary: number;
  yearlySocialSecurity: number;
  yearlyFixedCost: number;
  yearlyBonus: number;
  yearlyTotalCost: number; // Includes bonus/insurance
  brandRatio: number;
  brandYearlyCost: number;
  remark: string;
}

export interface JBPMarketingBudget {
  id: string;
  item: string;
  distributorAmount: number;
  totalAmount: number;
  ratio: number;
  manufacturerRatio: number;
  manufacturerAmount: number;
  remark: string;
}

export interface JBPCapitalBudget {
  id: string;
  item: string;
  amount: number;
  brandRatio: number;
  brandAmount: number;
  remark: string;
}

// Budget Plan (Detailed)
export interface JBPDetailedBudgetPlan {
  warehouse: JBPWarehouseBudget[];
  vehicles: JBPVehicleBudget[];
  personnel: JBPPersonnelBudget[];
  marketing: JBPMarketingBudget[];
  capital: JBPCapitalBudget[];
}

export interface JBPChannelAnalysis {
  id: string;
  name: string;
  sales: number;
  growth: number;
  profitMargin: number;
  contribution: number;
}

export interface JBPTeamAnalysis {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'resigned';
  sales: number;
  growth: number;
  profitMargin: number;
  contribution: number;
}
