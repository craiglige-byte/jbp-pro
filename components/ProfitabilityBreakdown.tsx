import React, { useState } from 'react';
import { JBPObjective, JBPProfitabilityPlan } from '../types';
import { ProfitabilityBreakdownWizard } from './ProfitabilityBreakdownWizard';
import { PieChart, Target, TrendingUp, DollarSign } from 'lucide-react';

interface ProfitabilityBreakdownProps {
  objective: JBPObjective;
  updateObjective: (updates: Partial<JBPObjective>) => void;
  salesTarget: number;
  purchaseTarget: number;
  readOnly?: boolean;
  highlight?: boolean;
}

const ProfitabilityBreakdown: React.FC<ProfitabilityBreakdownProps> = ({
  objective,
  updateObjective,
  salesTarget,
  purchaseTarget,
  readOnly = false,
  highlight = false
}) => {
  const [showWizard, setShowWizard] = useState(false);
  const { profitabilityPlan: plan } = objective;

  // Calculate derived values for display
  const totalRevenue = plan ? plan.salesRevenue + plan.rebateRevenue : 0;
  const totalCost = plan ? plan.cogs + plan.totalOperatingExpenses : 0;
  const netProfit = plan ? totalRevenue - totalCost : 0;
  const netProfitMargin = plan && totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Header with Wizard Button */}
      <div className="flex justify-between items-end border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
            <TrendingUp size={16} className="mr-2 text-brand-500" /> 盈利目标拆解
          </h4>
          {plan && (
            <div className="text-lg font-bold text-slate-800 flex items-center">
              年度利润规划表
            </div>
          )}
        </div>
        {!readOnly && (
        <button
          onClick={() => setShowWizard(true)}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm mb-1 border-2 ${
            highlight && !plan
              ? 'bg-red-50 text-red-600 border-red-400 hover:bg-red-100 animate-pulse-border'
              : 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700 shadow-md'
          }`}
        >
          <Target size={16} className="mr-2" />
          {plan ? '调整拆解' : '目标拆解'}
        </button>
        )}
      </div>

      {/* Main Table - Only show if plan exists */}
      {plan && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">项目</th>
                  <th className="px-4 py-3 text-right">2026年实际</th>
                  <th className="px-4 py-3 text-right">2026年占比</th>
                  <th className="px-4 py-3 text-right bg-emerald-50 text-emerald-800">2027年目标</th>
                  <th className="px-4 py-3 text-right">2027年占比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Revenue Section */}
                <tr className="bg-slate-50/50 font-bold text-slate-800">
                  <td className="px-4 py-2">一、总营收</td>
                  <td className="px-4 py-2 text-right">765.0万元</td>
                  <td className="px-4 py-2 text-right">100.0%</td>
                  <td className="px-4 py-2 text-right bg-emerald-50 text-emerald-800">{totalRevenue.toFixed(1)}万元</td>
                  <td className="px-4 py-2 text-right">100.0%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-8 text-slate-600">1. 产品销售收入</td>
                  <td className="px-4 py-2 text-right text-slate-500">750.0万元</td>
                  <td className="px-4 py-2 text-right text-slate-500">98.0%</td>
                  <td className="px-4 py-2 text-right bg-emerald-50 text-emerald-700">{plan.salesRevenue.toFixed(1)}万元</td>
                  <td className="px-4 py-2 text-right">{(totalRevenue > 0 ? (plan.salesRevenue / totalRevenue) * 100 : 0).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 pl-8 text-slate-600">2. 厂家返利收入</td>
                  <td className="px-4 py-2 text-right text-slate-500">15.0万元</td>
                  <td className="px-4 py-2 text-right text-slate-500">2.0%</td>
                  <td className="px-4 py-2 text-right bg-emerald-50 text-emerald-700">{plan.rebateRevenue.toFixed(1)}万元</td>
                  <td className="px-4 py-2 text-right">{(totalRevenue > 0 ? (plan.rebateRevenue / totalRevenue) * 100 : 0).toFixed(1)}%</td>
                </tr>

                {/* COGS Section */}
                <tr className="bg-slate-50/50 font-bold text-slate-800">
                  <td className="px-4 py-2">二、减：商品成本</td>
                  <td className="px-4 py-2 text-right">600.0万元</td>
                  <td className="px-4 py-2 text-right">78.4%</td>
                  <td className="px-4 py-2 text-right bg-emerald-50 text-emerald-800">{plan.cogs.toFixed(1)}万元</td>
                  <td className="px-4 py-2 text-right">{(totalRevenue > 0 ? (plan.cogs / totalRevenue) * 100 : 0).toFixed(1)}%</td>
                </tr>

                {/* OpEx Section */}
                <tr className="bg-slate-50/50 font-bold text-slate-800">
                  <td className="px-4 py-2">三、减：运营费用</td>
                  <td className="px-4 py-2 text-right">130.0万元</td>
                  <td className="px-4 py-2 text-right">17.0%</td>
                  <td className="px-4 py-2 text-right bg-emerald-50 text-emerald-800">{plan.totalOperatingExpenses.toFixed(1)}万元</td>
                  <td className="px-4 py-2 text-right">{(totalRevenue > 0 ? (plan.totalOperatingExpenses / totalRevenue) * 100 : 0).toFixed(1)}%</td>
                </tr>
                
                {/* Detailed Expenses */}
                {plan.expenses.map(cat => (
                  <React.Fragment key={cat.id}>
                    <tr className="bg-slate-50/20 font-medium text-slate-700">
                      <td className="px-4 py-2 pl-8">({cat.name})</td>
                      <td className="px-4 py-2 text-right text-slate-400">
                        {cat.items.reduce((s, i) => s + i.lastYearActual, 0).toFixed(1)}万元
                      </td>
                      <td className="px-4 py-2 text-right text-slate-400">
                        {cat.items.reduce((s, i) => s + i.lastYearRatio, 0).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-right bg-emerald-50 text-emerald-700">
                        {cat.items.reduce((s, i) => s + i.thisYearTarget, 0).toFixed(1)}万元
                      </td>
                      <td className="px-4 py-2 text-right">
                        {cat.items.reduce((s, i) => s + i.thisYearRatio, 0).toFixed(1)}%
                      </td>
                    </tr>
                    {cat.items.map(item => (
                      <tr key={item.id} className="text-xs hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-1 pl-12 text-slate-500">{item.name}</td>
                        <td className="px-4 py-1 text-right text-slate-400">{item.lastYearActual.toFixed(1)}万元</td>
                        <td className="px-4 py-1 text-right text-slate-400">{item.lastYearRatio.toFixed(1)}%</td>
                        <td className="px-4 py-1 text-right bg-emerald-50 text-emerald-600">{item.thisYearTarget.toFixed(1)}万元</td>
                        <td className="px-4 py-1 text-right text-slate-600">{item.thisYearRatio.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {/* Net Profit Section */}
                <tr className="bg-emerald-50 font-bold text-emerald-800 border-t-2 border-emerald-100">
                  <td className="px-4 py-3">四、净利润</td>
                  <td className="px-4 py-3 text-right">35.0万元</td>
                  <td className="px-4 py-3 text-right">4.6%</td>
                  <td className="px-4 py-3 text-right">{netProfit.toFixed(1)}万元</td>
                  <td className="px-4 py-3 text-right">{netProfitMargin.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wizard Modal */}
      {showWizard && (
        <ProfitabilityBreakdownWizard
          objective={objective}
          salesTarget={salesTarget}
          purchaseTarget={purchaseTarget}
          onSave={(newPlan) => {
            updateObjective({ profitabilityPlan: newPlan });
            setShowWizard(false);
          }}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
};

export default ProfitabilityBreakdown;
