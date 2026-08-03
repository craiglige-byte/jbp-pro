import React, { useState, useMemo } from 'react';
import { JBPObjective, JBPInventoryPlan, JBPProductCategory } from '../types';
import { Target, Table } from 'lucide-react';
import { InventoryBreakdownWizard } from './InventoryBreakdownWizard';

interface InventoryBreakdownProps {
  objective: JBPObjective;
  updateObjective: (updates: Partial<JBPObjective>) => void;
  productCategories: JBPProductCategory[];
  purchasePlan?: any;
  salesPlan?: any;
  salesTarget?: string;
  inventoryTarget?: string;
  months: { id: string; label: string; shortLabel: string }[];
  readOnly?: boolean;
  highlight?: boolean;
}

const InventoryBreakdown: React.FC<InventoryBreakdownProps> = ({
  objective,
  updateObjective,
  productCategories,
  purchasePlan,
  salesPlan,
  salesTarget,
  inventoryTarget,
  months,
  readOnly = false,
  highlight = false
}) => {
  const [showWizard, setShowWizard] = useState(false);
  const inventoryPlan = objective.inventoryPlan;

  // Extract total sales target in 箱 from new format: "销售目标 xxx 万元（约合 xxx 箱）"
  const totalSalesVolume = React.useMemo(() => {
    if (!salesTarget) return 100000;
    const newMatch = salesTarget.match(/约合\s*([\d,]+)\s*箱/);
    if (newMatch && newMatch[1]) {
      return parseInt(newMatch[1].replace(/,/g, ''), 10);
    }
    const oldMatch = salesTarget.match(/([\d,]+)\s*箱/);
    if (oldMatch && oldMatch[1]) {
      return parseInt(oldMatch[1].replace(/,/g, ''), 10);
    }
    return 100000;
  }, [salesTarget]);

  // Extract target turnover days from 设定目标 守住库存健康
  const targetTurnoverDays = React.useMemo(() => {
    const src = inventoryTarget || objective.targetValue;
    const match = src?.match(/≤\s*(\d+)\s*天/);
    return match ? parseInt(match[1], 10) : 30;
  }, [inventoryTarget, objective.targetValue]);

  // Live lookup: resolve each month's sales estimate from latest salesPlan
  const getLiveSalesForMonth = (monthId: string): number => {
    if (!salesPlan?.timeBreakdown) return 0;
    const suffix = monthId.split('-')[1];
    const d = salesPlan.timeBreakdown.find((t: any) => t.id === suffix);
    return d ? d.thisYearTarget : 0;
  };

  // Compute live row data from saved scenario + latest salesPlan + saved categorySettings
  const liveMonthlyRows = useMemo(() => {
    if (!inventoryPlan) return [];
    return inventoryPlan.monthlyPlan.map(row => {
      const freshSales = getLiveSalesForMonth(row.monthId);
      const liveCatVals: Record<string, number> = {};
      let liveTotal = 0;
      inventoryPlan.categorySettings.forEach(cat => {
        const catSales = freshSales * (cat.ratio / 100);
        const targetStock = Math.round(catSales * (cat.turnoverDays / 30));
        liveCatVals[cat.categoryId] = targetStock;
        liveTotal += targetStock;
      });
      return {
        monthId: row.monthId,
        scenario: row.scenario,
        nextMonthSalesTarget: freshSales,
        categoryValues: liveCatVals,
        total: liveTotal
      };
    });
  }, [inventoryPlan, salesPlan]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-2">
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  <Table size={16} className="mr-2 text-brand-500" /> 库存目标拆解
              </h4>
              {inventoryPlan && (
                <div className="text-lg font-bold text-slate-800 flex items-center">
                    年度库存规划表
                    <span className="ml-3 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Target: ≤{targetTurnoverDays}天
                    </span>
                </div>
              )}
          </div>
          {!readOnly && (
          <button
            onClick={() => setShowWizard(true)}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm mb-1 border-2 ${
              highlight && !inventoryPlan
                ? 'bg-red-50 text-red-600 border-red-400 hover:bg-red-100 animate-pulse-border'
                : 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700 shadow-md'
            }`}
          >
            <Target size={16} className="mr-2" />
            {inventoryPlan ? '调整拆解' : '目标拆解'}
          </button>
          )}
      </div>

      {/* Summary View (Table) */}
      {inventoryPlan && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10">月份</th>
                            <th className="px-4 py-3 min-w-[300px]">库存场景</th>
                            <th className="px-4 py-3 text-center">
                                <div>销量预估</div>
                                <div className="text-[10px] font-normal text-slate-400 whitespace-normal max-w-[160px] mx-auto">取自销售目标拆解-月度预估销售箱数。若需修改，去调整销售目标拆解。</div>
                            </th>
                            {inventoryPlan.categorySettings.map(cat => (
                                <th key={cat.categoryId} className="px-4 py-3 text-right">
                                    <div>{cat.categoryName}</div>
                                    <div className="text-[10px] font-normal">{cat.turnoverDays}天</div>
                                </th>
                            ))}
                            <th className="px-4 py-3 text-right font-bold bg-emerald-50 text-emerald-800 sticky right-0 z-10">月末目标库存</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {liveMonthlyRows.map((row) => (
                            <tr key={row.monthId} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-medium text-slate-700 sticky left-0 bg-white z-10">
                                    {months.find(m => m.id === row.monthId)?.shortLabel || row.monthId}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                    {row.scenario}
                                </td>
                                <td className="px-4 py-3 text-center text-slate-500">
                                    {row.nextMonthSalesTarget != null ? `${row.nextMonthSalesTarget.toLocaleString()}箱` : '-'}
                                </td>
                                {inventoryPlan.categorySettings.map(cat => (
                                    <td key={cat.categoryId} className="px-4 py-3 text-right text-slate-600">
                                        {row.categoryValues[cat.categoryId]?.toLocaleString() || 0}箱
                                    </td>
                                ))}
                                <td className="px-4 py-3 text-right font-bold bg-emerald-50 text-emerald-700 sticky right-0 z-10">
                                    {row.total.toLocaleString()}箱
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Wizard Modal */}
      {showWizard && (
        <InventoryBreakdownWizard 
            objective={objective}
            onSave={(plan) => {
                updateObjective({ inventoryPlan: plan });
                setShowWizard(false);
            }}
            onCancel={() => setShowWizard(false)}
            productCategories={productCategories}
            purchasePlan={purchasePlan}
            salesPlan={salesPlan}
            totalSalesVolume={totalSalesVolume}
            targetTurnoverDays={targetTurnoverDays}
            months={months}
        />
      )}
    </div>
  );
};

export default InventoryBreakdown;
