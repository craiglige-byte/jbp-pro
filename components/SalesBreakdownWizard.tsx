import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronRight, ChevronLeft, Save, Calendar, Users, Table, Plus, Trash2 } from 'lucide-react';
import { JBPObjective, JBPSalesPlan, JBPSalesTimeBreakdown, JBPSalesPersonnelBreakdown } from '../types';

interface SalesBreakdownWizardProps {
  objective: JBPObjective;
  onSave: (plan: JBPSalesPlan) => void;
  onCancel: () => void;
  totalTarget: number; // In Cases
}

const STEPS = [
  { id: 'time', title: '时间节奏拆解', icon: Calendar },
  { id: 'personnel', title: '人员/片区拆解', icon: Users },
  { id: 'confirm', title: '确认计划', icon: Table }
];

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

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

// Mock Data for Initialization
const INITIAL_TIME_DATA: JBPSalesTimeBreakdown[] = [
  { id: '12', label: '12月', type: 'month', lastYearActuals: 10500, lastYearRatio: 7.2, scenario: '元旦备货启动，终端为新年提前备货', thisYearRatio: 0, thisYearTarget: 0 },
  { id: '01', label: '1月', type: 'month', lastYearActuals: 17200, lastYearRatio: 11.8, scenario: '春节前销售高峰，礼盒需求旺盛', thisYearRatio: 0, thisYearTarget: 0 },
  { id: '02', label: '2月', type: 'month', lastYearActuals: 8900, lastYearRatio: 6.1, scenario: '春节期间及节后淡季，销售回落', thisYearRatio: 0, thisYearTarget: 0 },
  { id: 'Q1', label: 'Q1', type: 'quarter', lastYearActuals: 36600, lastYearRatio: 25.1, scenario: '', thisYearRatio: 0, thisYearTarget: 0 },
  { id: '03', label: '3月', type: 'month', lastYearActuals: 8500, lastYearRatio: 5.8, scenario: '节后调整期，终端消化库存', thisYearRatio: 0, thisYearTarget: 0 },
  { id: '04', label: '4月', type: 'month', lastYearActuals: 11200, lastYearRatio: 7.7, scenario: '气温回暖，五一备货启动', thisYearRatio: 0, thisYearTarget: 0 },
  { id: '05', label: '5月', type: 'month', lastYearActuals: 9000, lastYearRatio: 6.2, scenario: '五一假期拉动，销售平稳回升', thisYearRatio: 0, thisYearTarget: 0 },
  { id: 'Q2', label: 'Q2', type: 'quarter', lastYearActuals: 28700, lastYearRatio: 19.7, scenario: '', thisYearRatio: 0, thisYearTarget: 0 },
  { id: '06', label: '6月', type: 'month', lastYearActuals: 15800, lastYearRatio: 10.8, scenario: '高温天气启动，夏季饮料销售旺季开始', thisYearRatio: 0, thisYearTarget: 0 },
  { id: '07', label: '7月', type: 'month', lastYearActuals: 18500, lastYearRatio: 12.7, scenario: '全年最热月份，饮料动销达到顶峰', thisYearRatio: 0, thisYearTarget: 0 },
  { id: '08', label: '8月', type: 'month', lastYearActuals: 17000, lastYearRatio: 11.6, scenario: '高温延续，但下旬开始回落', thisYearRatio: 0, thisYearTarget: 0 },
  { id: 'Q3', label: 'Q3', type: 'quarter', lastYearActuals: 51300, lastYearRatio: 35.1, scenario: '', thisYearRatio: 0, thisYearTarget: 0 },
  { id: '09', label: '9月', type: 'month', lastYearActuals: 10800, lastYearRatio: 7.4, scenario: '开学季，气温仍高，有一定补货需求', thisYearRatio: 0, thisYearTarget: 0 },
  { id: '10', label: '10月', type: 'month', lastYearActuals: 10500, lastYearRatio: 7.2, scenario: '国庆长假，聚会出游带动销售', thisYearRatio: 0, thisYearTarget: 0 },
  { id: '11', label: '11月', type: 'month', lastYearActuals: 8000, lastYearRatio: 5.5, scenario: '天气转冷，饮料进入传统淡季', thisYearRatio: 0, thisYearTarget: 0 },
  { id: 'Q4', label: 'Q4', type: 'quarter', lastYearActuals: 29300, lastYearRatio: 20.1, scenario: '', thisYearRatio: 0, thisYearTarget: 0 },
];

