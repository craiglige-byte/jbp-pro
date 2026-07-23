import React, { useState, useEffect, useCallback } from 'react';
import { JBPData, WizardStep, PlanVersion } from './types';
import StepWizard from './components/StepWizard';
import InfoStep from './components/InfoStep';
import BusinessReviewStep from './components/BusinessReviewStep';
import ObjectiveStep from './components/ObjectiveStep';
import StrategyStep from './components/StrategyStep';
import ActionStep from './components/ActionStep';
import BudgetStep from './components/BudgetStep';
import ReviewStep from './components/ReviewStep';
import { Briefcase, Save, RotateCcw } from 'lucide-react';
import DEMO_DATA from './demoData';

// LocalStorage key for saving form data
const STORAGE_KEY = 'jbp_pro_form_data';
const STORAGE_TIMESTAMP_KEY = 'jbp_pro_last_saved';

// Detect plan version: from window global, URL path, query param, or default to 'large'
function detectPlanVersion(): PlanVersion {
  if (typeof window === 'undefined') return 'large';
  // 1. Check window global (set by standalone HTML wrapper)
  if ((window as any).JBP_PLAN_VERSION) {
    return (window as any).JBP_PLAN_VERSION === 'small' ? 'small' : 'large';
  }
  // 2. Check URL path: /small → small, /large → large
  const path = window.location.pathname.replace(/\/+$/, ''); // strip trailing slash
  if (path === '/small') return 'small';
  if (path === '/large') return 'large';
  // 3. Check URL query parameter (backward compatible)
  const params = new URLSearchParams(window.location.search);
  if (params.get('version') === 'small') return 'small';
  // 4. Default to large
  return 'large';
}

// Step definitions for each version
const STEPS_LARGE: WizardStep[] = ['info', 'business_review', 'objectives', 'strategies', 'actions', 'budget', 'review'];
const STEPS_SMALL: WizardStep[] = ['info', 'business_review', 'objectives', 'strategies', 'budget', 'review'];

const STEP_LABELS: Record<WizardStep, string> = {
  info: '基本信息',
  business_review: '经营回顾',
  objectives: '设定目标 (G)',
  strategies: '拆解策略(S&M)',
  actions: '落实行动(T)',
  budget: '规划预算(Budget)',
  review: '预览计划',
};

const STEP_CODES: Record<WizardStep, string> = {
  info: 'Info',
  business_review: 'Review',
  objectives: 'Goals',
  strategies: 'Strat',
  actions: 'Tactics',
  budget: 'Budget',
  review: 'Preview',
};

function getStepsForVersion(version: PlanVersion): WizardStep[] {
  return version === 'small' ? STEPS_SMALL : STEPS_LARGE;
}

