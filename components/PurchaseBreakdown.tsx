import React, { useMemo, useState, useEffect } from 'react';
import { JBPObjective, JBPPurchasePlan, JBPMonthlyPlan, JBPTrend, JBPProductCategory } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp, RefreshCw, Calculator, Edit2, Save, X, History, Target, PieChart as PieChartIcon } from 'lucide-react';
import { PurchaseBreakdownWizard } from './PurchaseBreakdownWizard';

interface PurchaseBreakdownProps {
  objective: JBPObjective;
  updateObjective: (updates: Partial<JBPObjective>) => void;
  months: { id: string; label: string; shortLabel: string }[];
  trends: JBPTrend[];
  productCategories: JBPProductCategory[];
  readOnly?: boolean;
  highlight?: boolean;
}

const CATEGORIES = [
  { id: 'cat1', name: '电解质水', color: '#3b82f6' },
  { id: 'cat2', name: '气泡水', color: '#10b981' },
  { id: 'cat3', name: '冰茶', color: '#f59e0b' },
  { id: 'cat4', name: '维生素水', color: '#8b5cf6' },
  { id: 'cat5', name: '好自在', color: '#ec4899' },
  { id: 'cat6', name: '其他', color: '#64748b' }
];

const QUARTERS = [
  { id: 'Q1', name: 'Q1季度 (12-2月)', months: [12, 1, 2] },
  { id: 'Q2', name: 'Q2季度 (3-5月)', months: [3, 4, 5] },
  { id: 'Q3', name: 'Q3季度 (6-8月)', months: [6, 7, 8] },
  { id: 'Q4', name: 'Q4季度 (9-11月)', months: [9, 10, 11] }
];

