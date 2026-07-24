import React, { useState, useMemo, useEffect } from 'react';
import { JBPObjective, JBPPurchasePlan, JBPMonthlyPlan, JBPTrend, JBPProductCategory } from '../types';
import { X, ChevronRight, ChevronLeft, Check, AlertCircle, Calculator, History } from 'lucide-react';

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

export const PurchaseBreakdownWizard: React.FC<PurchaseBreakdownWizardProps> = ({ 
  objective, 
  onSave, 
  onCancel, 
  months,
  trends,
  totalTarget,
  lastYearRatios
}) => {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<JBPPurchasePlan>(() => {
    // Initialize with existing plan or defaults
    if (objective.purchasePlan) {
        return JSON.parse(JSON.stringify(objective.purchasePlan));
    }

    // Default Ratios — all empty, user fills in
    const defaultCategoryRatios: Record<string, number> = {
        'cat1': 0, 'cat2': 0, 'cat3': 0, 'cat4': 0, 'cat5': 0, 'cat6': 0
    };

    const defaultQuarterlyCategoryRatios: Record<string, number[]> = {
        'cat1': [0, 0, 0, 0],
        'cat2': [0, 0, 0, 0],
        'cat3': [0, 0, 0, 0],
        'cat4': [0, 0, 0, 0],
        'cat5': [0, 0, 0, 0],
        'cat6': [0, 0, 0, 0]
    };

    // 1. Init Category Split
    const categorySplit = CATEGORIES.map(c => {
        const ratio = defaultCategoryRatios[c.id] || 0;
        return {
            id: c.id,
            name: c.name,
            ratio: ratio,
            amount: parseFloat((totalTarget * (ratio / 100)).toFixed(2))
        };
    });

    // 2. Init Quarterly Category Split
    const quarterlyCategorySplit: Record<string, Record<string, { ratio: number, amount: number }>> = {};
    QUARTERS.forEach((q, qIdx) => {
        quarterlyCategorySplit[q.id] = {};
        CATEGORIES.forEach(c => {
            const catTotalAmount = categorySplit.find(cat => cat.id === c.id)?.amount || 0;
            const qRatio = defaultQuarterlyCategoryRatios[c.id]?.[qIdx] || 0;
            const amount = parseFloat((catTotalAmount * (qRatio / 100)).toFixed(2));
            
            quarterlyCategorySplit[q.id][c.id] = {
                ratio: qRatio,
                amount: amount
            };
        });
    });

    // 3. Calculate Overall Quarter Split based on the above
    const quarterSplit = QUARTERS.map(q => {
        // Sum of all categories in this quarter
        const qSum = CATEGORIES.reduce((sum, c) => {
            const cell = quarterlyCategorySplit[q.id]?.[c.id];
            return sum + (cell?.amount || 0);
        }, 0);
        
        return {
            id: q.id,
            name: q.name,
            amount: parseFloat(qSum.toFixed(2)),
            ratio: totalTarget > 0 ? parseFloat(((qSum / totalTarget) * 100).toFixed(1)) : 0
        };
    });

    return {
      categorySplit,
      quarterSplit,
      quarterlyCategorySplit,
      monthlyWeights: {},
      monthlyData: {}
    };
  });

  // Helper to calculate amounts based on ratios
  const updateAmounts = (currentPlan: JBPPurchasePlan) => {
      const updated = { ...currentPlan };
      // Update Annual Category Amounts
      updated.categorySplit = updated.categorySplit.map(c => ({
          ...c,
          amount: parseFloat((totalTarget * (c.ratio / 100)).toFixed(2))
      }));
      // Update Annual Quarter Amounts
      updated.quarterSplit = updated.quarterSplit.map(q => ({
          ...q,
          amount: parseFloat((totalTarget * (q.ratio / 100)).toFixed(2))
      }));
      return updated;
  };

  // Input validation helpers
  const isValidOneDecimal = (val: string): boolean => {
    if (val === '') return true;
    return /^\d*\.?\d{0,1}$/.test(val);
  };
  const isValidInteger = (val: string): boolean => {
    if (val === '') return true;
    return /^\d*$/.test(val);
  };

  // Step 1 Handlers
  const handleStep1Change = (type: 'category' | 'quarter', id: string, val: string) => {
      if (!isValidInteger(val)) return;
      const numVal = parseFloat(val) || 0;
      const newPlan = { ...plan };
      
      if (type === 'category') {
          newPlan.categorySplit = newPlan.categorySplit.map(c => 
              c.id === id ? { ...c, ratio: numVal } : c
          );
      } else {
          newPlan.quarterSplit = newPlan.quarterSplit.map(q => 
              q.id === id ? { ...q, ratio: numVal } : q
          );
      }
      setPlan(updateAmounts(newPlan));
  };

  // Category Features Data
  const CATEGORY_FEATURES: Record<string, string> = {
    'cat1': '核心场景：运动补水、日常健康补水、熬夜加班、感冒恢复等。\n季节规律：全年需求相对平稳，无明显淡季。夏季高温运动出汗多，销量略高；冬季室内运动、暖气房、感冒人群仍保持稳定需求。\n关键节点：Q2压水头期间会提前备货；夏季（Q3）自然动销最高；春节（Q1）聚会及礼品场景也有需求。',
    'cat2': '核心场景：聚餐佐餐、休闲娱乐、年轻人群社交。\n季节规律：夏季为传统旺季，气泡口感解暑；春节期间餐饮消费带动Q1销量。\n关键节点：春节（Q1）、五一（Q2）、暑期（Q3）、国庆（Q4）。',
    'cat3': '核心场景：夏季解渴、下午茶、户外活动。\n季节规律：强季节性产品，夏季（Q2-Q3）销量占比极大，冬季需求明显回落。\n关键节点：入夏前备货（Q2）、高温酷暑（Q3）。',
    'cat4': '核心场景：补充维生素、日常免疫力关注。\n季节规律：换季及流感高发期（Q1、Q4）需求较高；夏季平稳。\n关键节点：流感季、换季期。',
    'cat5': '核心场景：女性生理期、日常养生、温暖慰藉。\n季节规律：冬季及气温较低时（Q1、Q4）为旺季；夏季需求较弱。\n关键节点：双十一、双十二、春节。',
    'cat6': '核心场景：多样化补充。\n季节规律：跟随整体大盘波动。'
  };

  // Step 2 Handlers (Category -> Quarter Split)
  const handleStep2Change = (catId: string, qId: string, field: 'ratio' | 'amount', val: string) => {
      if (field === 'amount' ? !isValidOneDecimal(val) : !isValidOneDecimal(val)) return;
      const numVal = parseFloat(val) || 0;
      const newPlan = { ...plan };

      // Ensure structure exists
      if (!newPlan.quarterlyCategorySplit) newPlan.quarterlyCategorySplit = {};
      QUARTERS.forEach(q => {
          if (!newPlan.quarterlyCategorySplit![q.id]) newPlan.quarterlyCategorySplit![q.id] = {};
      });

      // Get Annual Total for this Category
      const catTotal = newPlan.categorySplit.find(c => c.id === catId)?.amount || 0;

      let newRatio = 0;
      let newAmount = 0;

      if (field === 'ratio') {
          newRatio = numVal;
          newAmount = parseFloat((catTotal * (numVal / 100)).toFixed(2));
      } else {
          // Amount input is in 万元, convert to 元 for internal storage
          newAmount = parseFloat((numVal * 10000).toFixed(2));
          newRatio = catTotal > 0 ? parseFloat(((newAmount / catTotal) * 100).toFixed(1)) : 0;
      }

      // Update the specific cell
      newPlan.quarterlyCategorySplit[qId][catId] = { ratio: newRatio, amount: newAmount };

      // Sync Logic: Update Annual Quarter Split based on the sum of all categories for each quarter
      // We need to recalculate the total amount for each quarter
      const newQuarterSplit = newPlan.quarterSplit.map(q => {
          // Sum of all categories in this quarter
          const qSum = CATEGORIES.reduce((sum, c) => {
              const cell = newPlan.quarterlyCategorySplit?.[q.id]?.[c.id];
              return sum + (cell?.amount || 0);
          }, 0);
          
          return {
              ...q,
              amount: parseFloat(qSum.toFixed(2)),
              ratio: totalTarget > 0 ? parseFloat(((qSum / totalTarget) * 100).toFixed(1)) : 0
          };
      });
      newPlan.quarterSplit = newQuarterSplit;

      setPlan(newPlan);
  };

  // Initialize Step 2 Data if missing (Category-First Logic)
  useEffect(() => {
      if (step === 2) {
          const newPlan = { ...plan };
          let changed = false;
          if (!newPlan.quarterlyCategorySplit) {
              newPlan.quarterlyCategorySplit = {};
              changed = true;
          }
          
          // Ensure every cell is initialized
          QUARTERS.forEach(q => {
              if (!newPlan.quarterlyCategorySplit![q.id]) {
                  newPlan.quarterlyCategorySplit![q.id] = {};
                  changed = true;
              }
              
              CATEGORIES.forEach(c => {
                  if (!newPlan.quarterlyCategorySplit![q.id][c.id]) {
                      // Default Logic: Initialize with 0 as requested
                      newPlan.quarterlyCategorySplit![q.id][c.id] = {
                          ratio: 0,
                          amount: 0
                      };
                      changed = true;
                  }
              });
          });
          
          if (changed) setPlan(newPlan);
      }
  }, [step]);

  // Monthly Distribution Defaults
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

  // Step 3 Handlers (Monthly Weights)
  const handleStep3Change = (qId: string, mId: string, val: string) => {
      if (!isValidOneDecimal(val)) return;
      const numVal = parseFloat(val) || 0;
      const newPlan = { ...plan };
      if (!newPlan.monthlyWeights) newPlan.monthlyWeights = {};
      if (!newPlan.monthlyWeights[qId]) newPlan.monthlyWeights[qId] = {};
      
      newPlan.monthlyWeights[qId][mId] = numVal;
      setPlan(newPlan);
  };

  // Initialize Step 3 Data if missing
  useEffect(() => {
      if (step === 3) {
          const newPlan = { ...plan };
          let changed = false;
          if (!newPlan.monthlyWeights) {
              newPlan.monthlyWeights = {};
              changed = true;
          }

          QUARTERS.forEach(q => {
              if (!newPlan.monthlyWeights![q.id]) {
                  newPlan.monthlyWeights![q.id] = {};
                  
                  // Use Defaults
                  const relevantMonths = months.filter(m => {
                      const mNum = parseInt(m.id.split('-')[1], 10);
                      return q.months.includes(mNum);
                  });
                  
                  relevantMonths.forEach(m => {
                      const mNum = parseInt(m.id.split('-')[1], 10);
                      const defaultData = MONTHLY_DISTRIBUTION_DEFAULTS[q.id]?.[mNum];
                      const weight = defaultData ? defaultData.ratio : parseFloat((100 / relevantMonths.length).toFixed(1));
                      
                      newPlan.monthlyWeights![q.id][m.id] = weight;
                  });
                  changed = true;
              }
          });

          if (changed) setPlan(newPlan);
      }
  }, [step]);

  // Helper to get Quarter Data for Table (Step 4)
  const getQuarterRowData = (qId: string) => {
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
        const d = plan.monthlyData[m.id];
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

  // Handle Month Data Change in Step 4
  const handleMonthChange = (monthId: string, field: string, value: string) => {
    const newPlan = { ...plan };
    const monthData = newPlan.monthlyData[monthId];
    if (!monthData) return;

    if (field === 'scenario') monthData.scenario = value;
    if (field === 'logic') monthData.logic = value;
    
    if (field === 'ratio') {
        const numVal = parseFloat(value) || 0;
        monthData.ratio = numVal;
        monthData.total = parseFloat((totalTarget * (numVal / 100)).toFixed(2));
        // Scale category values
        const currentTotal = Object.values(monthData.categoryValues).reduce<number>((a, b) => a + (b as number), 0);
        if (currentTotal > 0) {
            Object.keys(monthData.categoryValues).forEach(k => {
                monthData.categoryValues[k] = parseFloat((monthData.categoryValues[k] * (monthData.total / currentTotal)).toFixed(2));
            });
        }
    }
    
    if (field === 'total') {
        const numVal = parseFloat(value) || 0;
        // Input is in 万元, convert to 元 for internal storage
        const amountInYuan = parseFloat((numVal * 10000).toFixed(2));
        monthData.total = amountInYuan;
        monthData.ratio = totalTarget > 0 ? parseFloat(((amountInYuan / totalTarget) * 100).toFixed(2)) : 0;
        // Scale category values
        const currentTotal = Object.values(monthData.categoryValues).reduce<number>((a, b) => a + (b as number), 0);
        if (currentTotal > 0) {
            Object.keys(monthData.categoryValues).forEach(k => {
                monthData.categoryValues[k] = parseFloat((monthData.categoryValues[k] * (monthData.total / currentTotal)).toFixed(2));
            });
        }
    }

    if (field.startsWith('cat_')) {
        const catId = field.split('_')[1];
        const numVal = parseFloat(value) || 0;
        // Input is in 万元, convert to 元 for internal storage
        const amountInYuan = parseFloat((numVal * 10000).toFixed(2));
        monthData.categoryValues[catId] = amountInYuan;

        // Update Total and Ratio
        const newTotal = Object.values(monthData.categoryValues).reduce<number>((a, b) => a + (b as number), 0);
        monthData.total = parseFloat(newTotal.toFixed(2));
        monthData.ratio = totalTarget > 0 ? parseFloat(((newTotal / totalTarget) * 100).toFixed(2)) : 0;
    }

    // Recalculate Category Split & Quarter Split based on new Monthly Data to keep consistency
    const newCatTotals: Record<string, number> = {};
    const newQuarterTotals: Record<string, number> = {};
    
    CATEGORIES.forEach(c => newCatTotals[c.id] = 0);

    // Sum up category totals from all months
    Object.values(newPlan.monthlyData).forEach((m: any) => {
        Object.entries(m.categoryValues).forEach(([cId, val]) => {
            if (newCatTotals[cId] !== undefined) newCatTotals[cId] += (val as number);
        });
    });

    // Sum up quarter totals
    QUARTERS.forEach(q => {
        const qMonths = q.months;
        const relevantMonths = months.filter(m => qMonths.includes(parseInt(m.id.split('-')[1], 10)));
        let qSum = 0;
        relevantMonths.forEach(m => {
            qSum += newPlan.monthlyData[m.id]?.total || 0;
        });
        newQuarterTotals[q.id] = parseFloat(qSum.toFixed(2));
    });

    // Update plan.categorySplit
    newPlan.categorySplit = newPlan.categorySplit.map(c => {
        const amount = parseFloat((newCatTotals[c.id] || 0).toFixed(2));
        const ratio = totalTarget > 0 ? parseFloat(((amount / totalTarget) * 100).toFixed(1)) : 0;
        return { ...c, amount, ratio };
    });

    // Update plan.quarterSplit
    newPlan.quarterSplit = newPlan.quarterSplit.map(q => {
        const amount = newQuarterTotals[q.id] || 0;
        const ratio = totalTarget > 0 ? parseFloat(((amount / totalTarget) * 100).toFixed(1)) : 0;
        return { ...q, amount, ratio };
    });

    setPlan(newPlan);
  };

  // Generate Final Data for Step 4 (Updated for Category -> Quarter Logic)
  const generateFinalData = () => {
      const newPlan = { ...plan };
      newPlan.monthlyData = {};

      QUARTERS.forEach(q => {
          // We don't rely on qTotal from quarterSplit directly for distribution, 
          // we build it bottom-up from categories.
          
          const qWeights = newPlan.monthlyWeights?.[q.id] || {};
          const relevantMonths = months.filter(m => {
              const mNum = parseInt(m.id.split('-')[1], 10);
              return q.months.includes(mNum);
          });

          relevantMonths.forEach(m => {
              const weight = qWeights[m.id] || 0; // Weight of this month in the quarter (e.g. 30%)
              
              const mCatValues: Record<string, number> = {};
              let mTotal = 0;

              CATEGORIES.forEach(c => {
                  // Amount of this Category in this Quarter
                  const cQAmount = newPlan.quarterlyCategorySplit?.[q.id]?.[c.id]?.amount || 0;
                  
                  // Amount of this Category in this Month
                  const cMAmount = parseFloat((cQAmount * (weight / 100)).toFixed(2));
                  
                  mCatValues[c.id] = cMAmount;
                  mTotal += cMAmount;
              });

              const mRatio = parseFloat(((mTotal / totalTarget) * 100).toFixed(1));

              // Get default scenario description
              const mNum = parseInt(m.id.split('-')[1], 10);
              const defaultDesc = MONTHLY_DISTRIBUTION_DEFAULTS[q.id]?.[mNum]?.desc || '';

              newPlan.monthlyData[m.id] = {
                  scenario: defaultDesc,
                  logic: '',
                  ratio: mRatio,
                  total: parseFloat(mTotal.toFixed(2)),
                  categoryValues: mCatValues
              };
          });
      });
      return newPlan;
  };

  useEffect(() => {
      if (step === 4) {
          setPlan(generateFinalData());
      }
  }, [step]);


  // Validation
  const catTotal = plan.categorySplit.reduce((s, c) => s + c.ratio, 0);
  const quarterTotal = plan.quarterSplit.reduce((s, q) => s + q.ratio, 0);
  const isStep1Valid = Math.abs(catTotal - 100) < 0.1 && Math.abs(quarterTotal - 100) < 0.1;

  // Step 2: 每个品类的季度百分比总和必须等于100%
  const isStep2Valid = CATEGORIES.every(c => {
    const catRatioSum = QUARTERS.reduce((sum, q) => sum + (plan.quarterlyCategorySplit?.[q.id]?.[c.id]?.ratio || 0), 0);
    return Math.abs(catRatioSum - 100) < 0.1;
  });

  // Step 3: 每个季度的月度权重总和必须等于100%
  const isStep3Valid = QUARTERS.every(q => {
    const relevantMonths = months.filter(m => q.months.includes(parseInt(m.id.split('-')[1], 10)));
    const qTotalWeight = relevantMonths.reduce((s, m) => s + (plan.monthlyWeights?.[q.id]?.[m.id] || 0), 0);
    return Math.abs(qTotalWeight - 100) < 0.1;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <Calculator className="mr-2 text-brand-600" size={20} />
                    目标拆解向导
                </h3>
                <p className="text-xs text-slate-500 mt-1">Total Target: <span className="font-bold text-brand-600">{(totalTarget / 10000).toFixed(2)}万元</span></p>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
            </button>
        </div>

        {/* Steps Indicator */}
        <div className="px-6 py-4 bg-white border-b border-slate-100">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
                {[1, 2, 3, 4].map(s => (
                    <div key={s} className="flex flex-col items-center relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                            step === s ? 'bg-brand-600 text-white shadow-lg shadow-brand-200 scale-110' : 
                            step > s ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                            {step > s ? <Check size={14} /> : s}
                        </div>
                        <span className={`text-[10px] mt-2 font-medium ${step === s ? 'text-brand-600' : 'text-slate-400'}`}>
                            {s === 1 ? '年度拆解' : s === 2 ? '季度品类' : s === 3 ? '月度权重' : '确认计划'}
                        </span>
                    </div>
                ))}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Category Split */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-700 mb-4 flex justify-between">
                            <span>各品类占比</span>
                            <div className="flex flex-col items-end">
                                <span className={`text-xs ${Math.abs(catTotal - 100) < 0.1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    Total: {catTotal.toFixed(1)}%
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    Current: {(plan.categorySplit.reduce((s, c) => s + c.amount, 0) / 10000).toFixed(2)}万元
                                </span>
                            </div>
                        </h4>
                        <div className="space-y-4">
                            {plan.categorySplit.map(c => (
                                <div key={c.id} className="flex flex-col gap-1">
                                    <div className="flex items-center text-xs gap-3">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORIES.find(cat => cat.id === c.id)?.color }}></span>
                                        <span className="w-16 truncate text-slate-600 font-medium flex-shrink-0">{c.name}</span>
                                        
                                        {/* Progress Bar */}
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full transition-all duration-300" 
                                                style={{ 
                                                    width: `${Math.min(c.ratio, 100)}%`, 
                                                    backgroundColor: CATEGORIES.find(cat => cat.id === c.id)?.color 
                                                }}
                                            ></div>
                                        </div>

                                        {/* Ratio Input */}
                                        <div className="flex items-center bg-slate-50 rounded border border-slate-200 px-2 py-1 w-20 flex-shrink-0 focus-within:border-brand-300 focus-within:ring-1 focus-within:ring-brand-100">
                                            <input 
                                                type="text" inputMode="decimal"
                                                className="w-full bg-transparent outline-none text-right font-mono text-slate-700 placeholder-slate-300"
                                                value={c.ratio || ''}
                                                placeholder="0"
                                                onChange={(e) => handleStep1Change('category', c.id, e.target.value)}
                                            />
                                            <span className="text-slate-400 ml-1">%</span>
                                        </div>

                                        {/* Amount Display (Read-only/Calculated) */}
                                        <div className="w-24 text-right text-slate-500 font-mono flex-shrink-0">
                                            {(c.amount / 10000).toFixed(4)}万元
                                        </div>
                                    </div>
                                    
                                    {/* Last Year Reference */}
                                    <div className="flex justify-end pr-1">
                                        <span className="text-[10px] text-slate-400 flex items-center">
                                            <History size={10} className="mr-1" /> 
                                            今年: {lastYearRatios.category[c.id] || 0}%
                                            <span className="ml-1">
                                                ({(totalTarget * 0.9 * ((lastYearRatios.category[c.id] || 0) / 100) / 10000).toFixed(4)}万元)
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quarterly Split */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-700 mb-4 flex justify-between">
                            <span>各季度占比</span>
                            <div className="flex flex-col items-end">
                                <span className={`text-xs ${Math.abs(quarterTotal - 100) < 0.1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    Total: {quarterTotal.toFixed(1)}%
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    Current: {(plan.quarterSplit.reduce((s, q) => s + q.amount, 0) / 10000).toFixed(2)}万元
                                </span>
                            </div>
                        </h4>
                        <div className="space-y-4">
                            {plan.quarterSplit.map(q => (
                                <div key={q.id} className="flex flex-col gap-1">
                                    <div className="flex items-center text-xs gap-3">
                                        <span className="w-20 truncate text-slate-600 font-medium flex-shrink-0">{q.name.split(' ')[0]}</span>
                                        
                                        {/* Progress Bar */}
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 transition-all duration-300" 
                                                style={{ width: `${Math.min(q.ratio, 100)}%` }}
                                            ></div>
                                        </div>

                                        {/* Ratio Input */}
                                        <div className="flex items-center bg-slate-50 rounded border border-slate-200 px-2 py-1 w-20 flex-shrink-0 focus-within:border-brand-300 focus-within:ring-1 focus-within:ring-brand-100">
                                            <input 
                                                type="text" inputMode="decimal"
                                                className="w-full bg-transparent outline-none text-right font-mono text-slate-700 placeholder-slate-300"
                                                value={q.ratio || ''}
                                                placeholder="0"
                                                onChange={(e) => handleStep1Change('quarter', q.id, e.target.value)}
                                            />
                                            <span className="text-slate-400 ml-1">%</span>
                                        </div>

                                        {/* Amount Display (Read-only/Calculated) */}
                                        <div className="w-24 text-right text-slate-500 font-mono flex-shrink-0">
                                            {(q.amount / 10000).toFixed(2)}万元
                                        </div>
                                    </div>
                                    
                                    {/* Last Year Reference */}
                                    <div className="flex justify-end pr-1">
                                        <span className="text-[10px] text-slate-400 flex items-center">
                                            <History size={10} className="mr-1" /> 
                                            今年: {lastYearRatios.quarterly[q.id] || 0}%
                                            <span className="ml-1">
                                                ({(totalTarget * 0.9 * ((lastYearRatios.quarterly[q.id] || 0) / 100) / 10000).toFixed(2)}万元)
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="max-w-6xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 w-32 sticky left-0 bg-slate-50 z-10">品类</th>
                                    <th className="px-4 py-3 min-w-[300px]">特点</th>
                                    {QUARTERS.map(q => (
                                        <th key={q.id} className="px-4 py-3 w-40 text-center bg-slate-50">
                                            <div className="flex flex-col items-center">
                                                <span>{q.id}</span>
                                                <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                    ({q.months.join(',')}月)
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {CATEGORIES.map(c => {
                                    const catTotal = plan.categorySplit.find(cat => cat.id === c.id)?.amount || 0;
                                    const catRatioSum = QUARTERS.reduce((sum, q) => sum + (plan.quarterlyCategorySplit?.[q.id]?.[c.id]?.ratio || 0), 0);
                                    
                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-4 font-medium sticky left-0 bg-white z-10 border-r border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }}></span>
                                                    {c.name}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1 pl-4">
                                                    Total: {(catTotal / 10000).toFixed(4)}万元
                                                </div>
                                                <div className={`text-xs mt-1 pl-4 ${Math.abs(catRatioSum - 100) < 0.1 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    Sum: {catRatioSum.toFixed(1)}%
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-xs text-slate-500 leading-relaxed whitespace-pre-line align-top">
                                                {CATEGORY_FEATURES[c.id] || '暂无描述'}
                                            </td>
                                            {QUARTERS.map(q => {
                                                const cell = plan.quarterlyCategorySplit?.[q.id]?.[c.id] || { ratio: 0, amount: 0 };
                                                
                                                // Calculate Last Year Reference
                                                const lyCatRatio = lastYearRatios.category[c.id] || 0;
                                                const lyQuarterRatio = lastYearRatios.quarterly[q.id] || 0;
                                                // Assuming last year total was 90% of this year's target
                                                const lyTotal = totalTarget * 0.9;
                                                const lyCatAmount = lyTotal * (lyCatRatio / 100);
                                                // This is a naive estimate assuming uniform seasonality across categories
                                                // In a real app, we'd have granular historical data
                                                const lyAmount = lyCatAmount * (lyQuarterRatio / 100);
                                                
                                                return (
                                                    <td key={q.id} className="px-4 py-4 align-top">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center bg-slate-50 rounded border border-slate-200 px-2 py-1 focus-within:border-brand-300 focus-within:ring-1 focus-within:ring-brand-100">
                                                                <input
                                                                    type="text" inputMode="decimal"
                                                                    className="w-full bg-transparent outline-none text-right font-mono text-slate-700"
                                                                    value={cell.ratio || ''}
                                                                    placeholder="0"
                                                                    onChange={(e) => handleStep2Change(c.id, q.id, 'ratio', e.target.value)}
                                                                />
                                                                <span className="text-slate-400 ml-1">%</span>
                                                            </div>
                                                            <div className="flex items-center bg-slate-50 rounded border border-slate-100 px-2 py-1">
                                                                <span className="w-full text-right font-mono text-slate-500">
                                                                    {cell.amount ? (cell.amount / 10000).toFixed(4) : '0.0000'}
                                                                </span>
                                                                <span className="text-slate-400 ml-1 text-[10px]">万元</span>
                                                            </div>

                                                            {/* Last Year Reference */}
                                                            <div className="text-[10px] text-slate-400 text-right mt-1">
                                                                今年: {(lyAmount / 10000).toFixed(4)}万元 ({lyQuarterRatio}%)
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-700 flex items-start">
                        <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                        设置每个季度内，各月份的进货权重（占比）。
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {QUARTERS.map(q => {
                            const relevantMonths = months.filter(m => {
                                const mNum = parseInt(m.id.split('-')[1], 10);
                                return q.months.includes(mNum);
                            });
                            const qTotalWeight = relevantMonths.reduce((s, m) => s + (plan.monthlyWeights?.[q.id]?.[m.id] || 0), 0);
                            const qAmount = plan.quarterSplit.find(qs => qs.id === q.id)?.amount || 0;

                            return (
                                <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-700 mb-3 text-sm flex justify-between">
                                        <span>{q.name.split(' ')[0]} 月度权重</span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-slate-400">
                                                季度总额: {(qAmount / 10000).toFixed(2)}万元
                                            </span>
                                            <span className={`text-xs ${Math.abs(qTotalWeight - 100) < 0.1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                Sum: {qTotalWeight.toFixed(1)}%
                                            </span>
                                        </div>
                                    </h4>
                                    <div className="space-y-3">
                                        {relevantMonths.map(m => {
                                            const mNum = parseInt(m.id.split('-')[1], 10);
                                            const defaultDesc = MONTHLY_DISTRIBUTION_DEFAULTS[q.id]?.[mNum]?.desc;
                                            const weight = plan.monthlyWeights?.[q.id]?.[m.id] || 0;
                                            const monthAmount = qAmount * (weight / 100);

                                            return (
                                                <div key={m.id} className="flex items-center gap-3">
                                                    <div className="w-24 flex flex-col">
                                                        <span className="text-xs text-slate-600 font-medium">{m.shortLabel}</span>
                                                        {defaultDesc && <span className="text-[10px] text-slate-400">{defaultDesc}</span>}
                                                    </div>
                                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-purple-500" style={{ width: `${Math.min(weight, 100)}%` }}></div>
                                                    </div>
                                                    <input
                                                        type="text" inputMode="decimal"
                                                        className="w-16 text-right text-sm border rounded px-2 py-1 focus:border-brand-500 outline-none"
                                                        value={weight || ''}
                                                        placeholder="0"
                                                        onChange={(e) => handleStep3Change(q.id, m.id, e.target.value)}
                                                    />
                                                    <span className="text-xs text-slate-400">%</span>
                                                    <span className="w-20 text-right text-xs text-slate-500 font-mono">
                                                        {(monthAmount / 10000).toFixed(2)}万元
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 w-24 sticky left-0 bg-slate-50 z-10">时间</th>
                                        <th className="px-4 py-3 w-32">场景</th>
                                        <th className="px-4 py-3 w-16 text-right">占比</th>
                                        <th className="px-4 py-3 w-24 text-right">总进货(万元)</th>
                                        {CATEGORIES.map(c => (
                                            <th key={c.id} className="px-4 py-3 w-24 text-right" style={{ color: c.color }}>{c.name}(万元)</th>
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
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span>{(totalAmount / 10000).toFixed(2)}万元</span>
                                                        </div>
                                                    </td>
                                                    {CATEGORIES.map(c => (
                                                        <td key={c.id} className="px-4 py-3 text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span>{(catTotals[c.id] / 10000).toFixed(4)}万元</span>
                                                                <span className="text-[10px] text-slate-400 font-normal">
                                                                    {totalAmount > 0 ? ((catTotals[c.id] / totalAmount) * 100).toFixed(1) : 0}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>

                                                {/* Last Year Quarter Row (Mock) */}
                                                <tr className="text-slate-400 italic bg-slate-50/20">
                                                    <td className="px-4 py-2 sticky left-0 bg-slate-50/20">今年{q.id}</td>
                                                    <td className="px-4 py-2"></td>
                                                    <td className="px-4 py-2"></td>
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span>*{ ((totalAmount * 0.9) / 10000).toFixed(2) }万元*</span>
                                                        </div>
                                                    </td>
                                                    {CATEGORIES.map(c => (
                                                        <td key={c.id} className="px-4 py-2 text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span>*{ ((catTotals[c.id] * 0.9) / 10000).toFixed(4) }万元*</span>
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>

                                                {/* Monthly Rows */}
                                                {relevantMonths.map(m => {
                                                    const d = plan.monthlyData[m.id];
                                                    if (!d) return null;

                                                    return (
                                                        <React.Fragment key={m.id}>
                                                            <tr className="hover:bg-blue-50/30 transition-colors group">
                                                                <td className="px-4 py-2 font-medium text-slate-700 sticky left-0 bg-white group-hover:bg-blue-50/30">{m.shortLabel}</td>
                                                                <td className="px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full bg-transparent border-b border-transparent focus:border-brand-300 outline-none text-slate-600 placeholder-slate-300"
                                                                        placeholder="输入场景..."
                                                                        value={d.scenario}
                                                                        onChange={(e) => handleMonthChange(m.id, 'scenario', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2 text-right">
                                                                    <div className="flex items-center justify-end">
                                                                        <input
                                                                            type="text" inputMode="decimal"
                                                                            className="w-10 bg-transparent text-right outline-none border-b border-transparent focus:border-brand-300"
                                                                            value={d.ratio}
                                                                            onChange={(e) => handleMonthChange(m.id, 'ratio', e.target.value)}
                                                                        />
                                                                        <span>%</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-2 text-right">
                                                                    <div className="flex items-center justify-end">
                                                                        <input
                                                                            type="text" inputMode="decimal"
                                                                            className="w-20 bg-transparent text-right outline-none font-medium text-slate-800 border-b border-transparent focus:border-brand-300"
                                                                            value={d.total ? (d.total / 10000).toFixed(2) : ''}
                                                                            placeholder="0"
                                                                            onChange={(e) => handleMonthChange(m.id, 'total', e.target.value)}
                                                                        />
                                                                        <span className="text-[10px] text-slate-400 ml-0.5">万元</span>
                                                                    </div>
                                                                </td>
                                                                {CATEGORIES.map(c => (
                                                                    <td key={c.id} className="px-4 py-2 text-right">
                                                                        <div className="flex flex-col items-end">
                                                                            <div className="flex items-center justify-end">
                                                                                <input
                                                                                    type="text" inputMode="decimal"
                                                                                    className="w-16 bg-transparent text-right outline-none border-b border-transparent focus:border-brand-300 text-slate-600"
                                                                                    value={d.categoryValues[c.id] ? ((d.categoryValues[c.id] as number) / 10000).toFixed(4) : ''}
                                                                                    placeholder="0"
                                                                                    onChange={(e) => handleMonthChange(m.id, `cat_${c.id}`, e.target.value)}
                                                                                />
                                                                                <span className="text-[9px] text-slate-400 ml-0.5">万元</span>
                                                                            </div>
                                                                            <span className="text-[9px] text-slate-400">
                                                                                {d.total > 0 ? (((d.categoryValues[c.id] as number) / d.total) * 100).toFixed(1) : 0}%
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                            {/* Last Year Month Row (Mock) */}
                                                            <tr className="text-slate-400 italic text-[10px] bg-slate-50/10 border-b border-slate-100">
                                                                <td className="px-4 py-1 sticky left-0 bg-slate-50/10 pl-8">今年{m.shortLabel}</td>
                                                                <td colSpan={2}></td>
                                                                <td className="px-4 py-1 text-right">
                                                                    <div className="flex flex-col items-end">
                                                                        <span>*{ ((d.total * 0.9) / 10000).toFixed(2) }万元*</span>
                                                                    </div>
                                                                </td>
                                                                {CATEGORIES.map(c => (
                                                                    <td key={c.id} className="px-4 py-1 text-right">
                                                                        <div className="flex flex-col items-end">
                                                                            <span>*{ (((d.categoryValues[c.id] as number) * 0.9) / 10000).toFixed(4) }万元*</span>
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
                                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                                        <td className="px-4 py-4 sticky left-0 bg-slate-100">明年计划</td>
                                        <td className="px-4 py-4"></td>
                                        <td className="px-4 py-4 text-right">100%</td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span>{(plan.categorySplit.reduce((sum, c) => sum + c.amount, 0) / 10000).toFixed(2)}万元</span>
                                            </div>
                                        </td>
                                        {CATEGORIES.map(c => {
                                            const catVal = plan.categorySplit.find(cat => cat.id === c.id)?.amount || 0;
                                            const total = plan.categorySplit.reduce((sum, c) => sum + c.amount, 0);
                                            return (
                                                <td key={c.id} className="px-4 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span>{(catVal / 10000).toFixed(4)}万元</span>
                                                        <span className="text-[10px] text-slate-500 font-normal">
                                                            {total > 0 ? ((catVal / total) * 100).toFixed(1) : 0}%
                                                        </span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>

                                    <tr className="bg-slate-50 text-slate-500 font-medium italic">
                                        <td className="px-4 py-4 sticky left-0 bg-slate-50">今年实际</td>
                                        <td className="px-4 py-4"></td>
                                        <td className="px-4 py-4 text-right"></td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span>{((totalTarget * 0.9) / 10000).toFixed(2)}万元</span>
                                            </div>
                                        </td>
                                        {CATEGORIES.map(c => {
                                            // Use historical ratios if available, otherwise fallback to 0.9 of current
                                            const histRatio = lastYearRatios.category[c.id] || 0;
                                            const histTotal = totalTarget * 0.9;
                                            const histVal = histTotal * (histRatio / 100);

                                            return (
                                                <td key={c.id} className="px-4 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span>{(histVal / 10000).toFixed(4)}万元</span>
                                                        <span className="text-[10px] text-slate-400 font-normal">
                                                            {histRatio.toFixed(1)}%
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
                </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
            <button 
                onClick={step === 1 ? onCancel : () => setStep(s => s - 1)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors flex items-center"
            >
                {step === 1 ? '取消' : <><ChevronLeft size={16} className="mr-1" /> 上一步</>}
            </button>
            <button
                onClick={step === 4 ? () => onSave(plan) : () => setStep(s => s + 1)}
                disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) || (step === 3 && !isStep3Valid)}
                className="px-6 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {step === 4 ? <><Check size={16} className="mr-2" /> 确认生成计划</> :
                 (step === 1 && !isStep1Valid) ? <>{'请调整至100%'} <ChevronRight size={16} className="ml-1" /></> :
                 (step === 2 && !isStep2Valid) ? <>{'请将各品类调节至100%'} <ChevronRight size={16} className="ml-1" /></> :
                 (step === 3 && !isStep3Valid) ? <>{'请将各季度拆解至100%'} <ChevronRight size={16} className="ml-1" /></> :
                 <>{'下一步'} <ChevronRight size={16} className="ml-1" /></>}
            </button>
        </div>
      </div>
    </div>
  );
};