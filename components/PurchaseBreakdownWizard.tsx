import React, { useState, useMemo } from 'react';
import { JBPObjective, JBPPurchasePlan, JBPMonthlyPlan, JBPTrend, JBPProductCategory } from '../types';
import { X, Check, Calculator, History } from 'lucide-react';

interface PurchaseBreakdownWizardProps {
  objective: JBPObjective;
  onSave: (plan: JBPPurchasePlan) => void;
  onCancel: () => void;
  months: { id: string; label: string; shortLabel: string }[];
  trends: JBPTrend[];
  totalTarget: number;
  lastYearRatios: { quarterly: Record<string, number>; category: Record<string, number> };
}

const CATEGORIES = [
  { id: 'cat1', name: '气泡水', color: '#10b981' },
  { id: 'cat2', name: '电解质水', color: '#3b82f6' },
  { id: 'cat3', name: '冰茶', color: '#f59e0b' },
  { id: 'cat4', name: '维生素水', color: '#8b5cf6' },
  { id: 'cat5', name: '好自在', color: '#ec4899' },
  { id: 'cat6', name: '本榨', color: '#14b8a6' },
  { id: 'cat7', name: '其他', color: '#64748b' }
];

const QUARTERS = [
  { id: 'Q1', name: 'Q1季度 (12-2月)', months: [12, 1, 2] },
  { id: 'Q2', name: 'Q2季度 (3-5月)', months: [3, 4, 5] },
  { id: 'Q3', name: 'Q3季度 (6-8月)', months: [6, 7, 8] },
  { id: 'Q4', name: 'Q4季度 (9-11月)', months: [9, 10, 11] }
];

const MONTHLY_DISTRIBUTION_DEFAULTS: Record<string, Record<number, { ratio: number, desc: string }>> = {
  'Q1': {
    12: { ratio: 30, desc: '元旦备货' },
    1: { ratio: 45, desc: '春节高峰' },
    2: { ratio: 25, desc: '节后淡季' }
  },
  'Q2': {
    3: { ratio: 30, desc: '压水头启动' },
    4: { ratio: 40, desc: '压水头高峰' },
    5: { ratio: 30, desc: '五一/升温' }
  },
  'Q3': {
    6: { ratio: 32, desc: '高温旺季' },
    7: { ratio: 36, desc: '最热旺季' },
    8: { ratio: 32, desc: '高温延续' }
  },
  'Q4': {
    9: { ratio: 35, desc: '开学/军训' },
    10: { ratio: 35, desc: '国庆/降温' },
    11: { ratio: 30, desc: '财年末冲刺' }
  }
};

