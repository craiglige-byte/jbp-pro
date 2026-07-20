import React, { useState, useEffect, useMemo } from 'react';
import { JBPObjective, JBPProfitabilityPlan, JBPExpenseCategory, JBPExpenseItem } from '../types';
import { X, Check, Calculator, AlertCircle, ArrowRight, TrendingUp, DollarSign } from 'lucide-react';

interface ProfitabilityBreakdownWizardProps {
  objective: JBPObjective;
  salesTarget: number;
  purchaseTarget: number;
  onSave: (plan: JBPProfitabilityPlan) => void;
  onCancel: () => void;
}

const EXPENSE_CATEGORIES_TEMPLATE = [
  {
    id: 'personnel',
    name: '人员费用',
    items: [
      { id: 'sales_comm', name: '销售提成', lastYearRatio: 3.3, lastYearActual: 25.0 },
      { id: 'mgmt_salary', name: '管理人员工资', lastYearRatio: 2.6, lastYearActual: 20.0 },
      { id: 'driver_salary', name: '司机/仓管/文员工资', lastYearRatio: 2.0, lastYearActual: 15.0 },
    ]
  },
  {
    id: 'warehouse',
    name: '仓储车辆',
    items: [
      { id: 'rent', name: '仓库租金', lastYearRatio: 1.6, lastYearActual: 12.0 },
      { id: 'loading', name: '装卸费', lastYearRatio: 1.0, lastYearActual: 8.0 },
      { id: 'fuel', name: '油费/维修/保险/违章', lastYearRatio: 1.3, lastYearActual: 10.0 },
      { id: 'wh_ops', name: '仓库运维保险/设备', lastYearRatio: 0.5, lastYearActual: 4.0 },
    ]
  },
  {
    id: 'marketing',
    name: '营销费用',
    items: [
      { id: 'display', name: '陈列费', lastYearRatio: 1.0, lastYearActual: 8.0 },
      { id: 'channel_promo', name: '渠道促销费', lastYearRatio: 1.6, lastYearActual: 12.0 },
      { id: 'terminal_promo', name: '终端促销费', lastYearRatio: 0.8, lastYearActual: 6.0 },
      { id: 'consumer_promo', name: '消费者促销费', lastYearRatio: 0.7, lastYearActual: 5.0 },
      { id: 'marketing_other', name: '其他', lastYearRatio: 0.2, lastYearActual: 1.5 },
    ]
  },
  {
    id: 'admin',
    name: '行政办公',
    items: [
      { id: 'office_rent', name: '办公室租金/水电', lastYearRatio: 0.8, lastYearActual: 6.0 },
      { id: 'supplies', name: '办公耗材/通讯', lastYearRatio: 0.5, lastYearActual: 4.0 },
    ]
  },
  {
    id: 'finance',
    name: '财务及其他',
    items: [
      { id: 'interest', name: '贷款利息', lastYearRatio: 0.4, lastYearActual: 3.0 },
      { id: 'tax', name: '税金', lastYearRatio: 0.2, lastYearActual: 1.5 },
      { id: 'fine_only', name: '罚款', lastYearRatio: 0.05, lastYearActual: 0.3 },
      { id: 'finance_other', name: '其他', lastYearRatio: 0.05, lastYearActual: 0.2 },
    ]
  }
];