const PurchaseBreakdown: React.FC<PurchaseBreakdownProps> = ({ objective, updateObjective, months, trends, productCategories, readOnly = false, highlight = false }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'table'>('table');
  const [showWizard, setShowWizard] = useState(false);
  
  // Calculate Last Year's Ratios
  const lastYearRatios = useMemo(() => {
    // 1. Quarterly Ratios from Trends
    const qRatios: Record<string, number> = {};
    let totalSellIn = 0;
    const qSellIn: Record<string, number> = {};

    QUARTERS.forEach(q => {
        let qTotal = 0;
        q.months.forEach(mNum => {
            const monthData = trends.find(t => t.month.replace('月', '') === String(mNum));
            if (monthData) {
                qTotal += monthData.sellIn;
            }
        });
        qSellIn[q.id] = qTotal;
        totalSellIn += qTotal;
    });

    if (totalSellIn > 0) {
        QUARTERS.forEach(q => {
            qRatios[q.id] = parseFloat(((qSellIn[q.id] / totalSellIn) * 100).toFixed(1));
        });
    }

    // 2. Category Ratios (Mocked based on CATEGORIES since productCategories names don't match exactly)
    // In a real app, we would match by ID or Name. Here we simulate historical data.
    const cRatios: Record<string, number> = {
        'cat1': 35.0, // Electrolyte
        'cat2': 25.0, // Sparkling
        'cat3': 15.0, // Ice Tea
        'cat4': 10.0, // Vitamin
        'cat5': 10.0, // HZZ
        'cat6': 5.0   // Other
    };

    return { quarterly: qRatios, category: cRatios };
  }, [trends]);
  
  // Parse total target value
  const totalTarget = useMemo(() => {
    const valStr = objective.targetValue;
    if (!valStr) return 0;
    
    let val = 0;

    // 1. Priority: Look for explicit currency symbol ¥ followed by numbers
    // Matches ¥6,500,000 or ¥ 6500000
    const currencyMatch = valStr.match(/¥\s*([\d,]+(\.\d+)?)/);
    
    if (currencyMatch) {
        val = parseFloat(currencyMatch[1].replace(/,/g, ''));
    } else {
        // 2. Fallback: Look for numbers with units
        // Exclude years (2024-2030) if possible, but difficult without context.
        // Instead, look for specific patterns like "X万" or "X亿"
        const wanMatch = valStr.match(/(\d+(\.\d+)?)\s*万/);
        const yiMatch = valStr.match(/(\d+(\.\d+)?)\s*亿/);

        if (yiMatch) {
            val = parseFloat(yiMatch[1]) * 100000000;
        } else if (wanMatch) {
            val = parseFloat(wanMatch[1]) * 10000;
        } else {
            // 3. Last Resort: Find the largest number in the string that looks like a target
            // This helps avoid "2026" being picked up if the target is "6500000"
            const allNumbers = valStr.replace(/,/g, '').match(/(\d+(\.\d+)?)/g);
            if (allNumbers) {
                // Filter out likely years (e.g. 2020-2030 integers) if we have other options
                const candidates = allNumbers.map(n => parseFloat(n));
                const nonYearCandidates = candidates.filter(n => n < 2020 || n > 2030);
                
                if (nonYearCandidates.length > 0) {
                    // Pick the largest one, assuming target is the main number
                    val = Math.max(...nonYearCandidates);
                } else {
                    val = Math.max(...candidates);
                }
            }
        }
    }
    
    // Final Unit Conversion to "Wan" (Ten Thousand) for display consistency
    // If value is huge (likely Yuan), convert to Wan. 
    // Threshold: if > 100,000, assume it's Yuan.
    if (val >= 100000) {
        val = val / 10000;
    }
    
    return parseFloat(val.toFixed(2));
  }, [objective.targetValue]);

  // Initialize Plan if missing - REMOVED as per requirements (default no display)
  
  const { purchasePlan } = objective;

  // Calculate current totals to show validation status (only if plan exists)
  const currentCatTotal = purchasePlan?.categorySplit?.reduce((sum, c) => sum + c.amount, 0) || 0;
  const currentQuarterTotal = purchasePlan?.quarterSplit?.reduce((sum, q) => sum + q.amount, 0) || 0;
  
  const isCatValid = Math.abs(currentCatTotal - totalTarget) < 0.1;
  const isQuarterValid = Math.abs(currentQuarterTotal - totalTarget) < 0.1;

  // Helper to get Quarter Data for Table
  const getQuarterRowData = (qId: string) => {
    if (!purchasePlan) return { totalRatio: 0, totalAmount: 0, catTotals: {}, relevantMonths: [] };

    const qMonths = QUARTERS.find(q => q.id === qId)?.months || [];
    const relevantMonths = months.filter(m => {
        const mNum = parseInt(m.id.split('-')[1], 10);
        return qMonths.includes(mNum);
    });

    let totalRatio = 0;
    let totalAmount = 0;
    const catTotals: Record<string, number> = {};
    CATEGORIES.forEach(c => catTotals[c.id] = 0);

    relevantMonths.forEach(m => {
        const d = purchasePlan.monthlyData[m.id];
        if (d) {
            totalRatio += d.ratio;
            totalAmount += d.total;
            Object.entries(d.categoryValues).forEach(([cId, val]) => {
                if (catTotals[cId] !== undefined) catTotals[cId] += (val as number);
            });
        }
    });

    return { totalRatio, totalAmount, catTotals, relevantMonths };
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Header with Wizard Button */}
      <div className="flex justify-between items-end border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-2">
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  <PieChartIcon size={16} className="mr-2 text-brand-500" /> 进货目标拆解
              </h4>
              {purchasePlan && (
                <div className="text-lg font-bold text-slate-800 flex items-center">
                    年度进货规划表
                    <span className="ml-3 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Total: ¥{totalTarget}
                    </span>
                </div>
              )}
          </div>
          {!readOnly && (
          <button
            onClick={() => setShowWizard(true)}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm mb-1 border-2 ${
              highlight && !purchasePlan
                ? 'bg-red-50 text-red-600 border-red-400 hover:bg-red-100 animate-pulse-border'
                : 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700 shadow-md'
            }`}
          >
            <Target size={16} className="mr-2" />
            {purchasePlan ? '调整拆解' : '目标拆解'}
          </button>
          )}
      </div>

      {/* Main Table - Only show if plan exists */}
      {purchasePlan && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                    <th className="px-4 py-3 w-24 sticky left-0 bg-slate-50 z-10">时间</th>
                    <th className="px-4 py-3 w-32">场景</th>
                    <th className="px-4 py-3 w-16 text-right">占比</th>
                    <th className="px-4 py-3 w-24 text-right bg-emerald-50 text-emerald-800 font-bold">总进货</th>
                    {CATEGORIES.map(c => (
                    <th key={c.id} className="px-4 py-3 w-24 text-right" style={{ color: c.color }}>{c.name}</th>
                    ))}
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {QUARTERS.map(q => {
                    const { totalRatio, totalAmount, catTotals, relevantMonths } = getQuarterRowData(q.id);
                    
                    return (
                    <React.Fragment key={q.id}>
                        {/* Quarter Header Row */}
                        <tr className="bg-slate-50/50 font-bold text-slate-800">
                        <td className="px-4 py-3 sticky left-0 bg-slate-50/50">{q.id}</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right">{totalRatio.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right bg-emerald-50 text-emerald-800">
                            {totalAmount.toFixed(2)}元
                        </td>
                        {CATEGORIES.map(c => (
                            <td key={c.id} className="px-4 py-3 text-right">
                                <div className="flex flex-col items-end">
                                    <span>{catTotals[c.id].toFixed(2)}元</span>
                                    <span className="text-[10px] text-slate-400 font-normal">
                                        {totalAmount > 0 ? ((catTotals[c.id] / totalAmount) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            </td>
                        ))}
                        </tr>

                        {/* Monthly Rows */}
                        {relevantMonths.map(m => {
                        const d = purchasePlan.monthlyData[m.id];
                        if (!d) return null;

                        return (
                            <React.Fragment key={m.id}>
                                <tr className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-4 py-2 font-medium text-slate-700 sticky left-0 bg-white group-hover:bg-blue-50/30">{m.shortLabel}</td>
                                <td className="px-4 py-2 text-slate-600">
                                    {d.scenario || '-'}
                                </td>
                                <td className="px-4 py-2 text-right text-slate-600">
                                    {d.ratio.toFixed(1)}%
                                </td>
                                <td className="px-4 py-2 text-right font-medium bg-emerald-50 text-emerald-700">
                                    {d.total.toFixed(2)}元
                                </td>
                                {CATEGORIES.map(c => (
                                    <td key={c.id} className="px-4 py-2 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-slate-600">{d.categoryValues[c.id]?.toFixed(2) || '0.00'}元</span>
                                            <span className="text-[9px] text-slate-400">
                                                {d.total > 0 ? ((d.categoryValues[c.id] / d.total) * 100).toFixed(1) : 0}%
                                            </span>
                                        </div>
                                    </td>
                                ))}
                                </tr>
                            </React.Fragment>
                        );
                        })}
                    </React.Fragment>
                    );
                })}
                
                {/* Annual Summary Rows */}
                <tr className="bg-emerald-50 font-bold text-emerald-800 border-t-2 border-emerald-100">
                    <td className="px-4 py-4 sticky left-0 bg-emerald-50">明年计划</td>
                    <td className="px-4 py-4"></td>
                    <td className="px-4 py-4 text-right">100%</td>
                    <td className="px-4 py-4 text-right">
                        {currentCatTotal.toFixed(2)}元
                    </td>
                    {CATEGORIES.map(c => {
                        const catVal = purchasePlan.categorySplit.find(cat => cat.id === c.id)?.amount || 0;
                        return (
                            <td key={c.id} className="px-4 py-4 text-right">
                                <div className="flex flex-col items-end">
                                    <span>{catVal.toFixed(2)}元</span>
                                    <span className="text-[10px] text-emerald-600 font-normal">
                                        {currentCatTotal > 0 ? ((catVal / currentCatTotal) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            </td>
                        );
                    })}
                </tr>
                </tbody>
            </table>
            </div>
        </div>
      )}

      {/* Wizard Modal */}
      {showWizard && (
        <PurchaseBreakdownWizard 
            objective={objective}
            onSave={(newPlan) => {
                updateObjective({ purchasePlan: newPlan });
                setShowWizard(false);
            }}
            onCancel={() => setShowWizard(false)}
            months={months}
            trends={trends}
            totalTarget={totalTarget}
            lastYearRatios={lastYearRatios}
        />
      )}
    </div>
  );
};

export default PurchaseBreakdown;
