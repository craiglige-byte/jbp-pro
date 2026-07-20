import React, { useState } from 'react';
import { JBPObjective, JBPSalesPlan } from '../types';
import { PieChart, Target, Edit2, Table } from 'lucide-react';
import { SalesBreakdownWizard } from './SalesBreakdownWizard';

interface SalesBreakdownProps {
  objective: JBPObjective;
  onUpdate: (objective: JBPObjective) => void;
  readOnly?: boolean;
  highlight?: boolean;
}

const MONTHS = [
  { id: '12', label: '12月', quarter: 'Q1' },
  { id: '01', label: '1月', quarter: 'Q1' },
  { id: '02', label: '2月', quarter: 'Q1' },
  { id: '03', label: '3月', quarter: 'Q2' },
  { id: '04', label: '4月', quarter: 'Q2' },
  { id: '05', label: '5月', quarter: 'Q2' },
  { id: '06', label: '6月', quarter: 'Q3' },
  { id: '07', label: '7月', quarter: 'Q3' },
  { id: '08', label: '8月', quarter: 'Q3' },
  { id: '09', label: '9月', quarter: 'Q4' },
  { id: '10', label: '10月', quarter: 'Q4' },
  { id: '11', label: '11月', quarter: 'Q4' }
];

export const SalesBreakdown: React.FC<SalesBreakdownProps> = ({ objective, onUpdate, readOnly = false, highlight = false }) => {
  const [showWizard, setShowWizard] = useState(false);

  const handleSave = (plan: JBPSalesPlan) => {
    const updatedObjective = {
      ...objective,
      salesPlan: plan
    };
    onUpdate(updatedObjective);
    setShowWizard(false);
  };

  // Extract total target from string like "... 145,000 箱 ..."
  const totalTarget = React.useMemo(() => {
    const match = objective.targetValue.match(/([\d,]+)\s*箱/);
    if (match && match[1]) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
    // Fallback: try to find the first large number if specific format not found
    const firstNum = objective.targetValue.match(/([\d,]+)/);
    return firstNum ? parseInt(firstNum[1].replace(/,/g, ''), 10) : 0;
  }, [objective.targetValue]);

  const salesPlan = objective.salesPlan;

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-2">
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  <Table size={16} className="mr-2 text-brand-500" /> 销售目标拆解
              </h4>
              {salesPlan && (
                <div className="text-lg font-bold text-slate-800 flex items-center">
                    年度销售规划表
                    <span className="ml-3 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Total: {totalTarget.toLocaleString()} 箱
                    </span>
                </div>
              )}
          </div>
          {!readOnly && (
          <button
            onClick={() => setShowWizard(true)}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm mb-1 border-2 ${
              highlight && !salesPlan
                ? 'bg-red-50 text-red-600 border-red-400 hover:bg-red-100 animate-pulse-border'
                : 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700 shadow-md'
            }`}
          >
            <Target size={16} className="mr-2" />
            {salesPlan ? '调整拆解' : '目标拆解'}
          </button>
          )}
      </div>

      {/* Summary View (2D Table) */}
      {salesPlan && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 sticky left-0 bg-slate-50">月份</th>
                            <th className="px-4 py-3 text-right">占比</th>
                            {salesPlan.personnelBreakdown.map(p => (
                                <th key={p.id} className="px-4 py-3 text-right">
                                    <div>{p.area}</div>
                                    <div className="text-[10px] font-normal">{p.thisYearManager} ({p.thisYearRatio}%)</div>
                                </th>
                            ))}
                            <th className="px-4 py-3 text-right font-bold bg-emerald-50 text-emerald-800">全司合计(箱)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {salesPlan.timeBreakdown.map(t => {
                            const isQuarter = t.type === 'quarter';
                            return (
                                <tr key={t.id} className={isQuarter ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50/50'}>
                                    <td className={`px-4 py-3 sticky left-0 ${isQuarter ? 'bg-slate-50' : 'bg-white'}`}>{t.label}</td>
                                    <td className="px-4 py-3 text-right text-slate-500">{t.thisYearRatio.toFixed(isQuarter ? 1 : 2)}%</td>
                                    {salesPlan.personnelBreakdown.map(p => {
                                        let cellValue = 0;
                                        if (salesPlan.monthlyAreaTargets) {
                                            // Use matrix data if available
                                            cellValue = isQuarter 
                                                ? MONTHS.filter(m => m.quarter === t.id).reduce((sum, m) => sum + (salesPlan.monthlyAreaTargets?.[m.id]?.[p.id] || 0), 0)
                                                : (salesPlan.monthlyAreaTargets[t.id]?.[p.id] || 0);
                                        } else {
                                            // Fallback to simple calculation
                                            cellValue = Math.round(t.thisYearTarget * (p.thisYearRatio / 100));
                                        }
                                        
                                        return (
                                            <td key={p.id} className="px-4 py-3 text-right text-slate-600">
                                                {cellValue.toLocaleString()}箱
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-3 text-right font-bold bg-emerald-50 text-emerald-700">
                                        {t.thisYearTarget.toLocaleString()}箱
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="bg-emerald-50 font-bold text-emerald-800 border-t-2 border-emerald-100">
                            <td className="px-4 py-3 sticky left-0 bg-emerald-50">全年合计</td>
                            <td className="px-4 py-3 text-right">100%</td>
                            {salesPlan.personnelBreakdown.map(p => (
                                <td key={p.id} className="px-4 py-3 text-right">
                                    {p.thisYearTarget.toLocaleString()}箱
                                </td>
                            ))}
                            <td className="px-4 py-3 text-right text-emerald-700">
                                {totalTarget.toLocaleString()}箱
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Wizard Modal */}
      {showWizard && (
        <SalesBreakdownWizard 
            objective={objective}
            totalTarget={totalTarget}
            onSave={handleSave}
            onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
};