export const ProfitabilityBreakdownWizard: React.FC<ProfitabilityBreakdownWizardProps> = ({
  objective,
  salesTarget,
  purchaseTarget,
  onSave,
  onCancel
}) => {
  const [step, setStep] = useState(1);

  // Track raw input strings for decimal inputs (allow intermediate states like "38.")
  const [lastYearInputs, setLastYearInputs] = useState<Record<string, string>>({});
  const [planInputs, setPlanInputs] = useState<Record<string, string>>({});
  const [expenseInputs, setExpenseInputs] = useState<Record<string, string>>({});

  /** Filter input to: non-negative, digits + one dot, max 2 decimal places, truncate (not round) */
  const filterDecimal = (val: string): string => {
    let cleaned = val.replace(/[^\d.]/g, '');
    const dotIndex = cleaned.indexOf('.');
    if (dotIndex !== -1) {
      cleaned = cleaned.substring(0, dotIndex + 1) + cleaned.substring(dotIndex + 1).replace(/\./g, '');
    }
    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1 && cleaned.length - firstDot - 1 > 2) {
      cleaned = cleaned.substring(0, firstDot + 3);
    }
    return cleaned;
  };

  /** Convert filtered string to number for state storage */
  const filteredToNumber = (filtered: string): number => {
    if (filtered === '' || filtered === '.') return 0;
    const num = parseFloat(filtered);
    return isNaN(num) ? 0 : num;
  };

  // State for Last Year's Actuals (2025) - Editable in Step 1
  const [lastYearValues, setLastYearValues] = useState({
    sales: 750.0,
    rebate: 15.0,
    cogs: 600.0,
    opEx: 130.0
  });
  
  // Parse target profit margin from objective target value
  const defaultProfitMargin = useMemo(() => {
    const match = objective.targetValue.match(/(\d+(\.\d+)?)%/);
    return match ? parseFloat(match[1]) : 7.0; // Default to 7% if not found
  }, [objective.targetValue]);

  const [plan, setPlan] = useState<JBPProfitabilityPlan>(() => {
    if (objective.profitabilityPlan) {
      return JSON.parse(JSON.stringify(objective.profitabilityPlan));
    }
    
    // Initialize with defaults
    const salesRevenue = parseFloat(salesTarget.toFixed(1));
    const rebateRevenue = parseFloat((salesTarget * 0.03).toFixed(1)); // Default 3%
    const cogs = parseFloat(purchaseTarget.toFixed(1)); // Default to purchase target
    
    const totalRevenue = salesRevenue + rebateRevenue;
    const targetNetProfit = parseFloat((totalRevenue * (defaultProfitMargin / 100)).toFixed(1));
    const maxOperatingExpenses = parseFloat((totalRevenue - cogs - targetNetProfit).toFixed(1));

    // Calculate total last year expenses from template
    const totalLastYearOpEx = EXPENSE_CATEGORIES_TEMPLATE.reduce((sum, cat) => 
        sum + cat.items.reduce((s, i) => s + i.lastYearActual, 0), 0);
    
    const allocationRatio = totalLastYearOpEx > 0 ? maxOperatingExpenses / totalLastYearOpEx : 1;

    // Default strategies based on item ID
    const getDefaultStrategy = (id: string, ratio: number) => {
        if (ratio < 1) return '降本增效，严格控制预算';
        if (id === 'sales_comm') return '与销量挂钩，多劳多得';
        if (id === 'channel_promo') return '聚焦核心网点，提升费效比';
        if (id === 'consumer_promo') return '精准投入，拉动终端动销';
        return '按需投入，保障运营';
    };

    // Initialize expenses based on template
    let currentTotalOpEx = 0;
    const expenses = EXPENSE_CATEGORIES_TEMPLATE.map(cat => ({
      ...cat,
      items: cat.items.map(item => {
        const target = parseFloat((item.lastYearActual * allocationRatio).toFixed(1));
        const ratio = totalRevenue > 0 ? parseFloat(((target / totalRevenue) * 100).toFixed(1)) : 0;
        currentTotalOpEx += target;
        return {
            ...item,
            thisYearTarget: target, // Allocate budget
            thisYearRatio: ratio,
            strategy: getDefaultStrategy(item.id, allocationRatio)
        };
      })
    }));

    return {
      salesRevenue,
      rebateRevenue,
      cogs,
      targetProfitMargin: defaultProfitMargin,
      targetNetProfit,
      maxOperatingExpenses,
      expenses,
      totalOperatingExpenses: parseFloat(currentTotalOpEx.toFixed(1))
    };
  });

  // Recalculate derived values when inputs change
  // Removed backward calculation useEffect. Forward logic is handled in handleStep1Change.
  // We only need an effect to update Expense Ratios if Revenue changes, but we can do that in handler too.
  // Or keep a simple effect for ratios? Let's do it in handler for clarity and to avoid loops.

  // Handler for Step 1 Inputs
  const handleStep1Change = (field: keyof JBPProfitabilityPlan, value: string) => {
    const numVal = parseFloat(value) || 0;
    setPlan(prev => {
      const newPlan = { ...prev, [field]: numVal };
      
      // Forward Calculation:
      // 1. Calculate Total Revenue
      const totalRevenue = newPlan.salesRevenue + newPlan.rebateRevenue;
      
      // 2. Calculate Total Cost (COGS + OpEx)
      // Note: maxOperatingExpenses is now an input, not derived from margin.
      const totalCost = newPlan.cogs + newPlan.maxOperatingExpenses;
      
      // 3. Derive Net Profit & Margin
      const targetNetProfit = parseFloat((totalRevenue - totalCost).toFixed(1));
      const targetProfitMargin = totalRevenue > 0 ? parseFloat(((targetNetProfit / totalRevenue) * 100).toFixed(1)) : 0;

      // 4. Update Expense Items Distribution if necessary
      // If OpEx changed, redistribute to items based on last year's ratios (default allocation)
      // If Revenue changed, update ratios.
      let newExpenses = prev.expenses;
      
      if (field === 'maxOperatingExpenses') {
          // Redistribute new OpEx total to items
          const totalLastYearOpEx = EXPENSE_CATEGORIES_TEMPLATE.reduce((sum, cat) => 
            sum + cat.items.reduce((s, i) => s + i.lastYearActual, 0), 0);
          
          const allocationRatio = totalLastYearOpEx > 0 ? newPlan.maxOperatingExpenses / totalLastYearOpEx : 1;
          
          newExpenses = prev.expenses.map(cat => ({
              ...cat,
              items: cat.items.map(item => {
                  const target = parseFloat((item.lastYearActual * allocationRatio).toFixed(1));
                  const ratio = totalRevenue > 0 ? parseFloat(((target / totalRevenue) * 100).toFixed(1)) : 0;
                  return {
                      ...item,
                      thisYearTarget: target,
                      thisYearRatio: ratio
                  };
              })
          }));
      } else if (field === 'salesRevenue' || field === 'rebateRevenue') {
          // Update ratios only (targets stay same)
          newExpenses = prev.expenses.map(cat => ({
              ...cat,
              items: cat.items.map(item => {
                  const ratio = totalRevenue > 0 ? parseFloat(((item.thisYearTarget / totalRevenue) * 100).toFixed(1)) : 0;
                  return { ...item, thisYearRatio: ratio };
              })
          }));
      }

      return {
        ...newPlan,
        targetNetProfit,
        targetProfitMargin,
        expenses: newExpenses,
        totalOperatingExpenses: newPlan.maxOperatingExpenses // Sync total
      };
    });
  };

  // Handler for Step 2 Expense Item Changes
  const handleExpenseChange = (catId: string, itemId: string, field: 'thisYearTarget' | 'strategy', value: string) => {
    setPlan(prev => {
      const newExpenses = prev.expenses.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.map(item => {
            if (item.id !== itemId) return item;
            if (field === 'thisYearTarget') {
              return { ...item, thisYearTarget: parseFloat(value) || 0 };
            }
            return { ...item, strategy: value };
          })
        };
      });

      // Recalculate totals and ratios
      const totalRevenue = prev.salesRevenue + prev.rebateRevenue;
      let totalOpEx = 0;
      
      const finalExpenses = newExpenses.map(cat => ({
        ...cat,
        items: cat.items.map(item => {
          totalOpEx += item.thisYearTarget;
          const ratio = totalRevenue > 0 ? parseFloat(((item.thisYearTarget / totalRevenue) * 100).toFixed(1)) : 0;
          return { ...item, thisYearRatio: ratio };
        })
      }));

      return {
        ...prev,
        expenses: finalExpenses,
        totalOperatingExpenses: parseFloat(totalOpEx.toFixed(1))
      };
    });
  };

  // Derived values for display
  const totalRevenue = plan.salesRevenue + plan.rebateRevenue;
  const totalCost = plan.cogs + plan.totalOperatingExpenses;
  const netProfit = totalRevenue - totalCost;
  const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const budgetRemaining = plan.maxOperatingExpenses - plan.totalOperatingExpenses;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <TrendingUp className="mr-2 text-brand-600" size={20} />
              盈利能力目标拆解
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Target Margin: <span className="font-bold text-brand-600">{defaultProfitMargin}%</span>
            </p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex flex-col items-center relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step === s ? 'bg-brand-600 text-white shadow-lg shadow-brand-200 scale-110' : 
                  step > s ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s ? <Check size={14} /> : s}
                </div>
                <span className={`text-[10px] mt-2 font-medium ${step === s ? 'text-brand-600' : 'text-slate-400'}`}>
                  {s === 1 ? '测算运营费用' : s === 2 ? '拆解运营费用' : '确认计划'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          
          {/* Step 1: Revenue & Cost Planning */}
          {step === 1 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <h4 className="font-bold text-slate-700 flex items-center">
                  <DollarSign size={18} className="mr-2 text-brand-500" />
                  第一步：测算运营费用预算最大值
                </h4>
                
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 w-1/4">项目</th>
                        <th className="px-6 py-4 w-1/4">今年实际</th>
                        <th className="px-6 py-4 w-1/4">明年目标</th>
                        <th className="px-6 py-4 w-1/4">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Row 1: Sales Revenue */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 text-slate-700">1. 产品销售收入</td>
                        <td className="px-6 py-3 text-slate-600">
                          {lastYearValues.sales.toFixed(1)}<span className="ml-1 text-slate-400 text-xs">万元</span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full bg-transparent border-b border-brand-200 focus:border-brand-500 outline-none px-1 py-1 font-medium text-brand-700"
                              value={planInputs['salesRevenue'] ?? plan.salesRevenue.toString()}
                              onChange={(e) => {
                                const filtered = filterDecimal(e.target.value);
                                setPlanInputs(prev => ({ ...prev, salesRevenue: filtered }));
                                handleStep1Change('salesRevenue', filtered);
                              }}
                            />
                            <span className="ml-1 text-slate-400 text-xs">万元</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-500 text-xs">来自销售目标</td>
                      </tr>

                      {/* Row 2: Rebate Revenue */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 text-slate-700">2. 厂家返利收入</td>
                        <td className="px-6 py-3 text-slate-600">
                          {lastYearValues.rebate.toFixed(1)}<span className="ml-1 text-slate-400 text-xs">万元</span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full bg-transparent border-b border-brand-200 focus:border-brand-500 outline-none px-1 py-1 font-medium text-brand-700"
                              value={planInputs['rebateRevenue'] ?? plan.rebateRevenue.toString()}
                              onChange={(e) => {
                                const filtered = filterDecimal(e.target.value);
                                setPlanInputs(prev => ({ ...prev, rebateRevenue: filtered }));
                                handleStep1Change('rebateRevenue', filtered);
                              }}
                            />
                            <span className="ml-1 text-slate-400 text-xs">万元</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-500 text-xs">根据进货额和返利政策预估</td>
                      </tr>

                      {/* Total Revenue */}
                      <tr className="bg-slate-50 font-bold text-slate-800">
                        <td className="px-6 py-3">总营收</td>
                        <td className="px-6 py-3">{(lastYearValues.sales + lastYearValues.rebate).toFixed(1)}万元</td>
                        <td className="px-6 py-3">{totalRevenue.toFixed(1)}万元</td>
                        <td className="px-6 py-3 text-slate-500 text-xs font-normal">1+2</td>
                      </tr>

                      {/* Row 3: COGS */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 text-slate-700">3. 商品成本</td>
                        <td className="px-6 py-3 text-slate-600">
                          {lastYearValues.cogs.toFixed(1)}<span className="ml-1 text-slate-400 text-xs">万元</span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full bg-transparent border-b border-brand-200 focus:border-brand-500 outline-none px-1 py-1 font-medium text-brand-700"
                              value={planInputs['cogs'] ?? plan.cogs.toString()}
                              onChange={(e) => {
                                const filtered = filterDecimal(e.target.value);
                                setPlanInputs(prev => ({ ...prev, cogs: filtered }));
                                handleStep1Change('cogs', filtered);
                              }}
                            />
                            <span className="ml-1 text-slate-400 text-xs">万元</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-500 text-xs">来自进货目标</td>
                      </tr>

                      {/* Row 4: Operating Expenses */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 text-slate-700">4. 运营费用</td>
                        <td className="px-6 py-3 text-slate-600">
                          {lastYearValues.opEx.toFixed(1)}<span className="ml-1 text-slate-400 text-xs">万元</span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full bg-transparent border-b border-brand-200 focus:border-brand-500 outline-none px-1 py-1 font-medium text-brand-700"
                              value={planInputs['maxOperatingExpenses'] ?? plan.maxOperatingExpenses.toString()}
                              onChange={(e) => {
                                const filtered = filterDecimal(e.target.value);
                                setPlanInputs(prev => ({ ...prev, maxOperatingExpenses: filtered }));
                                handleStep1Change('maxOperatingExpenses', filtered);
                              }}
                            />
                            <span className="ml-1 text-slate-400 text-xs">万元</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-500 text-xs">可调整预算</td>
                      </tr>

                      {/* Total Cost */}
                      <tr className="bg-slate-50 font-bold text-slate-800">
                        <td className="px-6 py-3">总成本</td>
                        <td className="px-6 py-3">{(lastYearValues.cogs + lastYearValues.opEx).toFixed(1)}万元</td>
                        <td className="px-6 py-3">{(plan.cogs + plan.maxOperatingExpenses).toFixed(1)}万元</td>
                        <td className="px-6 py-3 text-slate-500 text-xs font-normal">3+4</td>
                      </tr>

                      {/* Net Profit */}
                      <tr className="hover:bg-slate-50 transition-colors font-bold">
                        <td className="px-6 py-3 text-slate-800">净利润</td>
                        <td className="px-6 py-3 text-slate-600">
                          {((lastYearValues.sales + lastYearValues.rebate) - (lastYearValues.cogs + lastYearValues.opEx)).toFixed(1)}万元
                        </td>
                        <td className="px-6 py-3 text-brand-700">
                          {plan.targetNetProfit.toFixed(1)}万元
                        </td>
                        <td className="px-6 py-3 text-slate-500 text-xs font-normal">总营收 - 总成本</td>
                      </tr>

                      {/* Net Profit Margin */}
                      <tr className="hover:bg-slate-50 transition-colors font-bold">
                        <td className="px-6 py-3 text-slate-800">净利润率</td>
                        <td className="px-6 py-3 text-slate-600">
                          {((lastYearValues.sales + lastYearValues.rebate) > 0 
                            ? (((lastYearValues.sales + lastYearValues.rebate) - (lastYearValues.cogs + lastYearValues.opEx)) / (lastYearValues.sales + lastYearValues.rebate) * 100) 
                            : 0).toFixed(1)}%
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center">
                            <span className="font-bold text-brand-700 text-lg">{plan.targetProfitMargin.toFixed(1)}</span>
                            <span className="ml-1 text-slate-400 text-xs">%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-500 text-xs font-normal">核心目标 (自动计算)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Expense Breakdown */}
          {step === 2 && (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h4 className="font-bold text-slate-700">第二步：运营费用拆解</h4>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${
                    budgetRemaining >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {budgetRemaining >= 0 ? <Check size={14} /> : <AlertCircle size={14} />}
                    预算剩余: ¥{budgetRemaining.toFixed(2)}万
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  总预算上限: <span className="font-bold text-slate-700">¥{plan.maxOperatingExpenses.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">费用细项</th>
                      <th className="px-4 py-3 text-right">今年实际 (万)</th>
                      <th className="px-4 py-3 text-right">今年占比</th>
                      <th className="px-4 py-3 text-right w-32">明年目标 (万)</th>
                      <th className="px-4 py-3 text-right">明年占比</th>
                      <th className="px-4 py-3 w-64">管控策略</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {plan.expenses.map(cat => (
                      <React.Fragment key={cat.id}>
                        <tr className="bg-slate-50/50 font-bold text-slate-800">
                          <td colSpan={6} className="px-4 py-2 text-xs uppercase tracking-wider">{cat.name}</td>
                        </tr>
                        {cat.items.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-700">{item.name}</td>
                            <td className="px-4 py-3 text-right text-slate-500">{item.lastYearActual.toFixed(1)}</td>
                            <td className="px-4 py-3 text-right text-slate-500">{item.lastYearRatio.toFixed(1)}%</td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-full text-right border border-slate-200 rounded px-2 py-1 focus:border-brand-500 outline-none"
                                value={expenseInputs[`${cat.id}:${item.id}`] ?? item.thisYearTarget.toString()}
                                onChange={(e) => {
                                  const filtered = filterDecimal(e.target.value);
                                  setExpenseInputs(prev => ({ ...prev, [`${cat.id}:${item.id}`]: filtered }));
                                  handleExpenseChange(cat.id, item.id, 'thisYearTarget', filtered);
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-700">
                              {item.thisYearRatio.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="text"
                                className="w-full border border-slate-200 rounded px-2 py-1 focus:border-brand-500 outline-none text-xs"
                                placeholder="输入管控策略..."
                                value={item.strategy}
                                onChange={(e) => handleExpenseChange(cat.id, item.id, 'strategy', e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-200">
                      <td className="px-4 py-3">运营费用总计</td>
                      <td className="px-4 py-3 text-right">
                        {EXPENSE_CATEGORIES_TEMPLATE.reduce((sum, cat) => sum + cat.items.reduce((s, i) => s + i.lastYearActual, 0), 0).toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right">
                         {/* Approx sum of ratios */}
                         17.0%
                      </td>
                      <td className="px-4 py-3 text-right text-brand-700">
                        {plan.totalOperatingExpenses.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(totalRevenue > 0 ? (plan.totalOperatingExpenses / totalRevenue) * 100 : 0).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {budgetRemaining >= 0 ? '符合预算' : '超出预算'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center">
                  <Check size={18} className="mr-2 text-emerald-500" />
                  第三步：确认年度利润规划表
                </h4>

                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">项目</th>
                        <th className="px-4 py-3 text-right">明年目标</th>
                        <th className="px-4 py-3 text-right">明年占比</th>
                        <th className="px-4 py-3">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-3">1. 产品销售收入</td>
                        <td className="px-4 py-3 text-right">{plan.salesRevenue.toFixed(1)}万元</td>
                        <td className="px-4 py-3 text-right">{(totalRevenue > 0 ? (plan.salesRevenue / totalRevenue) * 100 : 0).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">来自销售目标</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">2. 厂家返利收入</td>
                        <td className="px-4 py-3 text-right">{plan.rebateRevenue.toFixed(1)}万元</td>
                        <td className="px-4 py-3 text-right">{(totalRevenue > 0 ? (plan.rebateRevenue / totalRevenue) * 100 : 0).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">预估值</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold">
                        <td className="px-4 py-3">总营收</td>
                        <td className="px-4 py-3 text-right">{totalRevenue.toFixed(1)}万元</td>
                        <td className="px-4 py-3 text-right">100.0%</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">1+2</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">3. 商品成本</td>
                        <td className="px-4 py-3 text-right">{plan.cogs.toFixed(1)}万元</td>
                        <td className="px-4 py-3 text-right">{(totalRevenue > 0 ? (plan.cogs / totalRevenue) * 100 : 0).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">来自进货目标</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">4. 运营费用</td>
                        <td className="px-4 py-3 text-right">{plan.totalOperatingExpenses.toFixed(1)}万元</td>
                        <td className="px-4 py-3 text-right">{(totalRevenue > 0 ? (plan.totalOperatingExpenses / totalRevenue) * 100 : 0).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">需拆解控制</td>
                      </tr>
                      {/* Expense Breakdown */}
                      {plan.expenses.map(cat => (
                        <React.Fragment key={cat.id}>
                          <tr className="bg-slate-50/50 text-xs font-medium text-slate-500">
                              <td className="px-4 py-2 pl-8">{cat.name}</td>
                              <td className="px-4 py-2 text-right">{cat.items.reduce((s, i) => s + i.thisYearTarget, 0).toFixed(1)}万元</td>
                              <td className="px-4 py-2 text-right">{cat.items.reduce((s, i) => s + i.thisYearRatio, 0).toFixed(1)}%</td>
                              <td className="px-4 py-2"></td>
                          </tr>
                          {cat.items.map(item => (
                              <tr key={item.id} className="text-xs text-slate-400">
                                  <td className="px-4 py-1 pl-12">- {item.name}</td>
                                  <td className="px-4 py-1 text-right">{item.thisYearTarget.toFixed(1)}万元</td>
                                  <td className="px-4 py-1 text-right">{item.thisYearRatio.toFixed(1)}%</td>
                                  <td className="px-4 py-1 text-xs truncate max-w-[150px]" title={item.strategy}>{item.strategy}</td>
                              </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      <tr className="bg-slate-50 font-bold">
                        <td className="px-4 py-3">总成本</td>
                        <td className="px-4 py-3 text-right">{totalCost.toFixed(1)}万元</td>
                        <td className="px-4 py-3 text-right">{(totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">3+4</td>
                      </tr>
                      <tr className="bg-emerald-50 font-bold text-emerald-800">
                        <td className="px-4 py-3">净利润</td>
                        <td className="px-4 py-3 text-right">{netProfit.toFixed(1)}万元</td>
                        <td className="px-4 py-3 text-right">{netProfitMargin.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-emerald-600 text-xs">
                          {netProfitMargin >= plan.targetProfitMargin ? '达标' : '未达标'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-between items-center">
          <button 
            onClick={step === 1 ? onCancel : () => setStep(step - 1)}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {step === 1 ? '取消' : '上一步'}
          </button>
          
          {step < 3 ? (
            <button 
              onClick={() => {
                if (step === 2 && budgetRemaining < -0.1) {
                  // Optional: Warning before proceeding if budget exceeded
                  if (!confirm('当前运营费用超出预算，确定要继续吗？')) return;
                }
                setStep(step + 1);
              }}
              className="px-6 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors flex items-center shadow-sm hover:shadow-md"
            >
              下一步 <ArrowRight size={16} className="ml-2" />
            </button>
          ) : (
            <button 
              onClick={() => onSave(plan)}
              className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center shadow-sm hover:shadow-md"
            >
              <Check size={16} className="mr-2" /> 确认并保存
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