const INITIAL_PERSONNEL_DATA: JBPSalesPersonnelBreakdown[] = [
  { id: 'east', area: '东区', lastYearManager: '张三', lastYearActuals: 52000, lastYearRatio: 35.6, scenario: '城区核心市场，人口密集，便利店和超市覆盖率高，夏季饮料销量突出', thisYearRatio: 35.0, thisYearTarget: 0, thisYearManager: '张三' },
  { id: 'west', area: '西区', lastYearManager: '李四', lastYearActuals: 43500, lastYearRatio: 29.8, scenario: '城乡结合部，传统食杂店为主，春节和国庆销量集中', thisYearRatio: 30.0, thisYearTarget: 0, thisYearManager: '李四' },
  { id: 'south', area: '南区', lastYearManager: '王五', lastYearActuals: 36200, lastYearRatio: 24.8, scenario: '新兴开发区，工厂和学校较多，团购潜力大', thisYearRatio: 25.0, thisYearTarget: 0, thisYearManager: '王五' },
  { id: 'self', area: '经销商自营', lastYearManager: '老板/专员', lastYearActuals: 14200, lastYearRatio: 9.7, scenario: '企事业单位团购、大客户直营，节日福利订单为主', thisYearRatio: 10.0, thisYearTarget: 0, thisYearManager: '老板/专员' },
];

