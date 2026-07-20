import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Save, Settings, Calendar, Calculator } from 'lucide-react';
import { JBPObjective, JBPInventoryPlan, JBPInventoryCategorySetting, JBPInventoryMonthlyData, JBPProductCategory } from '../types';

interface InventoryBreakdownWizardProps {
  objective: JBPObjective;
  onSave: (plan: JBPInventoryPlan) => void;
  onCancel: () => void;
  productCategories: JBPProductCategory[];
  purchasePlan?: any;
  salesPlan?: any;
  totalSalesVolume: number;
  months: { id: string; label: string; shortLabel: string }[];
}

const STEPS = [
  { id: 'settings', title: '品类周转策略', icon: Settings },
  { id: 'monthly', title: '月度库存推演', icon: Calendar }
];

const DEFAULT_PURCHASE_CATEGORIES = [
  { id: 'cat1', name: '电解质水', ratio: 38 },
  { id: 'cat2', name: '气泡水', ratio: 23 },
  { id: 'cat3', name: '冰茶', ratio: 16 },
  { id: 'cat4', name: '维生素水', ratio: 10 },
  { id: 'cat5', name: '好自在', ratio: 10 },
  { id: 'cat6', name: '其他', ratio: 3 }
];

const DEFAULT_CATEGORY_CONFIG: Record<string, { days: number, reason: string }> = {
  'cat1': { days: 25, reason: '核心大单品，高周转保鲜度' },
  'cat2': { days: 31, reason: '多口味备货，维持安全水位' },
  'cat3': { days: 30, reason: '季节性波动，均衡备货' },
  'cat4': { days: 30, reason: '稳定动销，常规周转' },
  'cat5': { days: 30, reason: '新品培育期，保障陈列' },
  'cat6': { days: 45, reason: '长尾产品，低频补货' }
};

const INVENTORY_SCENARIOS: Record<string, string> = {
  '12': '为1月春节备货，月末库存高位',
  '01': '春节销售高峰后，月末库存快速下降',
  '02': '节后淡季，月末库存维持低位',
  '03': '气温回暖，为4月销售备货，月末库存回升',
  '04': '五一销售前，但5月销售占比低，月末库存再次下降',
  '05': '为夏季旺季蓄力，月末库存大幅上升',
  '06': '夏季旺季启动，月末库存达到全年最高',
  '07': '最热旺季，月末库存仍高但略降',
  '08': '高温延续，下旬开始控库，月末库存明显下降',
  '09': '开学季，月末库存平稳',
  '10': '国庆小高峰后，月末库存下降',
  '11': '为12月及春节备货启动，月末库存略有回升'
};