const INITIAL_DATA: JBPData = {
  distributorName: '[示例]小黄鸭商贸有限公司',
  managerName: '张三',
  period: '2027 FY',
  contractType: '',
  contractDetail: '',
  selectedRelatedCustomers: [],
  authorizedRegions: [],
  authorizationConfirmed: false,
  authorizationPolygons: [],
  objectives: [
    {
      id: 'obj_1',
      title: '达成进货承诺',
      targetValue: '',
      strategies: []
    },
    {
      id: 'obj_2',
      title: '实现销售目标',
      targetValue: '',
      strategies: []
    },
    {
      id: 'obj_3',
      title: '守住库存健康',
      targetValue: '',
      strategies: []
    },
    {
      id: 'obj_4',
      title: '提升盈利能力',
      targetValue: '',
      strategies: []
    }
  ],
  issues: [],
  opportunities: [],
  operations: {
      warehouse: 1200,
      vehicles: [
          { id: 'v1', name: '元气车辆', count: 25 }
      ],
      personnel: [
          { id: 'p1', name: '客户团队人数', count: 8 },
          { id: 'p2', name: '业务人员', count: 15 },
          { id: 'p3', name: '管理人员', count: 3 },
          { id: 'p4', name: '文职人员', count: 2 },
          { id: 'p5', name: '后勤人员', count: 5 }
      ],
      capital: [
          { id: 'c1', name: '常态库存资金', amount: 200 },
          { id: 'c2', name: '市场垫资', amount: 50 },
          { id: 'c3', name: '信贷保证金', amount: 20 }
      ]
  },
  performance: {
      sellIn: 1280,
      sellOut: 1150,
      coverage: 892,
      distribution: 85,
      coolers: 450,
      efficiency: 120,
      profit: 180,
      profitMargin: 14,
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
  trends: [
    { month: '12月', inventory: 12500, days: 40, sellIn: 92, sellOut: 85 },
    { month: '1月', inventory: 15800, days: 25, sellIn: 135, sellOut: 142 },
    { month: '2月', inventory: 9500, days: 48, sellIn: 55, sellOut: 70 },
    { month: '3月', inventory: 10500, days: 42, sellIn: 85, sellOut: 82 },
    { month: '4月', inventory: 12000, days: 38, sellIn: 95, sellOut: 90 },
    { month: '5月', inventory: 13500, days: 34, sellIn: 108, sellOut: 102 },
    { month: '6月', inventory: 16000, days: 29, sellIn: 128, sellOut: 125 },
    { month: '7月', inventory: 15000, days: 24, sellIn: 115, sellOut: 135 },
    { month: '8月', inventory: 12500, days: 22, sellIn: 90, sellOut: 120 },
    { month: '9月', inventory: 16500, days: 30, sellIn: 138, sellOut: 105 },
    { month: '10月', inventory: 14500, days: 35, sellIn: 85, sellOut: 92 },
    { month: '11月', inventory: 11500, days: 45, sellIn: 75, sellOut: 70 },
  ],
  productCategories: [
    { id: '1', name: '电解质水', color: '#3b82f6', sales: 450, growth: 18, profitMargin: 15 },
    { id: '2', name: '气泡水', color: '#10b981', sales: 320, growth: 12, profitMargin: 12 },
    { id: '3', name: '冰茶', color: '#f59e0b', sales: 280, growth: 8, profitMargin: 10 },
    { id: '4', name: '维生素水', color: '#8b5cf6', sales: 180, growth: 25, profitMargin: 18 },
    { id: '5', name: '好自在水', color: '#64748b', sales: 120, growth: 35, profitMargin: 20 },
    { id: '6', name: '其他', color: '#9ca3af', sales: 50, growth: 5, profitMargin: 8 },
  ],
  customerAnalysis: {
    segments: [
      {
        type: 'S',
        label: '战略客户 (Class S)',
        criteria: '年销>30万 或 利润>5万',
        count: 8,
        salesShare: 28,
        profitShare: 35,
        customers: [
          { id: 's1', name: '好邻居连锁超市', sales: 320000, profit: 58000, growth: 15 },
          { id: 's2', name: '大学城商圈', sales: 280000, profit: 52000, growth: 22 },
          { id: 's3', name: '市中心购物广场', sales: 250000, profit: 48000, growth: 18 },
          { id: 's4', name: '高铁站商业区', sales: 220000, profit: 42000, growth: 25 }
        ]
      },
      {
        type: 'A',
        label: '核心客户 (Class A)',
        criteria: '年销10-30万',
        count: 37,
        salesShare: 37,
        profitShare: 35,
        customers: [
          { id: 'a1', name: '好邻居超市', sales: 150000, profit: 35000, growth: 12 },
          { id: 'a2', name: '旺旺批发部', sales: 120000, profit: 28000, growth: 8 },
          { id: 'a3', name: '阳光便利', sales: 110000, profit: 25000, growth: 15 },
          { id: 'a4', name: '大学城生活超市', sales: 105000, profit: 22000, growth: 20 },
          { id: 'a5', name: '滨江路便利店', sales: 102000, profit: 21000, growth: 10 }
        ]
      },
      {
        type: 'B',
        label: '成长客户 (Class B)',
        criteria: '年销3-10万',
        count: 120,
        salesShare: 25,
        profitShare: 20,
        customers: [
          { id: 'b1', name: '老张便利店', sales: 80000, profit: 15000, growth: 5 },
          { id: 'b2', name: '小李杂货铺', sales: 60000, profit: 12000, growth: 2 },
          { id: 'b3', name: '社区便民店', sales: 50000, profit: 10000, growth: 8 },
          { id: 'b4', name: '学校小卖部', sales: 45000, profit: 9000, growth: 12 },
          { id: 'b5', name: '公园便利亭', sales: 35000, profit: 7000, growth: -5 }
        ]
      },
      {
        type: 'C',
        label: '长尾客户 (Class C)',
        criteria: '年销1-3万',
        count: 200,
        salesShare: 7,
        profitShare: 7,
        customers: [
          { id: 'c1', name: '路边摊', sales: 15000, profit: 3000, growth: -10 },
          { id: 'c2', name: '报刊亭', sales: 12000, profit: 2500, growth: -5 },
          { id: 'c3', name: '小型杂货店', sales: 10000, profit: 2000, growth: 0 },
          { id: 'c4', name: '流动摊贩', sales: 8000, profit: 1500, growth: -15 },
          { id: 'c5', name: '临时售卖点', sales: 5000, profit: 1000, growth: -20 }
        ]
      },
      {
        type: 'other',
        label: '其他客户',
        criteria: '年销<1万 | 零散客户',
        count: 85,
        salesShare: 3,
        profitShare: 3,
        customers: [
          { id: 'o1', name: '社区团购点', sales: 8000, profit: 1200, growth: 5 },
          { id: 'o2', name: '夜市摊位A', sales: 5000, profit: 800, growth: -3 }
        ]
      },
      {
        type: 'empty',
        label: '空白市场',
        criteria: '暂无有效覆盖',
        count: 0,
        salesShare: 0,
        profitShare: 0,
        customers: []
      }
    ],
    insights: [
      { id: '1', type: 'strength', label: '核心稳固', description: 'A类客户合作稳定，主要贡献来源', customerList: '好邻居超市, 旺旺批发部, 阳光便利' },
      { id: '2', type: 'potential', label: '潜力挖掘', description: 'B类中有15家具备升级A类潜力', customerList: '大学城生活超市, 滨江路便利店' },
      { id: '3', type: 'risk', label: '服务缺失', description: 'C类客户拜访频率过低，竞品渗透严重', customerList: '老城区杂货店群' }
    ]
  },
  marketStats: {
    population: '245 万',
    gdp: '¥380.2 亿',
    perCapitaConsumption: '42.5 升/年'
  },
  competitors: [
    { id: 'c1', name: '农夫山泉', abbr: 'NF', target: '¥420万', achievement: 92, outlets: 1200 },
    { id: 'c2', name: '怡宝', abbr: 'MD', target: '¥180万', achievement: 85, outlets: 850 },
    { id: 'c3', name: '康师傅', abbr: 'KS', target: '¥250万', achievement: 78, outlets: 920 }
  ]
};

const App: React.FC = () => {
  // Initialize state from localStorage or use default data
  const [data, setData] = useState<JBPData>(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log('✅ 已从本地存储恢复数据');
        return { ...INITIAL_DATA, ...parsed };
      }
    } catch (error) {
      console.error('❌ 从本地存储恢复数据失败:', error);
    }
    // 无本地存储时加载演示参考案例
    console.log('✅ 已加载演示参考案例数据');
    return DEMO_DATA;
  });
  
  const [currentStep, setCurrentStep] = useState<WizardStep>(() => {
    // 1. Check window global (set by standalone HTML to start at specific step)
    if (typeof window !== 'undefined' && (window as any).JBP_START_STEP) {
      const step = (window as any).JBP_START_STEP;
      if (['info','business_review','objectives','strategies','actions','budget','review'].includes(step)) {
        return step as WizardStep;
      }
    }
    // 2. Check localStorage
    try {
      const savedStep = localStorage.getItem('jbp_pro_current_step');
      return savedStep ? (JSON.parse(savedStep) as WizardStep) : 'info';
    } catch {
      return 'info';
    }
  });

  const [planVersion] = useState<PlanVersion>(detectPlanVersion);
  const steps = getStepsForVersion(planVersion);

  // 动态设置页面标题，区分大/小版本
  useEffect(() => {
    document.title = planVersion === 'small'
      ? 'JBP Pro - 联合生意规划助手 (＜500万)'
      : 'JBP Pro - 联合生意规划助手 (≥500万)';
  }, [planVersion]);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [lastSaved, setLastSaved] = useState<string>(() => {
    const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    return timestamp ? new Date(parseInt(timestamp)).toLocaleString('zh-CN') : '';
  });

  // Auto-save data to localStorage whenever it changes
  useEffect(() => {
    const saveData = () => {
      try {
        setSaveStatus('saving');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem('jbp_pro_current_step', JSON.stringify(currentStep));
        const now = Date.now();
        localStorage.setItem(STORAGE_TIMESTAMP_KEY, now.toString());
        setLastSaved(new Date(now).toLocaleString('zh-CN'));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('❌ 保存数据失败:', error);
        setSaveStatus('idle');
      }
    };

    // Debounce save to avoid too frequent writes
    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [data, currentStep]);

  const updateData = (updates: Partial<JBPData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const navigateTo = (step: WizardStep) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentStep(step);
  };

  // Reset to default data but keep saved
  const resetToDefault = () => {
    if (window.confirm('确定要重置为默认数据吗？当前数据将被覆盖。')) {
      setData(INITIAL_DATA);
      setCurrentStep('info');
    }
  };

  // 检查策略步骤是否完成
  const isStrategyStepComplete = (): boolean => {
    if (!data.objectives || data.objectives.length === 0) return false;
    
    for (const obj of data.objectives) {
      const isSpecial = ['达成进货承诺', '实现销售目标', '守住库存健康', '提升盈利能力'].includes(obj.title);
      
      // 检查目标拆解
      if (isSpecial) {
        if (obj.title === '达成进货承诺' && !obj.purchasePlan) return false;
        if (obj.title === '实现销售目标' && !obj.salesPlan) return false;
        if (obj.title === '守住库存健康' && !obj.inventoryPlan) return false;
        if (obj.title === '提升盈利能力' && !obj.profitabilityPlan) return false;
      } else {
        if (!obj.keyResults || obj.keyResults.length === 0) return false;
      }
      
      // 检查策略和衡量标准
      if (!obj.strategies || obj.strategies.length === 0) return false;
      const allStrategiesComplete = obj.strategies.every(
        (s: any) => s.text?.trim()
      );
      if (!allStrategiesComplete) return false;
    }
    
    return true;
  };

  // 检查行动步骤是否完成
  const isActionStepComplete = (): boolean => {
    if (!data.objectives || data.objectives.length === 0) return false;
    
    // 检查每个策略是否都有行动项，且每个行动项字段完整
    for (const obj of data.objectives) {
      if (!obj.strategies || obj.strategies.length === 0) return false;
      
      for (const strat of obj.strategies) {
        if (!strat.actions || strat.actions.length === 0) {
          return false;
        }
        // 检查每个行动项的字段是否完整
        for (const action of strat.actions) {
          const hasTitle = !!(action.title && action.title.trim());
          const hasContent = !!(action.content && action.content.trim()) || !!(action.text && action.text.trim());
          const hasOwners = !!(action.owners && action.owners.length > 0);
          const hasDeadline = !!(action.deadline && action.deadline.trim());
          
          if (!hasTitle || !hasContent || !hasOwners || !hasDeadline) {
            return false;
          }
        }
      }
    }
    
    return true;
  };

  // Logic to determine if a step is accessible
  const canNavigate = (target: WizardStep): boolean => {
    const targetIdx = steps.indexOf(target);
    const currentIdx = steps.indexOf(currentStep);

    // Can always go back
    if (targetIdx < currentIdx) return true;

    // Validate forward navigation (same for both versions)
    if (target === 'info') return true;
    if (target === 'business_review') return data.distributorName !== '' && data.managerName !== '';
    if (target === 'objectives') return data.distributorName !== '' && data.managerName !== '';
    if (target === 'strategies') return data.objectives.length > 0;
    // Small version: no actions step, strategies → budget directly
    if (target === 'actions') return isStrategyStepComplete();
    if (target === 'budget') {
      return planVersion === 'small' ? isStrategyStepComplete() : isActionStepComplete();
    }
    if (target === 'review') {
      return planVersion === 'small' ? isStrategyStepComplete() : isActionStepComplete();
    }

    return false;
  };

  // 只读预览模式：window 全局 或 URL 参数 ?demo=1，数据锁定为参考案例
  const isReadonly = typeof window !== 'undefined' && (
    !!(window as any).JBP_READONLY ||
    new URLSearchParams(window.location.search).get('demo') === '1'
  );

  if (isReadonly) {
    return (
      <div className="min-h-screen font-sans bg-slate-50 text-slate-900 print:bg-white">
        <ReviewStep data={DEMO_DATA} onBack={() => {}} planVersion={planVersion} readOnly />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">

      {/* App Header + StepWizard - combined sticky */}
      <div className="sticky top-0 z-30">
      <header className="bg-white border-b border-slate-200 py-1.5 px-6 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 text-brand-700">
            <div className="bg-brand-600 text-white p-1 rounded-md">
               <Briefcase size={16} />
            </div>
            <span className="font-bold text-base tracking-tight">JBP Pro</span>
            <span className="text-slate-400 text-xs font-normal ml-2">| 联合生意规划助手{planVersion === 'small' ? '（＜500万版本）' : '（≥500万版本）'}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Save Status Indicator */}
            <div className="flex items-center space-x-2 text-sm">
              {saveStatus === 'saving' && (
                <div className="flex items-center text-amber-600">
                  <div className="animate-spin h-3 w-3 border-2 border-amber-600 border-t-transparent rounded-full mr-1.5"></div>
                  <span>保存中...</span>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center text-green-600">
                  <Save size={14} className="mr-1" />
                  <span>已保存</span>
                </div>
              )}
              {saveStatus === 'idle' && lastSaved && (
                <div className="text-slate-400">
                  上次保存: {lastSaved}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
              <button
                onClick={resetToDefault}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                title="重置为默认数据"
              >
                <RotateCcw size={14} />
                <span>重置</span>
              </button>
            </div>
            
            <div className="text-sm text-slate-500 border-l border-slate-200 pl-4">
               {data.distributorName || '未命名项目'}
            </div>
          </div>
        </div>
      </header>

        <StepWizard
          currentStep={currentStep}
          setStep={navigateTo}
          canNavigate={canNavigate}
          steps={steps.map(s => ({
            id: s,
            label: (s === 'strategies' && planVersion === 'small') ? '拆解目标' : STEP_LABELS[s],
            code: STEP_CODES[s]
          }))}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col">
        <div className={`flex-grow w-full mx-auto transition-all duration-300 ${
            currentStep === 'calendar' 
              ? 'max-w-[98vw] px-2 md:px-4 py-4' 
              : 'max-w-7xl p-4 md:p-8'
          }`}>
          {currentStep === 'info' && (
            <InfoStep
              data={data}
              updateData={updateData}
              onNext={() => navigateTo('business_review')}
              onNavigateToMap={() => navigateTo('objectives')}
              planVersion={planVersion}
            />
          )}

          {currentStep === 'business_review' && (
            <BusinessReviewStep 
              data={data} 
              updateData={updateData}
              onNext={() => navigateTo('objectives')}
              onBack={() => navigateTo('info')}
            />
          )}

          {currentStep === 'objectives' && (
            <ObjectiveStep 
              data={data} 
              updateData={updateData} 
              onNext={() => navigateTo('strategies')}
              onBack={() => navigateTo('business_review')}
            />
          )}

          {currentStep === 'strategies' && (
            <StrategyStep
              data={data}
              updateData={updateData}
              onNext={() => navigateTo(planVersion === 'small' ? 'budget' : 'actions')}
              onBack={() => navigateTo('objectives')}
              planVersion={planVersion}
            />
          )}

          {currentStep === 'actions' && planVersion === 'large' && (
            <ActionStep
              data={data}
              updateData={updateData}
              onNext={() => navigateTo('budget')}
              onBack={() => navigateTo('strategies')}
            />
          )}

          {currentStep === 'budget' && (
            <BudgetStep
              data={data}
              updateData={updateData}
              onNext={() => navigateTo('review')}
              onBack={() => navigateTo(planVersion === 'small' ? 'strategies' : 'actions')}
            />
          )}

          {currentStep === 'review' && (
            <ReviewStep
              data={data}
              onBack={() => navigateTo('budget')}
              planVersion={planVersion}
            />
          )}
        </div>
      </main>

    </div>
  );
};

export default App;