export const PurchaseBreakdownWizard: React.FC<PurchaseBreakdownWizardProps> = ({
  objective,
  onSave,
  onCancel,
  months,
  totalTarget,
  lastYearRatios
}) => {
  const [plan, setPlan] = useState<JBPPurchasePlan>(() => {
    // Initialize with existing plan data or empty defaults
    if (objective.purchasePlan && objective.purchasePlan.monthlyData && Object.keys(objective.purchasePlan.monthlyData).length > 0) {
      return JSON.parse(JSON.stringify(objective.purchasePlan));
    }

    // Create empty monthly data
    const monthlyData: Record<string, JBPMonthlyPlan> = {};
    const defaultCatValues: Record<string, number> = {};
    CATEGORIES.forEach(c => defaultCatValues[c.id] = 0);

    months.forEach(m => {
      const mNum = parseInt(m.id.split('-')[1], 10);
      let quarterId = '';
      for (const q of QUARTERS) {
        if (q.months.includes(mNum)) { quarterId = q.id; break; }
      }
      const defaultDesc = MONTHLY_DISTRIBUTION_DEFAULTS[quarterId]?.[mNum]?.desc || '';

      monthlyData[m.id] = {
        scenario: defaultDesc,
        logic: '',
        ratio: 0,
        total: 0,
        categoryValues: { ...defaultCatValues }
      };
    });

    return {
      categorySplit: CATEGORIES.map(c => ({ id: c.id, name: c.name, ratio: 0, amount: 0 })),
      quarterSplit: QUARTERS.map(q => ({ id: q.id, name: q.name, amount: 0, ratio: 0 })),
      quarterlyCategorySplit: {},
      monthlyWeights: {},
      monthlyData
    };
  });

  // Track raw input display strings (prevent toWanInput from overwriting during editing)
  const [inputDisplays, setInputDisplays] = useState<Record<string, string>>({});

  // Get display value: use tracked raw input if present, otherwise format from stored yuan
  const getDisplay = (key: string, yuanVal: number): string => {
    if (key in inputDisplays) return inputDisplays[key];
    if (yuanVal === 0) return '';
    return (yuanVal / 10000).toFixed(4);
  };

  // Validation helper: allow digits, one dot, up to 4 decimal places, or leading dot for ".5"
  const isValidDecimal = (val: string): boolean => {
    if (val === '') return true;
    if (val === '.') return true;
    return /^\d*\.?\d{0,4}$/.test(val);
  };

  // Get months for a given quarter
  const getQuarterMonths = (qId: string) => {
    const qMonths = QUARTERS.find(q => q.id === qId)?.months || [];
    return months.filter(m => {
      const mNum = parseInt(m.id.split('-')[1], 10);
      return qMonths.includes(mNum);
    });
  };

  // Calculate quarter totals
  const getQuarterTotals = (qId: string) => {
    const relevantMonths = getQuarterMonths(qId);
    const catTotals: Record<string, number> = {};
    CATEGORIES.forEach(c => catTotals[c.id] = 0);
    let totalAmount = 0;

    relevantMonths.forEach(m => {
      const d = plan.monthlyData[m.id];
      if (d) {
        CATEGORIES.forEach(c => {
          const val = (d.categoryValues[c.id] as number) || 0;
          catTotals[c.id] += val;
          totalAmount += val;
        });
      }
    });

    return { catTotals, totalAmount: parseFloat(totalAmount.toFixed(2)) };
  };

  // Calculate annual totals
  const annualTotals = useMemo(() => {
    const catTotals: Record<string, number> = {};
    CATEGORIES.forEach(c => catTotals[c.id] = 0);
    let totalAmount = 0;

    Object.values(plan.monthlyData).forEach((d: any) => {
      CATEGORIES.forEach(c => {
        const val = (d.categoryValues[c.id] as number) || 0;
        catTotals[c.id] += val;
        totalAmount += val;
      });
    });

    return { catTotals, totalAmount: parseFloat(totalAmount.toFixed(2)) };
  }, [plan.monthlyData]);

  // Annual completion ratio: how much of the target has been decomposed
  const annualCompletionRatio = useMemo(() => {
    if (totalTarget <= 0) return 0;
    return parseFloat(((annualTotals.totalAmount / totalTarget) * 100).toFixed(2));
  }, [annualTotals.totalAmount, totalTarget]);

  // Whether the plan is fully decomposed (100% of target)
  const isFullyDecomposed = Math.abs(annualCompletionRatio - 100) < 0.01;

  // Handle category input change for a month
  const handleCategoryChange = (monthId: string, catId: string, rawValue: string) => {
    if (!isValidDecimal(rawValue)) return;

    const key = `${monthId}_${catId}`;
    // Track the raw display string so toWanInput doesn't overwrite during editing
    setInputDisplays(prev => ({ ...prev, [key]: rawValue }));

    const newPlan = { ...plan };
    const monthData = { ...newPlan.monthlyData[monthId] };

    // Parse 万元 input → 元
    const numVal = parseFloat(rawValue) || 0;
    const amountInYuan = parseFloat((numVal * 10000).toFixed(2));

    const newCatValues = { ...monthData.categoryValues };
    newCatValues[catId] = amountInYuan;

    // Recalculate month total
    const monthTotal = CATEGORIES.reduce((sum, c) => sum + ((newCatValues[c.id] as number) || 0), 0);

    monthData.categoryValues = newCatValues;
    monthData.total = parseFloat(monthTotal.toFixed(2));

    newPlan.monthlyData = { ...newPlan.monthlyData, [monthId]: monthData };

    // Recalculate categorySplit (annual) — compute annual total first
    const newCatSplit: Record<string, number> = {};
    CATEGORIES.forEach(c => newCatSplit[c.id] = 0);
    Object.values(newPlan.monthlyData).forEach((d: any) => {
      CATEGORIES.forEach(c => {
        newCatSplit[c.id] += (d.categoryValues[c.id] as number) || 0;
      });
    });
    const annualTotal = CATEGORIES.reduce((sum, c) => sum + newCatSplit[c.id], 0);

    // Month/quarter ratio: relative to annual plan total (not target)
    monthData.ratio = annualTotal > 0 ? parseFloat(((monthTotal / annualTotal) * 100).toFixed(2)) : 0;

    newPlan.categorySplit = CATEGORIES.map(c => ({
      id: c.id,
      name: c.name,
      amount: parseFloat((newCatSplit[c.id] || 0).toFixed(2)),
      ratio: annualTotal > 0 ? parseFloat(((newCatSplit[c.id] / annualTotal) * 100).toFixed(2)) : 0
    }));

    // Recalculate quarterSplit — ratio also relative to annual plan total
    newPlan.quarterSplit = QUARTERS.map(q => {
      const { totalAmount } = getQuarterTotalsForPlan(newPlan, q.id);
      return {
        id: q.id,
        name: q.name,
        amount: parseFloat(totalAmount.toFixed(2)),
        ratio: annualTotal > 0 ? parseFloat(((totalAmount / annualTotal) * 100).toFixed(2)) : 0
      };
    });

    setPlan(newPlan);
  };

  // Helper to calculate quarter totals from a plan snapshot
  const getQuarterTotalsForPlan = (p: JBPPurchasePlan, qId: string) => {
    const relevantMonths = getQuarterMonths(qId);
    const catTotals: Record<string, number> = {};
    CATEGORIES.forEach(c => catTotals[c.id] = 0);
    let totalAmount = 0;

    relevantMonths.forEach(m => {
      const d = p.monthlyData[m.id];
      if (d) {
        CATEGORIES.forEach(c => {
          const val = (d.categoryValues[c.id] as number) || 0;
          catTotals[c.id] += val;
          totalAmount += val;
        });
      }
    });

    return { catTotals, totalAmount: parseFloat(totalAmount.toFixed(2)) };
  };

  // Handle scenario change
  const handleScenarioChange = (monthId: string, value: string) => {
    const newPlan = { ...plan };
    newPlan.monthlyData = {
      ...newPlan.monthlyData,
      [monthId]: { ...newPlan.monthlyData[monthId], scenario: value }
    };
    setPlan(newPlan);
  };

  // Save handler
  const handleSave = () => {
    setInputDisplays({}); // Clear raw display tracking
    // Ensure categorySplit and quarterSplit are up to date
    const finalPlan = { ...plan };

    // Recalculate categorySplit
    const catTotals: Record<string, number> = {};
    CATEGORIES.forEach(c => catTotals[c.id] = 0);
    Object.values(finalPlan.monthlyData).forEach((d: any) => {
      CATEGORIES.forEach(c => {
        catTotals[c.id] += (d.categoryValues[c.id] as number) || 0;
      });
    });
    const annualTotal = CATEGORIES.reduce((sum, c) => sum + catTotals[c.id], 0);
    finalPlan.categorySplit = CATEGORIES.map(c => ({
      id: c.id,
      name: c.name,
      amount: parseFloat((catTotals[c.id] || 0).toFixed(2)),
      ratio: annualTotal > 0 ? parseFloat(((catTotals[c.id] / annualTotal) * 100).toFixed(2)) : 0
    }));

    // Recalculate quarterSplit
    finalPlan.quarterSplit = QUARTERS.map(q => {
      const { totalAmount } = getQuarterTotalsForPlan(finalPlan, q.id);
      return {
        id: q.id,
        name: q.name,
        amount: parseFloat(totalAmount.toFixed(2)),
        ratio: totalTarget > 0 ? parseFloat(((totalAmount / totalTarget) * 100).toFixed(2)) : 0
      };
    });

    onSave(finalPlan);
  };

  // Format 元 → 万元 for display
  const toWan = (yuan: number): string => {
    return (yuan / 10000).toFixed(4);
  };

  // Format for input value (万元, 4 decimals)
  const toWanInput = (yuan: number): string => {
    if (yuan === 0) return '';
    return (yuan / 10000).toFixed(4);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <Calculator className="mr-2 text-brand-600" size={20} />
                    拆解进货计划
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                    年度目标: <span className="font-bold text-brand-600">{(totalTarget / 10000).toFixed(2)}万元</span>
                    <span className="ml-4">当前合计: <span className={`font-bold ${Math.abs(annualTotals.totalAmount - totalTarget) < 0.1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {(annualTotals.totalAmount / 10000).toFixed(2)}万元
                    </span></span>
                </p>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-3 w-16 sticky left-0 bg-slate-50 z-10">时间</th>
                                <th className="px-3 py-3 w-24">场景</th>
                                {CATEGORIES.map(c => (
                                    <th key={c.id} className="px-3 py-3 w-28 text-right" style={{ color: c.color }}>{c.name}<br/><span className="text-[10px] font-normal text-slate-400">(万元)</span></th>
                                ))}
                                <th className="px-3 py-3 w-28 text-right bg-emerald-50 text-emerald-800 font-bold">总进货<br/><span className="text-[10px] font-normal text-emerald-600">(万元)</span></th>
                                <th className="px-3 py-3 w-20 text-right">占比</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {QUARTERS.map(q => {
                                const relevantMonths = getQuarterMonths(q.id);
                                const { catTotals: qCatTotals, totalAmount: qTotalAmount } = getQuarterTotals(q.id);

                                return (
                                    <React.Fragment key={q.id}>
                                        {/* Quarter Label Row */}
                                        <tr className="bg-slate-100/80">
                                            <td colSpan={2 + CATEGORIES.length + 2} className="px-3 py-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                                                {q.name}
                                            </td>
                                        </tr>

                                        {/* Month Rows (editable) */}
                                        {relevantMonths.map(m => {
                                            const d = plan.monthlyData[m.id];
                                            if (!d) return null;
                                            const mTotal = d.total || 0;
                                            const mRatio = d.ratio || 0;

                                            return (
                                                <React.Fragment key={m.id}>
                                                    <tr className="hover:bg-blue-50/30 transition-colors group">
                                                        <td className="px-3 py-2 font-medium text-slate-700 sticky left-0 bg-white group-hover:bg-blue-50/30">{m.shortLabel}</td>
                                                        <td className="px-3 py-2 text-slate-500 text-xs">
                                                            {d.scenario || '-'}
                                                        </td>
                                                        {CATEGORIES.map(c => {
                                                            const catVal = (d.categoryValues[c.id] as number) || 0;
                                                            const catPct = mTotal > 0 ? ((catVal / mTotal) * 100).toFixed(2) : '0.00';

                                                            return (
                                                                <td key={c.id} className="px-3 py-2 text-right align-middle">
                                                                    <div className="flex flex-col items-end">
                                                                        <input
                                                                            type="text" inputMode="decimal"
                                                                            className="w-20 bg-blue-50 border border-blue-200 rounded px-2 py-1 text-right outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 text-slate-700 font-mono text-xs"
                                                                            value={getDisplay(`${m.id}_${c.id}`, catVal)}
                                                                            placeholder="0"
                                                                            onChange={(e) => handleCategoryChange(m.id, c.id, e.target.value)}
                                                                        />
                                                                        <span className="text-[10px] text-slate-400 mt-0.5">
                                                                            {catPct}%
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-3 py-2 text-right font-medium bg-emerald-50/50 text-emerald-700 font-mono">
                                                            {toWan(mTotal)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-slate-600 font-mono">
                                                            {mRatio.toFixed(2)}%
                                                        </td>
                                                    </tr>

                                                    {/* Last Year Month Row */}
                                                    <tr className="text-slate-400 italic text-[10px] bg-slate-50/30 border-b border-slate-100">
                                                        <td className="px-3 py-1 sticky left-0 bg-slate-50/30 pl-6">今年{m.shortLabel}</td>
                                                        <td className="px-3 py-1"></td>
                                                        {CATEGORIES.map(c => {
                                                            const catVal = (d.categoryValues[c.id] as number) || 0;
                                                            const lyCatVal = catVal * 0.9;
                                                            return (
                                                                <td key={c.id} className="px-3 py-1 text-right">
                                                                    <span>*{toWan(lyCatVal)}万元*</span>
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-3 py-1 text-right">
                                                            <span>*{toWan(mTotal * 0.9)}万元*</span>
                                                        </td>
                                                        <td className="px-3 py-1"></td>
                                                    </tr>
                                                </React.Fragment>
                                            );
                                        })}

                                        {/* Quarter Summary Row */}
                                        <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
                                            <td className="px-3 py-3 sticky left-0 bg-slate-50">{q.id}汇总</td>
                                            <td className="px-3 py-3"></td>
                                            {CATEGORIES.map(c => {
                                                const catVal = qCatTotals[c.id] || 0;
                                                const catPct = qTotalAmount > 0 ? ((catVal / qTotalAmount) * 100).toFixed(2) : '0.00';
                                                return (
                                                    <td key={c.id} className="px-3 py-3 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span>{toWan(catVal)}</span>
                                                            <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                                {catPct}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-3 text-right text-emerald-700">
                                                {toWan(qTotalAmount)}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {annualTotals.totalAmount > 0 ? ((qTotalAmount / annualTotals.totalAmount) * 100).toFixed(2) : '0.00'}%
                                            </td>
                                        </tr>

                                        {/* Last Year Quarter Row */}
                                        <tr className="text-slate-400 italic text-xs bg-slate-50/20 border-b border-slate-200">
                                            <td className="px-3 py-2 sticky left-0 bg-slate-50/20">今年{q.id}</td>
                                            <td className="px-3 py-2"></td>
                                            {CATEGORIES.map(c => {
                                                const catVal = qCatTotals[c.id] || 0;
                                                const lyCatVal = catVal * 0.9;
                                                return (
                                                    <td key={c.id} className="px-3 py-2 text-right">
                                                        <span>*{toWan(lyCatVal)}万元*</span>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-2 text-right">
                                                <span>*{toWan(qTotalAmount * 0.9)}万元*</span>
                                            </td>
                                            <td className="px-3 py-2"></td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}

                            {/* Annual Summary Row */}
                            <tr className="bg-emerald-50 font-bold text-emerald-800 border-t-2 border-emerald-200">
                                <td className="px-3 py-4 sticky left-0 bg-emerald-50">全年计划</td>
                                <td className="px-3 py-4"></td>
                                {CATEGORIES.map(c => {
                                    const catVal = annualTotals.catTotals[c.id] || 0;
                                    const catPct = annualTotals.totalAmount > 0 ? ((catVal / annualTotals.totalAmount) * 100).toFixed(2) : '0.00';
                                    return (
                                        <td key={c.id} className="px-3 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span>{toWan(catVal)}</span>
                                                <span className="text-[10px] text-emerald-600 font-normal mt-0.5">
                                                    {catPct}%
                                                </span>
                                            </div>
                                        </td>
                                    );
                                })}
                                <td className="px-3 py-4 text-right text-base">
                                    {toWan(annualTotals.totalAmount)}
                                </td>
                                <td className="px-3 py-4 text-right text-base font-bold text-emerald-700">
                                    {annualTotals.totalAmount > 0 ? '100.00' : '0.00'}%
                                </td>
                            </tr>

                            {/* Last Year Annual Row */}
                            <tr className="bg-slate-50 text-slate-500 font-medium italic text-xs">
                                <td className="px-3 py-4 sticky left-0 bg-slate-50">今年实际</td>
                                <td className="px-3 py-4"></td>
                                {CATEGORIES.map(c => {
                                    const histRatio = lastYearRatios.category[c.id] || 0;
                                    const histTotal = totalTarget * 0.9;
                                    const histVal = histTotal * (histRatio / 100);
                                    return (
                                        <td key={c.id} className="px-3 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span>{(histVal / 10000).toFixed(4)}万元</span>
                                                <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                    {histRatio.toFixed(2)}%
                                                </span>
                                            </div>
                                        </td>
                                    );
                                })}
                                <td className="px-3 py-4 text-right">
                                    {((totalTarget * 0.9) / 10000).toFixed(4)}万元
                                </td>
                                <td className="px-3 py-4"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
            <button
                onClick={onCancel}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
            >
                取消
            </button>
            <button
                onClick={handleSave}
                disabled={!isFullyDecomposed}
                className={`px-6 py-2 text-white font-medium rounded-lg transition-all shadow-lg flex items-center ${
                    isFullyDecomposed
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 cursor-pointer'
                        : 'bg-slate-300 cursor-not-allowed shadow-slate-100'
                }`}
            >
                <Check size={16} className="mr-2" />
                {isFullyDecomposed ? '确认生成计划' : '请将明年计划100%拆解至品类月计划'}
            </button>
        </div>
      </div>
    </div>
  );
};