export const InventoryBreakdownWizard: React.FC<InventoryBreakdownWizardProps> = ({
  objective,
  onSave,
  onCancel,
  productCategories,
  purchasePlan,
  salesPlan,
  totalSalesVolume,
  months
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Track raw input strings for decimal inputs (allow intermediate states like "38.")
  const [ratioInputs, setRatioInputs] = useState<Record<string, string>>({});
  const [turnoverInputs, setTurnoverInputs] = useState<Record<string, string>>({});


  /** Filter input to: non-negative, digits + one dot, max 2 decimal places, truncate (not round) */
  const filterDecimal = (val: string): string => {
    // Step 1: Remove any character that is not a digit or decimal point
    let cleaned = val.replace(/[^\d.]/g, '');
    // Step 2: Keep only the first decimal point
    const dotIndex = cleaned.indexOf('.');
    if (dotIndex !== -1) {
      cleaned = cleaned.substring(0, dotIndex + 1) + cleaned.substring(dotIndex + 1).replace(/\./g, '');
    }
    // Step 3: Truncate to max 2 decimal places (not round)
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

  // Initialize Category Settings
  const [categorySettings, setCategorySettings] = useState<JBPInventoryCategorySetting[]>(() => {
    if (objective.inventoryPlan?.categorySettings) {
      return objective.inventoryPlan.categorySettings;
    }
    
    // Priority 1: Use Purchase Plan if available
    if (purchasePlan?.categorySplit && purchasePlan.categorySplit.length > 0) {
        return purchasePlan.categorySplit.map((pCat: any) => {
            const config = DEFAULT_CATEGORY_CONFIG[pCat.id] || { days: 30, reason: '' };
            return {
                categoryId: pCat.id,
                categoryName: pCat.name,
                turnoverDays: config.days,
                ratio: pCat.ratio,
                reason: config.reason
            };
        });
    }

    // Priority 2: Use Default Purchase Categories
    return DEFAULT_PURCHASE_CATEGORIES.map(cat => {
        const config = DEFAULT_CATEGORY_CONFIG[cat.id] || { days: 30, reason: '' };
        return {
            categoryId: cat.id,
            categoryName: cat.name,
            turnoverDays: config.days,
            ratio: cat.ratio,
            reason: config.reason
        };
    });
  });

  // Helper: resolve month sales from salesPlan (month-to-month)
  const getSalesForMonth = (monthId: string): number => {
    if (!salesPlan?.timeBreakdown) return Math.round(totalSalesVolume / 12);
    const suffix = monthId.split('-')[1];
    const d = salesPlan.timeBreakdown.find((t: any) => t.id === suffix);
    return d ? d.thisYearTarget : Math.round(totalSalesVolume / 12);
  };

  // Initialize Monthly Plan
  const [monthlyPlan, setMonthlyPlan] = useState<JBPInventoryMonthlyData[]>(() => {
    if (objective.inventoryPlan?.monthlyPlan) {
      // Refresh nextMonthSalesTarget from latest salesPlan, keep saved scenario
      return objective.inventoryPlan.monthlyPlan.map(row => {
        const freshSales = getSalesForMonth(row.monthId);
        const newCatVals: Record<string, number> = {};
        let rowTotal = 0;
        (objective.inventoryPlan!.categorySettings || []).forEach(cat => {
          const catSales = freshSales * (cat.ratio / 100);
          const targetStock = Math.round(catSales * (cat.turnoverDays / 30));
          newCatVals[cat.categoryId] = targetStock;
          rowTotal += targetStock;
        });
        return {
          ...row,
          salesRatio: totalSalesVolume > 0 ? parseFloat(((freshSales / totalSalesVolume) * 100).toFixed(1)) : 0,
          nextMonthSalesTarget: freshSales,
          categoryValues: newCatVals,
          total: rowTotal
        };
      });
    }

    // Initialize with default values
    return months.map((m) => {
      const monthSales = getSalesForMonth(m.id);
      const monthSuffix = m.id.split('-')[1];
      const defaultScenario = INVENTORY_SCENARIOS[monthSuffix] || '';

      return {
        monthId: m.id,
        scenario: defaultScenario,
        salesRatio: totalSalesVolume > 0 ? parseFloat(((monthSales / totalSalesVolume) * 100).toFixed(1)) : 0,
        nextMonthSalesTarget: monthSales,
        categoryValues: {},
        total: 0
      };
    });
  });

  // Recalculate Monthly Plan when Category Settings change
  useEffect(() => {
    setMonthlyPlan(prev => {
      return prev.map(row => {
        const newCategoryValues: Record<string, number> = {};
        let rowTotal = 0;

        categorySettings.forEach(cat => {
            // Formula: (Next Month Sales * Category Ratio) * (Category Turnover Days / 30)
            // This assumes "Next Month Sales" is total sales, and we split by Category Ratio.
            
            const catSales = (row.nextMonthSalesTarget || 0) * (cat.ratio / 100);
            const targetStock = Math.round(catSales * (cat.turnoverDays / 30));
            
            newCategoryValues[cat.categoryId] = targetStock;
            rowTotal += targetStock;
        });

        return {
          ...row,
          categoryValues: newCategoryValues,
          total: rowTotal
        };
      });
    });
  }, [categorySettings]); // Depend on categorySettings

  // Auto-update nextMonthSalesTarget from salesPlan when sales breakdown changes
  useEffect(() => {
    if (!salesPlan?.timeBreakdown) return;

    setMonthlyPlan(prev => prev.map(row => {
      const monthSuffix = row.monthId.split('-')[1];
      const salesData = salesPlan.timeBreakdown.find((t: any) => t.id === monthSuffix);
      const monthSales = salesData ? salesData.thisYearTarget : Math.round(totalSalesVolume / 12);

      // Recalculate category values with new sales target
      const newCategoryValues: Record<string, number> = {};
      let rowTotal = 0;
      categorySettings.forEach(cat => {
        const catSales = monthSales * (cat.ratio / 100);
        const targetStock = Math.round(catSales * (cat.turnoverDays / 30));
        newCategoryValues[cat.categoryId] = targetStock;
        rowTotal += targetStock;
      });

      return {
        ...row,
        salesRatio: totalSalesVolume > 0 ? parseFloat(((monthSales / totalSalesVolume) * 100).toFixed(1)) : 0,
        nextMonthSalesTarget: monthSales,
        categoryValues: newCategoryValues,
        total: rowTotal
      };
    }));
  }, [salesPlan, categorySettings, totalSalesVolume]);

  // Handler for Category Settings
  const handleCategoryChange = (id: string, field: keyof JBPInventoryCategorySetting, value: any) => {
    setCategorySettings(prev => prev.map(item => 
      item.categoryId === id ? { ...item, [field]: value } : item
    ));
  };

  // Handler for Monthly Plan
  const handleMonthlyChange = (monthId: string, field: keyof JBPInventoryMonthlyData, value: any) => {
    setMonthlyPlan(prev => prev.map(row => {
        if (row.monthId !== monthId) return row;

        const updatedRow = { ...row, [field]: value };

        // If nextMonthSalesTarget changes, recalculate category values
        if (field === 'nextMonthSalesTarget') {
            const newCategoryValues: Record<string, number> = {};
            let rowTotal = 0;
            
            categorySettings.forEach(cat => {
                const catSales = (value || 0) * (cat.ratio / 100);
                const targetStock = Math.round(catSales * (cat.turnoverDays / 30));
                newCategoryValues[cat.categoryId] = targetStock;
                rowTotal += targetStock;
            });
            updatedRow.categoryValues = newCategoryValues;
            updatedRow.total = rowTotal;
        }

        return updatedRow;
    }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onSave({
        categorySettings,
        monthlyPlan
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      onCancel();
    }
  };

  // Render Step 1: Category Settings
  const renderSettingsStep = () => (
    <div className="space-y-6">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3">品类名称</th>
                        <th className="px-4 py-3 text-right w-32">销售占比(%)</th>
                        <th className="px-4 py-3 text-right w-32">目标周转(天)</th>
                        <th className="px-4 py-3">策略备注 (如：新品铺货、核心保供)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {categorySettings.map(cat => (
                        <tr key={cat.categoryId} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-700">{cat.categoryName}</td>
                            <td className="px-4 py-3 text-right">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={ratioInputs[cat.categoryId] ?? cat.ratio.toString()}
                                    onChange={(e) => {
                                        const filtered = filterDecimal(e.target.value);
                                        setRatioInputs(prev => ({ ...prev, [cat.categoryId]: filtered }));
                                        handleCategoryChange(cat.categoryId, 'ratio', filteredToNumber(filtered));
                                    }}
                                    className="w-20 text-right bg-white border border-slate-200 rounded px-2 py-1 focus:border-brand-500 outline-none"
                                />
                            </td>
                            <td className="px-4 py-3 text-right">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={turnoverInputs[cat.categoryId] ?? cat.turnoverDays.toString()}
                                    onChange={(e) => {
                                        const filtered = filterDecimal(e.target.value);
                                        setTurnoverInputs(prev => ({ ...prev, [cat.categoryId]: filtered }));
                                        handleCategoryChange(cat.categoryId, 'turnoverDays', filteredToNumber(filtered));
                                    }}
                                    className="w-20 text-right bg-white border border-slate-200 rounded px-2 py-1 focus:border-brand-500 outline-none font-bold text-brand-600"
                                />
                            </td>
                            <td className="px-4 py-3">
                                <input 
                                    type="text" 
                                    value={cat.reason}
                                    onChange={(e) => handleCategoryChange(cat.categoryId, 'reason', e.target.value)}
                                    placeholder="输入策略说明..."
                                    className="w-full bg-transparent border-b border-transparent focus:border-brand-300 outline-none text-slate-600"
                                />
                            </td>
                        </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td className="px-4 py-3">合计 / 平均</td>
                        <td className="px-4 py-3 text-right">
                            {categorySettings.reduce((sum, c) => sum + c.ratio, 0).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right">
                            {/* Weighted Average Turnover Days */}
                            {(categorySettings.reduce((sum, c) => sum + (c.turnoverDays * c.ratio), 0) / 100).toFixed(1)}天
                        </td>
                        <td className="px-4 py-3"></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  );

  // Render Step 2: Monthly Plan
  const renderMonthlyStep = () => (
    <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start">
            <Calculator className="text-blue-500 mt-1 mr-3 flex-shrink-0" size={20} />
            <div>
                <h4 className="font-bold text-blue-800 text-sm">策略说明</h4>
                <p className="text-xs text-blue-600 mt-1">
                    请设定各品类的目标周转天数。系统将根据"销量预估"和"周转天数"自动计算目标库存。<br/>
                    公式：目标库存 = (销量预估 × 品类占比) ÷ 30 × 目标周转天数
                </p>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10">月份</th>
                        <th className="px-4 py-3 min-w-[200px]">库存场景说明</th>
                        <th className="px-4 py-3 text-right w-32">
                            <div>销量预估(箱)</div>
                            <div className="text-[10px] font-normal text-slate-400 whitespace-normal max-w-[160px]">取自销售目标拆解-月度预估销售箱数。若需修改，去调整销售目标拆解。</div>
                        </th>
                        {categorySettings.map(cat => (
                            <th key={cat.categoryId} className="px-4 py-3 text-right bg-slate-50/50">
                                <div>{cat.categoryName}</div>
                                <div className="text-[10px] font-normal text-slate-400">Target: {cat.turnoverDays}天</div>
                                <div className="text-[10px] font-normal text-slate-400">品类占比：{cat.ratio}%</div>
                            </th>
                        ))}
                        <th className="px-4 py-3 text-right font-bold sticky right-0 bg-slate-50 z-10">月末总库存</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {monthlyPlan.map((row) => (
                        <tr key={row.monthId} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-700 sticky left-0 bg-white z-10">
                                {months.find(m => m.id === row.monthId)?.shortLabel || row.monthId}
                            </td>
                            <td className="px-4 py-3">
                                <input 
                                    type="text" 
                                    value={row.scenario}
                                    onChange={(e) => handleMonthlyChange(row.monthId, 'scenario', e.target.value)}
                                    placeholder="如：春节备货..."
                                    className="w-full bg-transparent border-b border-transparent focus:border-brand-300 outline-none text-slate-600"
                                />
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                                {row.nextMonthSalesTarget?.toLocaleString() || 0}
                            </td>
                            {categorySettings.map(cat => (
                                <td key={cat.categoryId} className="px-4 py-3 text-right text-slate-600 bg-slate-50/30">
                                    {row.categoryValues[cat.categoryId]?.toLocaleString() || 0}箱
                                </td>
                            ))}
                            <td className="px-4 py-3 text-right font-bold text-brand-700 sticky right-0 bg-white z-10">
                                {row.total.toLocaleString()}箱
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">库存目标拆解 (Inventory Breakdown)</h2>
            <p className="text-sm text-slate-500 mt-1">Total Sales Ref: <span className="font-bold text-brand-600">{totalSalesVolume.toLocaleString()}</span> 箱</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-center space-x-4">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center px-4 py-2 rounded-full border transition-all ${
                    isActive 
                      ? 'bg-brand-600 border-brand-600 text-white shadow-md' 
                      : isCompleted
                        ? 'bg-brand-50 border-brand-200 text-brand-700'
                        : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    <Icon size={16} className="mr-2" />
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${isCompleted ? 'bg-brand-200' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 bg-white">
            {currentStep === 0 && renderSettingsStep()}
            {currentStep === 1 && renderMonthlyStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center rounded-b-2xl">
          <button
            onClick={handleBack}
            className="px-6 py-2 text-slate-600 font-medium hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 transition-all flex items-center"
          >
            {currentStep === 0 ? '取消' : <><ChevronLeft size={16} className="mr-1" /> 上一步</>}
          </button>

          {/* Step 0 validation: sales ratio must sum to 100% */}
          {(() => {
            const totalRatio = categorySettings.reduce((sum, c) => sum + c.ratio, 0);
            const isRatioValid = Math.abs(totalRatio - 100) < 0.01;
            const isStep0Blocked = currentStep === 0 && !isRatioValid;

            return (
              <button
                onClick={handleNext}
                disabled={isStep0Blocked}
                className={`px-8 py-2 rounded-lg shadow-lg transition-all flex items-center ${
                  isStep0Blocked
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-brand-200'
                }`}
              >
                {isStep0Blocked ? (
                  <>
                    请将各品类销售占比拆解至100%
                  </>
                ) : currentStep === STEPS.length - 1 ? (
                  <>
                    <Save size={16} className="mr-2" />
                    确认并保存
                  </>
                ) : (
                  <>
                    下一步
                    <ChevronRight size={16} className="ml-1" />
                  </>
                )}
              </button>
            );
          })()}
        </div>

      </div>
    </div>
  );
};