export const SalesBreakdownWizard: React.FC<SalesBreakdownWizardProps> = ({ objective, onSave, onCancel, totalTarget }) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Input validation: non-negative, at most 1 decimal place
  const isValidOneDecimal = (val: string): boolean => {
    if (val === '') return true;
    return /^\d*\.?\d{0,1}$/.test(val);
  };
  
  // State for Step 1: Time Breakdown
  const [timeData, setTimeData] = useState<JBPSalesTimeBreakdown[]>(() => {
    if (objective.salesPlan?.timeBreakdown) return objective.salesPlan.timeBreakdown;
    // Initialize with totalTarget calculation
    return INITIAL_TIME_DATA.map(d => ({
      ...d,
      thisYearTarget: Math.round(totalTarget * (d.thisYearRatio / 100))
    }));
  });

  // State for Step 2: Personnel Breakdown
  const [personnelData, setPersonnelData] = useState<JBPSalesPersonnelBreakdown[]>(() => {
    if (objective.salesPlan?.personnelBreakdown) return objective.salesPlan.personnelBreakdown;
    return INITIAL_PERSONNEL_DATA.map(d => ({
      ...d,
      thisYearTarget: Math.round(totalTarget * (d.thisYearRatio / 100))
    }));
  });

  // State for Step 3: Matrix Data (Month -> Area -> Value)
  const [matrixData, setMatrixData] = useState<Record<string, Record<string, number>>>(() => {
    if (objective.salesPlan?.monthlyAreaTargets) return objective.salesPlan.monthlyAreaTargets;
    
    // Initialize based on current timeData and personnelData
    const initialMatrix: Record<string, Record<string, number>> = {};
    timeData.filter(t => t.type === 'month').forEach(t => {
        initialMatrix[t.id] = {};
        personnelData.forEach(p => {
            initialMatrix[t.id][p.id] = Math.round(t.thisYearTarget * (p.thisYearRatio / 100));
        });
    });
    return initialMatrix;
  });

  // Recalculate targets when totalTarget changes or ratios change
  useEffect(() => {
    // Only update if we haven't manually edited the matrix (simple check: if matrix is empty or default)
    // For now, let's re-sync timeData and personnelData targets based on totalTarget
    // But preserve matrix if it exists? No, if totalTarget changes, everything should scale.
    // Let's assume totalTarget is stable during the wizard session unless changed externally.
    
    // Update Time Targets
    setTimeData(prev => prev.map(d => ({
      ...d,
      thisYearTarget: Math.round(totalTarget * (d.thisYearRatio / 100))
    })));
    
    // Update Personnel Targets
    setPersonnelData(prev => prev.map(d => ({
      ...d,
      thisYearTarget: Math.round(totalTarget * (d.thisYearRatio / 100))
    })));

    // Update Matrix (Reset to calculated values)
    // Note: This resets manual edits if totalTarget changes. Acceptable for now.
    setMatrixData(prev => {
        const newMatrix: Record<string, Record<string, number>> = {};
        INITIAL_TIME_DATA.filter(t => t.type === 'month').forEach(t => { // Use initial to get IDs
            const tData = timeData.find(td => td.id === t.id); // Get current ratio
            if (!tData) return;
            
            const tTarget = Math.round(totalTarget * (tData.thisYearRatio / 100));

            newMatrix[t.id] = {};
            personnelData.forEach(p => {
                newMatrix[t.id][p.id] = Math.round(tTarget * (p.thisYearRatio / 100));
            });
        });
        return newMatrix;
    });
  }, [totalTarget]);

  // Handler for Time Data Changes
  const handleTimeChange = (id: string, field: keyof JBPSalesTimeBreakdown, value: any) => {
    setTimeData(prev => {
      const newData = prev.map(item => item.id === id ? { ...item, [field]: value } : item);
      
      // If ratio changed, update target
      if (field === 'thisYearRatio') {
        const target = Math.round(totalTarget * (value / 100));
        newData.forEach(item => {
            if (item.id === id) item.thisYearTarget = target;
        });

        // Update Matrix Row
        setMatrixData(prevMatrix => {
            const newMatrix = { ...prevMatrix };
            if (!newMatrix[id]) newMatrix[id] = {};
            personnelData.forEach(p => {
                newMatrix[id][p.id] = Math.round(target * (p.thisYearRatio / 100));
            });
            return newMatrix;
        });
      }

      // Recalculate Quarters
      QUARTERS.forEach(q => {
        const qMonths = MONTHS.filter(m => m.quarter === q);
        const qRatio = qMonths.reduce((sum, m) => {
            const mData = newData.find(d => d.id === m.id);
            return sum + (mData?.thisYearRatio || 0);
        }, 0);
        const qTarget = qMonths.reduce((sum, m) => {
            const mData = newData.find(d => d.id === m.id);
            return sum + (mData?.thisYearTarget || 0);
        }, 0);
        
        const qIdx = newData.findIndex(d => d.id === q);
        if (qIdx !== -1) {
            newData[qIdx].thisYearRatio = parseFloat(qRatio.toFixed(1));
            newData[qIdx].thisYearTarget = qTarget;
        }
      });

      return newData;
    });
  };

  // Handler for Personnel Data Changes
  const handlePersonnelChange = (id: string, field: keyof JBPSalesPersonnelBreakdown, value: any) => {
    setPersonnelData(prev => {
      const newData = prev.map(item => item.id === id ? { ...item, [field]: value } : item);
      
      // If ratio changed, update target
      if (field === 'thisYearRatio') {
        const target = Math.round(totalTarget * (value / 100));
        newData.forEach(item => {
            if (item.id === id) item.thisYearTarget = target;
        });

        // Update Matrix Column (for all months)
        setMatrixData(prevMatrix => {
            const newMatrix = { ...prevMatrix };
            Object.keys(newMatrix).forEach(monthId => {
                const monthTarget = timeData.find(t => t.id === monthId)?.thisYearTarget || 0;
                if (!newMatrix[monthId]) newMatrix[monthId] = {};
                newMatrix[monthId][id] = Math.round(monthTarget * (value / 100));
            });
            return newMatrix;
        });
      }
      return newData;
    });
  };

  const handleAddPersonnel = () => {
    const newId = `area_${Date.now()}`;
    const newRow: JBPSalesPersonnelBreakdown = {
      id: newId,
      area: '新片区',
      lastYearManager: '',
      lastYearActuals: 0,
      lastYearRatio: 0,
      scenario: '',
      thisYearRatio: 0,
      thisYearTarget: 0,
      thisYearManager: ''
    };
    
    setPersonnelData(prev => [...prev, newRow]);
    
    // Update Matrix
    setMatrixData(prev => {
        const newMatrix = { ...prev };
        Object.keys(newMatrix).forEach(monthId => {
            if (!newMatrix[monthId]) newMatrix[monthId] = {};
            newMatrix[monthId][newId] = 0;
        });
        return newMatrix;
    });
  };

  const handleRemovePersonnel = (id: string) => {
    setPersonnelData(prev => prev.filter(p => p.id !== id));
    
    // Update Matrix
    setMatrixData(prev => {
        const newMatrix = { ...prev };
        Object.keys(newMatrix).forEach(monthId => {
            if (newMatrix[monthId]) {
                const updatedMonth = { ...newMatrix[monthId] };
                delete updatedMonth[id];
                newMatrix[monthId] = updatedMonth;
            }
        });
        return newMatrix;
    });
  };

  // Handler for Matrix Cell Changes (Step 3)
  const handleMatrixChange = (monthId: string, areaId: string, value: number) => {
    setMatrixData(prev => {
        const newMatrix = { ...prev };
        if (!newMatrix[monthId]) newMatrix[monthId] = {};
        newMatrix[monthId][areaId] = value;
        return newMatrix;
    });

    // Recalculate Totals (Time & Personnel)
    // Note: This is complex because changing one cell affects row/col totals.
    // We update the state, but we need to be careful about circular dependencies or re-renders.
    // Here we just update the matrix state. The totals in the view will be calculated from matrix.
    // BUT, we also need to update timeData and personnelData so they reflect the new totals.
    
    // We'll do this in a useEffect or directly here. Directly here is safer to avoid loops.
    // Actually, let's defer updating timeData/personnelData until we leave the step or save?
    // No, the UI shows totals row/col.
    
    // Let's update timeData and personnelData based on the new matrix value.
    // 1. Get new Row Total for monthId
    // 2. Get new Col Total for areaId
    
    // We need the *current* matrix state + the new value.
    // Since setMatrixData is async, we calculate manually.
    
    // ... logic below in renderConfirmStep or separate effect ...
  };

  // Effect to sync Time/Personnel Data when Matrix changes (only if in Step 3)
  useEffect(() => {
    if (currentStep !== 2) return;

    // Calculate new totals from matrix
    // IMPORTANT: Create deep copies to avoid mutating state directly, which breaks change detection
    const newTimeData = timeData.map(t => ({ ...t }));
    const newPersonnelData = personnelData.map(p => ({ ...p }));

    // 1. Update Time Totals (Rows)
    newTimeData.forEach(t => {
        if (t.type === 'month') {
            const rowTotal = Object.values(matrixData[t.id] || {}).reduce<number>((sum, v) => sum + (v as number), 0);
            t.thisYearTarget = rowTotal;
            t.thisYearRatio = totalTarget > 0 ? parseFloat(((rowTotal / totalTarget) * 100).toFixed(2)) : 0;
        }
    });
    // Recalculate Quarters
    QUARTERS.forEach(q => {
        const qMonths = MONTHS.filter(m => m.quarter === q);
        const qTarget = qMonths.reduce((sum, m) => {
            const mData = newTimeData.find(d => d.id === m.id);
            return sum + (mData?.thisYearTarget || 0);
        }, 0);
        const qRatio = totalTarget > 0 ? parseFloat(((qTarget / totalTarget) * 100).toFixed(1)) : 0;
        
        const qIdx = newTimeData.findIndex(d => d.id === q);
        if (qIdx !== -1) {
            newTimeData[qIdx].thisYearRatio = qRatio;
            newTimeData[qIdx].thisYearTarget = qTarget;
        }
    });

    // 2. Update Personnel Totals (Cols)
    newPersonnelData.forEach(p => {
        const colTotal = Object.keys(matrixData).reduce((sum, monthId) => {
            return sum + (matrixData[monthId]?.[p.id] || 0);
        }, 0);
        p.thisYearTarget = colTotal;
        p.thisYearRatio = totalTarget > 0 ? parseFloat(((colTotal / totalTarget) * 100).toFixed(2)) : 0;
    });

    // Update state
    // We use a functional update to ensure we don't have stale closures if we were depending on them,
    // but here we are generating fresh data based on matrixData.
    // To avoid infinite loops, we check if values actually changed.
    // Since we deep copied, we can compare with current state.
    
    if (JSON.stringify(newTimeData) !== JSON.stringify(timeData)) {
        setTimeData(newTimeData);
    }
    if (JSON.stringify(newPersonnelData) !== JSON.stringify(personnelData)) {
        setPersonnelData(newPersonnelData);
    }

  }, [matrixData, currentStep]); // Depend on matrixData and currentStep

  // Calculate Totals for Validation
  const timeTotalRatio = timeData.filter(d => d.type === 'month').reduce((sum, d) => sum + d.thisYearRatio, 0);
  const timeTotalTarget = timeData.filter(d => d.type === 'month').reduce((sum, d) => sum + d.thisYearTarget, 0);

  const personnelTotalRatio = personnelData.reduce((sum, d) => sum + d.thisYearRatio, 0);
  const personnelTotalTarget = personnelData.reduce((sum, d) => sum + d.thisYearTarget, 0);

  // Step validation
  const isStep1Valid = Math.abs(timeTotalRatio - 100) < 0.1;
  const isStep2Valid = Math.abs(personnelTotalRatio - 100) < 0.1;

  const isNextDisabled = (currentStep === 0 && !isStep1Valid) || (currentStep === 1 && !isStep2Valid);

  const getNextButtonText = () => {
    if (currentStep === STEPS.length - 1) return <><Save size={16} className="mr-2" />确认并保存</>;
    if (currentStep === 0 && !isStep1Valid) return <>请按月将明年目标拆解至100% <ChevronRight size={16} className="ml-1" /></>;
    if (currentStep === 1 && !isStep2Valid) return <>请按人员/片区拆解至100% <ChevronRight size={16} className="ml-1" /></>;
    return <>下一步 <ChevronRight size={16} className="ml-1" /></>;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onSave({
        timeBreakdown: timeData,
        personnelBreakdown: personnelData,
        monthlyAreaTargets: matrixData
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

  // Render Step 1: Time Breakdown
  const renderTimeStep = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
          <tr>
            <th className="px-4 py-3">时间</th>
            <th className="px-4 py-3 text-right">今年实际箱数</th>
            <th className="px-4 py-3 text-right">今年占比</th>
            <th className="px-4 py-3 w-1/3">场景 (历史规律)</th>
            <th className="px-4 py-3 text-right w-24">明年设定占比</th>
            <th className="px-4 py-3 text-right">明年预估销售箱数</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {timeData.map((row) => (
            <tr key={row.id} className={`${row.type === 'quarter' ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50/50'}`}>
              <td className="px-4 py-3">{row.label}</td>
              <td className="px-4 py-3 text-right">{row.lastYearActuals.toLocaleString()}</td>
              <td className="px-4 py-3 text-right">{row.lastYearRatio.toFixed(1)}%</td>
              <td className="px-4 py-3">
                 {row.type === 'month' ? (
                    <input 
                        type="text" 
                        value={row.scenario}
                        onChange={(e) => handleTimeChange(row.id, 'scenario', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-brand-300 outline-none text-slate-600"
                    />
                 ) : null}
              </td>
              <td className="px-4 py-3 text-right">
                {row.type === 'month' ? (
                    <div className="flex items-center justify-end gap-1">
                        <input 
                            type="text" inputMode="decimal"
                            step="0.1"
                            value={row.thisYearRatio}
                            onChange={(e) => { const v = e.target.value; if (isValidOneDecimal(v)) handleTimeChange(row.id, 'thisYearRatio', parseFloat(v) || 0); }}
                            className="w-16 text-right bg-white border border-slate-200 rounded px-1 py-0.5 focus:border-brand-500 outline-none"
                        />
                        <span>%</span>
                    </div>
                ) : (
                    <span>{row.thisYearRatio.toFixed(1)}%</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-medium text-slate-800">
                {row.thisYearTarget.toLocaleString()}
              </td>
            </tr>
          ))}
          <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
            <td className="px-4 py-3">全年合计</td>
            <td className="px-4 py-3 text-right">145,900</td>
            <td className="px-4 py-3 text-right">100%</td>
            <td className="px-4 py-3"></td>
            <td className={`px-4 py-3 text-right ${Math.abs(timeTotalRatio - 100) > 0.1 ? 'text-red-500' : 'text-green-600'}`}>
                {timeTotalRatio.toFixed(1)}%
            </td>
            <td className={`px-4 py-3 text-right ${Math.abs(timeTotalTarget - totalTarget) > 100 ? 'text-red-500' : 'text-green-600'}`}>
                {timeTotalTarget.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // Render Step 2: Personnel Breakdown
  const renderPersonnelStep = () => (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-24">片区</th>
              <th className="px-4 py-3">今年负责人</th>
              <th className="px-4 py-3 text-right">今年实际箱数</th>
              <th className="px-4 py-3 text-right">今年占比</th>
              <th className="px-4 py-3 w-1/3">场景说明 (历史规律/片区特点)</th>
              <th className="px-4 py-3 text-right w-24">明年设定占比</th>
              <th className="px-4 py-3 text-right">明年预估销售箱数</th>
              <th className="px-4 py-3">明年负责人</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {personnelData.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/50 group">
                <td className="px-4 py-3 font-medium align-top">
                  <input 
                      type="text" 
                      value={row.area}
                      onChange={(e) => handlePersonnelChange(row.id, 'area', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 focus:border-brand-500 outline-none text-slate-800 font-medium"
                  />
                </td>
                <td className="px-4 py-3 text-slate-500 align-top pt-4">{row.lastYearManager}</td>
                <td className="px-4 py-3 text-right text-slate-500 align-top pt-4">{row.lastYearActuals.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-slate-500 align-top pt-4">{row.lastYearRatio.toFixed(1)}%</td>
                <td className="px-4 py-3 align-top">
                   <textarea 
                      value={row.scenario}
                      onChange={(e) => handlePersonnelChange(row.id, 'scenario', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 focus:border-brand-500 outline-none text-slate-600 resize-y min-h-[60px]"
                      rows={3}
                  />
                </td>
                <td className="px-4 py-3 text-right align-top pt-4">
                  <div className="flex items-center justify-end gap-1">
                      <input 
                          type="number"
                          step="0.1"
                          value={row.thisYearRatio}
                          onChange={(e) => { const v = e.target.value; if (isValidOneDecimal(v)) handlePersonnelChange(row.id, 'thisYearRatio', parseFloat(v) || 0); }}
                          className="w-16 text-right bg-white border border-slate-200 rounded px-1 py-0.5 focus:border-brand-500 outline-none"
                      />
                      <span>%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-800 align-top pt-4">
                  {row.thisYearTarget.toLocaleString()}
                </td>
                <td className="px-4 py-3 align-top pt-3">
                  <input 
                      type="text" 
                      value={row.thisYearManager}
                      onChange={(e) => handlePersonnelChange(row.id, 'thisYearManager', e.target.value)}
                      className="w-24 bg-white border border-slate-200 rounded px-2 py-1 focus:border-brand-500 outline-none"
                  />
                </td>
                <td className="px-4 py-3 align-top pt-3 text-center">
                    <button 
                        onClick={() => handleRemovePersonnel(row.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="删除"
                    >
                        <Trash2 size={16} />
                    </button>
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
              <td className="px-4 py-3">合计</td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right">145,900</td>
              <td className="px-4 py-3 text-right">100%</td>
              <td className="px-4 py-3"></td>
              <td className={`px-4 py-3 text-right ${Math.abs(personnelTotalRatio - 100) > 0.1 ? 'text-red-500' : 'text-green-600'}`}>
                  {personnelTotalRatio.toFixed(1)}%
              </td>
              <td className={`px-4 py-3 text-right ${Math.abs(personnelTotalTarget - totalTarget) > 100 ? 'text-red-500' : 'text-green-600'}`}>
                  {personnelTotalTarget.toLocaleString()}
              </td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-center">
        <button 
            onClick={handleAddPersonnel}
            className="flex items-center px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition-colors"
        >
            <Plus size={16} className="mr-2" />
            添加新片区
        </button>
      </div>
    </div>
  );

  // Render Step 3: 2D Table Confirmation
  const renderConfirmStep = () => {
    // Calculate 2D Data
    // Rows: Months/Quarters
    // Cols: Areas
    // Cell = matrixData[monthId][areaId]
    
    return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-slate-50">月份</th>
                <th className="px-4 py-3 text-right">占比</th>
                {personnelData.map(p => (
                    <th key={p.id} className="px-4 py-3 text-right">
                        <div>{p.area}</div>
                        <div className="text-[10px] font-normal">{p.thisYearManager} ({p.thisYearRatio}%)</div>
                    </th>
                ))}
                <th className="px-4 py-3 text-right font-bold">全司合计</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timeData.map(t => {
                const isQuarter = t.type === 'quarter';
                return (
                    <tr key={t.id} className={isQuarter ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50/50'}>
                        <td className={`px-4 py-3 sticky left-0 ${isQuarter ? 'bg-slate-50' : 'bg-white'}`}>{t.label}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{t.thisYearRatio.toFixed(isQuarter ? 1 : 2)}%</td>
                        {personnelData.map(p => {
                            // Calculate cell value
                            const cellValue = isQuarter 
                                ? MONTHS.filter(m => m.quarter === t.id).reduce((sum, m) => sum + (matrixData[m.id]?.[p.id] || 0), 0)
                                : (matrixData[t.id]?.[p.id] || 0);
                            
                            return (
                                <td key={p.id} className="px-4 py-3 text-right text-slate-600">
                                    {isQuarter ? (
                                        cellValue.toLocaleString()
                                    ) : (
                                        <input 
                                            type="text" inputMode="decimal" 
                                            value={cellValue}
                                            onChange={(e) => handleMatrixChange(t.id, p.id, parseInt(e.target.value) || 0)}
                                            className="w-20 text-right bg-transparent border-b border-transparent focus:border-brand-300 outline-none hover:bg-white hover:border-slate-200 transition-colors"
                                        />
                                    )}
                                </td>
                            );
                        })}
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                            {t.thisYearTarget.toLocaleString()}
                        </td>
                    </tr>
                );
              })}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td className="px-4 py-3 sticky left-0 bg-slate-100">全年合计</td>
                <td className={`px-4 py-3 text-right ${Math.abs(timeTotalRatio - 100) > 0.1 ? 'text-red-500' : 'text-green-600'}`}>
                    {timeTotalRatio.toFixed(1)}%
                </td>
                {personnelData.map(p => (
                    <td key={p.id} className="px-4 py-3 text-right">
                        {p.thisYearTarget.toLocaleString()}
                    </td>
                ))}
                <td className={`px-4 py-3 text-right ${Math.abs(timeTotalTarget - totalTarget) > 100 ? 'text-red-500' : 'text-green-600'}`}>
                    {timeTotalTarget.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">销售目标拆解 (Sales Breakdown)</h2>
            <p className="text-sm text-slate-500 mt-1">Total Target: <span className="font-bold text-brand-600">{totalTarget.toLocaleString()}</span> 箱</p>
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
            {currentStep === 0 && renderTimeStep()}
            {currentStep === 1 && renderPersonnelStep()}
            {currentStep === 2 && renderConfirmStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center rounded-b-2xl">
          <button 
            onClick={handleBack}
            className="px-6 py-2 text-slate-600 font-medium hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 transition-all flex items-center"
          >
            {currentStep === 0 ? '取消' : <><ChevronLeft size={16} className="mr-1" /> 上一步</>}
          </button>
          
          <button
            onClick={handleNext}
            disabled={isNextDisabled}
            className="px-8 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-lg shadow-brand-200 transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getNextButtonText()}
          </button>
        </div>

      </div>
    </div>
  );
};
