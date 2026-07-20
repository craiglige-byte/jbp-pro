import React, { useState, useEffect, useMemo } from 'react';
import { JBPData, JBPDetailedBudgetPlan, JBPWarehouseBudget, JBPVehicleBudget, JBPPersonnelBudget, JBPCapitalBudget, JBPMarketingBudget, JBPObjective } from '../types';
import { Building2, Truck, Users, Wallet, Megaphone, ArrowRight, ArrowLeft, Save, Info, X, Plus, Trash2 } from 'lucide-react';

interface BudgetStepProps {
    data: JBPData;
    updateData: (updates: Partial<JBPData>) => void;
    onNext: () => void;
    onBack: () => void;
}

const BudgetStep: React.FC<BudgetStepProps> = ({ data, updateData, onNext, onBack }) => {
    const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

    // 追踪数字输入框的显示字符串（支持中间态 "." ".5"）
    const [inputDisplays, setInputDisplays] = useState<Record<string, string>>({});

    // 获取输入框显示值：优先用追踪的显示字符串，否则用数值（0不显示）
    const getDisplay = (key: string, numVal: number): string => {
        if (key in inputDisplays) return inputDisplays[key];
        return numVal === 0 ? '' : String(numVal);
    };
    
    // 高亮字段状态 - 支持多个字段同时高亮
    const [highlightFields, setHighlightFields] = useState<Array<{
        section: 'warehouse' | 'vehicles' | 'personnel' | 'marketing' | 'capital';
        index: number;
        field: string;
    }>>([]);

    // 判断字段是否需要高亮
    const isFieldHighlighted = (section: string, index: number, field: string): boolean => {
        return highlightFields.some(h => 
            h.section === section && 
            h.index === index && 
            h.field === field
        );
    };

    // 获取高亮样式类
    const getHighlightClass = (section: string, index: number, field: string): string => {
        return isFieldHighlighted(section, index, field) ? 'border-2 border-red-500 ring-2 ring-red-200' : '';
    };

    // 清除特定字段的高亮
    const clearFieldHighlight = (section: string, index: number, field: string) => {
        setHighlightFields(prev => prev.filter(h => 
            !(h.section === section && h.index === index && h.field === field)
        ));
    };

    // 判断某个section是否有高亮字段
    const isSectionHighlighted = (section: string): boolean => {
        return highlightFields.some(h => h.section === section);
    };

    // 获取section的高亮样式类
    const getSectionHighlightClass = (section: string): string => {
        return isSectionHighlighted(section) ? 'border-4 border-amber-500 shadow-lg ring-2 ring-amber-200' : '';
    };

    // === 数字输入校验函数 (PRD-06 §6 R01-R05) ===
    // 通用：非负、最多两位小数、仅数字+小数点、即时校验
    const handleDecimalInput = (value: string, maxDecimals: number = 2): string => {
        // 1. 移除所有非数字和非小数点字符（拦截负数、字母、e/E/+ 等）
        let cleaned = value.replace(/[^0-9.]/g, '');
        // 2. 仅保留第一个小数点
        const dotIndex = cleaned.indexOf('.');
        if (dotIndex !== -1) {
            cleaned = cleaned.substring(0, dotIndex + 1) + cleaned.substring(dotIndex + 1).replace(/\./g, '');
        }
        // 3. 截断小数部分到 maxDecimals 位
        if (cleaned.includes('.')) {
            const [intPart, decPart] = cleaned.split('.');
            cleaned = intPart + '.' + decPart.substring(0, maxDecimals);
        }
        // 4. 整数模式：无小数点
        if (maxDecimals === 0 && cleaned.includes('.')) {
            cleaned = cleaned.split('.')[0];
        }
        return cleaned;
    };

    // 百分数字段额外校验：范围 [0, 100]
    const handleRatioInput = (value: string): string => {
        const cleaned = handleDecimalInput(value, 2);
        if (cleaned === '' || cleaned === '.') return cleaned;
        const num = Number(cleaned);
        if (num > 100) return '100';
        if (num < 0) return '0';
        return cleaned;
    };

    // 辅助：将校验后的字符串转为安全数值
    const safeNumber = (val: string): number => {
        if (val === '' || val === '.') return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : Math.max(0, num);
    };

    // Auto-resizing textarea component
    const AutoResizingTextarea: React.FC<{
        value: string;
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
        className?: string;
        placeholder?: string;
    }> = ({ value, onChange, className, placeholder }) => {
        const textareaRef = React.useRef<HTMLTextAreaElement>(null);

        const adjustHeight = () => {
            const textarea = textareaRef.current;
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
            }
        };

        useEffect(() => {
            adjustHeight();
        }, [value]);

        return (
            <textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`${className} resize-none overflow-hidden min-h-[34px] leading-tight block w-full`}
                rows={1}
            />
        );
    };

    // Initialize detailed plan
    const [plan, setPlan] = useState<JBPDetailedBudgetPlan>(() => {
        if (data.detailedBudgetPlan) {
            return JSON.parse(JSON.stringify(data.detailedBudgetPlan));
        }

        // Default Marketing Plan from Profitability Plan if available
        let defaultMarketing = [
            { id: '1', item: '', distributorAmount: 0, ratio: 0, manufacturerRatio: 0, manufacturerAmount: 0, totalAmount: 0, remark: '' },
            { id: '2', item: '', distributorAmount: 0, ratio: 0, manufacturerRatio: 0, manufacturerAmount: 0, totalAmount: 0, remark: '' },
            { id: '3', item: '', distributorAmount: 0, ratio: 0, manufacturerRatio: 0, manufacturerAmount: 0, totalAmount: 0, remark: '' },
            { id: '4', item: '', distributorAmount: 0, ratio: 0, manufacturerRatio: 0, manufacturerAmount: 0, totalAmount: 0, remark: '' },
            { id: '5', item: '', distributorAmount: 0, ratio: 0, manufacturerRatio: 0, manufacturerAmount: 0, totalAmount: 0, remark: '' },
        ];

        return {
            warehouse: [
                { id: '1', type: '', area: 0, brandRatio: 0, brandArea: 0, monthlyRent: 0, yearlyRent: 0, brandYearlyRent: 0, remark: '' }
            ],
            vehicles: [
                { id: '1', model: '', type: '', count: 0, dailyCapacity: 0, yearlyCost: 0, brandRatio: 0, brandYearlyCost: 0, remark: '' }
            ],
            personnel: [
                { id: '1', role: '经销商自有 - 老板&职业经理', count: 0, monthlyBaseSalary: 0, yearlyBaseSalary: 0, yearlySocialSecurity: 0, yearlyFixedCost: 0, yearlyBonus: 0, yearlyTotalCost: 0, brandRatio: 0, brandYearlyCost: 0, remark: '' },
                { id: '2', role: '经销商自有 - 专职业代', count: 0, monthlyBaseSalary: 0, yearlyBaseSalary: 0, yearlySocialSecurity: 0, yearlyFixedCost: 0, yearlyBonus: 0, yearlyTotalCost: 0, brandRatio: 0, brandYearlyCost: 0, remark: '' },
                { id: '3', role: '经销商自有 - 司机', count: 0, monthlyBaseSalary: 0, yearlyBaseSalary: 0, yearlySocialSecurity: 0, yearlyFixedCost: 0, yearlyBonus: 0, yearlyTotalCost: 0, brandRatio: 0, brandYearlyCost: 0, remark: '' },
                { id: '4', role: '经销商自有 - 库管', count: 0, monthlyBaseSalary: 0, yearlyBaseSalary: 0, yearlySocialSecurity: 0, yearlyFixedCost: 0, yearlyBonus: 0, yearlyTotalCost: 0, brandRatio: 0, brandYearlyCost: 0, remark: '' },
                { id: '5', role: '经销商自有 - 文员', count: 0, monthlyBaseSalary: 0, yearlyBaseSalary: 0, yearlySocialSecurity: 0, yearlyFixedCost: 0, yearlyBonus: 0, yearlyTotalCost: 0, brandRatio: 0, brandYearlyCost: 0, remark: '' },
                { id: '6', role: '品牌方人员 - 厂家业代', count: 0, monthlyBaseSalary: 0, yearlyBaseSalary: 0, yearlySocialSecurity: 0, yearlyFixedCost: 0, yearlyBonus: 0, yearlyTotalCost: 0, brandRatio: 0, brandYearlyCost: 0, remark: '' }
            ],
            capital: [
                { id: '1', item: '厂家预付款', amount: 0, brandRatio: 0, brandAmount: 0, remark: '' },
                { id: '2', item: '仓库押金', amount: 0, brandRatio: 0, brandAmount: 0, remark: '' },
                { id: '3', item: '办公场所押金', amount: 0, brandRatio: 0, brandAmount: 0, remark: '' },
                { id: '4', item: '首月工资', amount: 0, brandRatio: 0, brandAmount: 0, remark: '' },
                { id: '5', item: '首期车辆费用', amount: 0, brandRatio: 0, brandAmount: 0, remark: '' },
                { id: '6', item: '冰柜采购成本', amount: 0, brandRatio: 0, brandAmount: 0, remark: '' },
                { id: '7', item: '办公设备', amount: 0, brandRatio: 0, brandAmount: 0, remark: '' },
                { id: '8', item: '备用金', amount: 0, brandRatio: 0, brandAmount: 0, remark: '' },
                { id: '9', item: '其他费用', amount: 0, brandRatio: 0, brandAmount: 0, remark: '' }
            ],
            marketing: defaultMarketing
        };
    });

    // Helper to update plan
    const updatePlan = (section: keyof JBPDetailedBudgetPlan, items: any[]) => {
        setPlan(prev => ({ ...prev, [section]: items }));
    };

    // 仓库租赁 - 添加新记录
    const addWarehouseItem = () => {
        const newItem: JBPWarehouseBudget = {
            id: Date.now().toString(),
            type: '',
            area: 0,
            brandRatio: 0,
            brandArea: 0,
            monthlyRent: 0,
            yearlyRent: 0,
            brandYearlyRent: 0,
            remark: ''
        };
        updatePlan('warehouse', [...plan.warehouse, newItem]);
    };

    // 仓库租赁 - 删除记录
    const removeWarehouseItem = (id: string) => {
        if (plan.warehouse.length > 1) {
            updatePlan('warehouse', plan.warehouse.filter(item => item.id !== id));
        }
    };

    // 人员架构 - 添加新记录
    const addPersonnelItem = () => {
        const newItem: JBPPersonnelBudget = {
            id: Date.now().toString(),
            role: '',
            count: 0,
            monthlyBaseSalary: 0,
            yearlyBaseSalary: 0,
            yearlySocialSecurity: 0,
            yearlyFixedCost: 0,
            yearlyBonus: 0,
            yearlyTotalCost: 0,
            brandRatio: 0,
            brandYearlyCost: 0,
            remark: ''
        };
        updatePlan('personnel', [...plan.personnel, newItem]);
    };

    // 车辆配置 - 删除记录（允许删至0行，部分客户无车）
    const removeVehicleItem = (id: string) => {
        updatePlan('vehicles', plan.vehicles.filter(item => item.id !== id));
    };

    // 人员架构 - 删除记录
    const removePersonnelItem = (id: string) => {
        if (plan.personnel.length > 1) {
            updatePlan('personnel', plan.personnel.filter(item => item.id !== id));
        }
    };

    // 费用规划 - 添加新记录
    const addMarketingItem = () => {
        const newItem: JBPMarketingBudget = {
            id: Date.now().toString(),
            item: '',
            distributorAmount: 0,
            totalAmount: 0,
            ratio: 0,
            manufacturerRatio: 0,
            manufacturerAmount: 0,
            remark: ''
        };
        updatePlan('marketing', [...plan.marketing, newItem]);
    };

    // 费用规划 - 删除记录
    const removeMarketingItem = (id: string) => {
        if (plan.marketing.length > 1) {
            updatePlan('marketing', plan.marketing.filter(item => item.id !== id));
        }
    };

    // 资金准备 - 添加新记录
    const addCapitalItem = () => {
        const newItem: JBPCapitalBudget = {
            id: Date.now().toString(),
            item: '',
            amount: 0,
            brandRatio: 0,
            brandAmount: 0,
            remark: ''
        };
        updatePlan('capital', [...plan.capital, newItem]);
    };

    // 资金准备 - 删除记录
    const removeCapitalItem = (id: string) => {
        if (plan.capital.length > 1) {
            updatePlan('capital', plan.capital.filter(item => item.id !== id));
        }
    };

    // Calculate Budget Limits from Profitability Plan
    const budgetLimits = useMemo(() => {
        const objective = data.objectives.find(o => o.profitabilityPlan);
        if (!objective || !objective.profitabilityPlan) {
            return { warehouse: 0, vehicles: 0, personnel: 0, capital: 0, marketing: 0 };
        }

        const expenses = objective.profitabilityPlan.expenses;

        // Helper to safely get category and item
        const getCat = (id: string) => expenses.find((c: any) => c.id === id);
        const getItem = (catId: string, itemId: string) => {
            const cat = getCat(catId);
            return cat ? cat.items.find((i: any) => i.id === itemId)?.thisYearTarget || 0 : 0;
        };
        const getCatTotal = (id: string) => {
            const cat = getCat(id);
            return cat ? cat.items.reduce((sum: number, i: any) => sum + i.thisYearTarget, 0) : 0;
        };

        return {
            warehouse: getItem('warehouse', 'rent'), // Warehouse Rent
            vehicles: getItem('warehouse', 'fuel'), // Vehicle Expenses (Fuel/Maintenance/etc)
            personnel: getCatTotal('personnel'), // Total Personnel Expenses
            marketing: getCatTotal('marketing'), // Total Marketing Expenses
            capital: getItem('admin', 'supplies'), // Map to Admin Supplies (Office/Comms) as a proxy for now, or 0
        };
    }, [data.objectives]);

    // Comparison Helper
    const getComparison = (actual: number, limit: number) => {
        if (limit === 0) return { text: '--', color: 'text-slate-500' };
        const diff = limit - actual;
        const isOver = diff < 0;
        return {
            text: `${isOver ? '超支' : '结余'} ${Math.abs(diff).toFixed(1)} 万`,
            color: isOver ? 'text-red-500' : 'text-emerald-600'
        };
    };

    // Calculate Totals for Comparison (in Wan Yuan)
    const currentTotals = {
        warehouse: plan.warehouse.reduce((sum, item) => sum + item.brandYearlyRent, 0) / 10000,
        vehicles: plan.vehicles.reduce((sum, item) => sum + item.brandYearlyCost, 0) / 10000,
        personnel: plan.personnel.reduce((sum, item) => sum + item.brandYearlyCost, 0),
        capital: plan.capital.reduce((s, i) => s + i.brandAmount, 0) / 10000,
        marketing: plan.marketing.reduce((sum, item) => sum + item.distributorAmount, 0) // Distributor amount is the cost to us
    };

    // Sync to Profitability Plan
    const syncToProfitability = () => {
        // 1. Calculate Totals (in Wan Yuan)
        const warehouseTotal = plan.warehouse.reduce((sum, item) => sum + item.brandYearlyRent, 0) / 10000;
        const vehicleTotal = plan.vehicles.reduce((sum, item) => sum + item.brandYearlyCost, 0) / 10000;

        // Personnel is already in Wan Yuan
        const personnelTotalWan = plan.personnel.reduce((sum, item) => sum + item.brandYearlyCost, 0);

        // Marketing is already in Wan Yuan
        const marketingTotalWan = plan.marketing.reduce((sum, item) => sum + item.distributorAmount, 0);

        // Capital items that are expenses (e.g. Office Equipment, Other)
        // "办公设备" (20000), "其他费用" (10000) -> 30000 -> 3 Wan
        const capitalExpensesWan = plan.capital
            .filter(i => ['办公设备', '其他费用'].includes(i.item))
            .reduce((sum, i) => sum + i.brandAmount, 0) / 10000;

        // 2. Find Profitability Plan
        const objectiveIndex = data.objectives.findIndex(o => o.profitabilityPlan);
        if (objectiveIndex === -1) return;

        const objective = data.objectives[objectiveIndex];
        if (!objective.profitabilityPlan) return;

        const newProfitPlan = JSON.parse(JSON.stringify(objective.profitabilityPlan));

        // 3. Update Expenses
        newProfitPlan.expenses = newProfitPlan.expenses.map((cat: any) => {
            if (cat.id === 'personnel') {
                // "driver_salary" -> Driver + Warehouse + Clerk
                const driverWhCost = plan.personnel
                    .filter(p => p.role.includes('司机') || p.role.includes('仓管') || p.role.includes('文员'))
                    .reduce((sum, p) => sum + p.brandYearlyCost, 0);

                const mgmtCost = plan.personnel
                    .filter(p => p.role.includes('经理') || p.role.includes('主管'))
                    .reduce((sum, p) => sum + p.brandYearlyCost, 0);

                const salesCommCost = plan.personnel
                    .filter(p => p.role.includes('业代') || p.role.includes('销售'))
                    .reduce((sum, p) => sum + p.brandYearlyCost, 0);

                const catItems = cat.items.map((item: any) => {
                    if (item.id === 'driver_salary') return { ...item, thisYearTarget: parseFloat(driverWhCost.toFixed(1)) };
                    if (item.id === 'mgmt_salary') return { ...item, thisYearTarget: parseFloat(mgmtCost.toFixed(1)) };
                    if (item.id === 'sales_comm') return { ...item, thisYearTarget: parseFloat(salesCommCost.toFixed(1)) };
                    return item;
                });
                return { ...cat, items: catItems };
            }
            if (cat.id === 'warehouse') {
                const rentCost = warehouseTotal;
                const vehicleCost = vehicleTotal;

                const catItems = cat.items.map((item: any) => {
                    if (item.id === 'rent') return { ...item, thisYearTarget: parseFloat(rentCost.toFixed(1)) };
                    if (item.id === 'fuel') return { ...item, thisYearTarget: parseFloat(vehicleCost.toFixed(1)) };
                    return item;
                });
                return { ...cat, items: catItems };
            }
            if (cat.id === 'marketing') {
                const catItems = cat.items.map((item: any) => {
                    const match = plan.marketing.find(m => m.item.includes(item.name) || item.name.includes(m.item));
                    if (match) {
                        return { ...item, thisYearTarget: parseFloat(match.distributorAmount.toFixed(1)) };
                    }
                    return item;
                });
                return { ...cat, items: catItems };
            }
            if (cat.id === 'admin') {
                const catItems = cat.items.map((item: any) => {
                    if (item.id === 'supplies') {
                        return { ...item, thisYearTarget: parseFloat(capitalExpensesWan.toFixed(1)) };
                    }
                    return item;
                });
                return { ...cat, items: catItems };
            }
            return cat;
        });

        // Recalculate total OpEx
        newProfitPlan.totalOperatingExpenses = newProfitPlan.expenses.reduce((sum: number, cat: any) =>
            sum + cat.items.reduce((s: number, i: any) => s + i.thisYearTarget, 0), 0);

        // Recalculate Net Profit
        const totalRevenue = newProfitPlan.salesRevenue + newProfitPlan.rebateRevenue;
        newProfitPlan.targetNetProfit = totalRevenue - newProfitPlan.cogs - newProfitPlan.totalOperatingExpenses;
        newProfitPlan.targetProfitMargin = totalRevenue > 0 ? (newProfitPlan.targetNetProfit / totalRevenue) * 100 : 0;

        // Update Objectives
        const newObjectives = [...data.objectives];
        newObjectives[objectiveIndex] = { ...objective, profitabilityPlan: newProfitPlan };

        updateData({
            detailedBudgetPlan: plan,
            objectives: newObjectives
        });
    };

    // 检查所有必填项是否都已填写
    const checkAllRequiredFieldsFilled = (): boolean => {
        // 1. 检查仓库租赁
        for (const item of plan.warehouse) {
            if (!item.type || !item.area || item.area === 0 || 
                !item.brandRatio || item.brandRatio === 0 || 
                !item.monthlyRent || item.monthlyRent === 0) {
                return false;
            }
        }

        // 2. 检查车辆配置
        for (const item of plan.vehicles) {
            if (!item.model || !item.type || !item.count || item.count === 0 || 
                !item.dailyCapacity || item.dailyCapacity === 0 || 
                !item.yearlyCost || item.yearlyCost === 0 || 
                !item.brandRatio || item.brandRatio === 0) {
                return false;
            }
        }

        // 3. 检查人员架构
        for (const item of plan.personnel) {
            if (!item.role || !item.count || item.count === 0 || 
                !item.monthlyBaseSalary || item.monthlyBaseSalary === 0 || 
                item.yearlySocialSecurity === null || item.yearlySocialSecurity === undefined || 
                item.yearlyBonus === null || item.yearlyBonus === undefined || 
                !item.brandRatio || item.brandRatio === 0) {
                return false;
            }
        }

        // 4. 检查费用规划
        for (const item of plan.marketing) {
            if (!item.item || !item.distributorAmount || item.distributorAmount === 0 || 
                !item.manufacturerRatio || item.manufacturerRatio === 0) {
                return false;
            }
        }

        // 5. 检查资金准备
        for (const item of plan.capital) {
            if (!item.item || !item.amount || item.amount === 0 || 
                !item.brandRatio || item.brandRatio === 0) {
                return false;
            }
        }

        return true;
    };

    // 校验预算规划
    const validateBudgetPlan = (): boolean => {
        // 清除之前的高亮
        setHighlightFields([]);

        // 1. 校验仓库租赁
        for (let i = 0; i < plan.warehouse.length; i++) {
            const item = plan.warehouse[i];
            const missingFields: Array<{ section: 'warehouse', index: number, field: string }> = [];
            
            if (!item.type) {
                missingFields.push({ section: 'warehouse', index: i, field: 'type' });
            }
            if (!item.area || item.area === 0) {
                missingFields.push({ section: 'warehouse', index: i, field: 'area' });
            }
            if (!item.brandRatio || item.brandRatio === 0) {
                missingFields.push({ section: 'warehouse', index: i, field: 'brandRatio' });
            }
            if (!item.monthlyRent || item.monthlyRent === 0) {
                missingFields.push({ section: 'warehouse', index: i, field: 'monthlyRent' });
            }
            
            if (missingFields.length > 0) {
                setHighlightFields(missingFields);
                scrollToSection('warehouse');
                showToast(`仓库租赁第${i + 1}条记录：请填写所有必填项`);
                return false;
            }
        }

        // 2. 校验车辆配置
        for (let i = 0; i < plan.vehicles.length; i++) {
            const item = plan.vehicles[i];
            const missingFields: Array<{ section: 'vehicles', index: number, field: string }> = [];
            
            if (!item.model) {
                missingFields.push({ section: 'vehicles', index: i, field: 'model' });
            }
            if (!item.type) {
                missingFields.push({ section: 'vehicles', index: i, field: 'type' });
            }
            if (!item.count || item.count === 0) {
                missingFields.push({ section: 'vehicles', index: i, field: 'count' });
            }
            if (!item.dailyCapacity || item.dailyCapacity === 0) {
                missingFields.push({ section: 'vehicles', index: i, field: 'dailyCapacity' });
            }
            if (!item.yearlyCost || item.yearlyCost === 0) {
                missingFields.push({ section: 'vehicles', index: i, field: 'yearlyCost' });
            }
            if (!item.brandRatio || item.brandRatio === 0) {
                missingFields.push({ section: 'vehicles', index: i, field: 'brandRatio' });
            }
            
            if (missingFields.length > 0) {
                setHighlightFields(missingFields);
                scrollToSection('vehicles');
                showToast(`车辆配置第${i + 1}条记录：请填写所有必填项`);
                return false;
            }
        }

        // 3. 校验人员架构
        for (let i = 0; i < plan.personnel.length; i++) {
            const item = plan.personnel[i];
            const missingFields: Array<{ section: 'personnel', index: number, field: string }> = [];
            
            if (!item.role) {
                missingFields.push({ section: 'personnel', index: i, field: 'role' });
            }
            if (!item.count || item.count === 0) {
                missingFields.push({ section: 'personnel', index: i, field: 'count' });
            }
            if (!item.monthlyBaseSalary || item.monthlyBaseSalary === 0) {
                missingFields.push({ section: 'personnel', index: i, field: 'monthlyBaseSalary' });
            }
            if (item.yearlySocialSecurity === null || item.yearlySocialSecurity === undefined) {
                missingFields.push({ section: 'personnel', index: i, field: 'yearlySocialSecurity' });
            }
            if (item.yearlyBonus === null || item.yearlyBonus === undefined) {
                missingFields.push({ section: 'personnel', index: i, field: 'yearlyBonus' });
            }
            if (!item.brandRatio || item.brandRatio === 0) {
                missingFields.push({ section: 'personnel', index: i, field: 'brandRatio' });
            }
            
            if (missingFields.length > 0) {
                setHighlightFields(missingFields);
                scrollToSection('personnel');
                showToast(`人员架构第${i + 1}条记录：请填写所有必填项`);
                return false;
            }
        }

        // 4. 校验费用规划
        for (let i = 0; i < plan.marketing.length; i++) {
            const item = plan.marketing[i];
            const missingFields: Array<{ section: 'marketing', index: number, field: string }> = [];
            
            if (!item.item) {
                missingFields.push({ section: 'marketing', index: i, field: 'item' });
            }
            if (!item.distributorAmount || item.distributorAmount === 0) {
                missingFields.push({ section: 'marketing', index: i, field: 'distributorAmount' });
            }
            if (!item.manufacturerRatio || item.manufacturerRatio === 0) {
                missingFields.push({ section: 'marketing', index: i, field: 'manufacturerRatio' });
            }
            
            if (missingFields.length > 0) {
                setHighlightFields(missingFields);
                scrollToSection('marketing');
                showToast(`费用规划第${i + 1}条记录：请填写所有必填项`);
                return false;
            }
        }

        // 5. 校验资金准备
        for (let i = 0; i < plan.capital.length; i++) {
            const item = plan.capital[i];
            const missingFields: Array<{ section: 'capital', index: number, field: string }> = [];
            
            if (!item.item) {
                missingFields.push({ section: 'capital', index: i, field: 'item' });
            }
            if (!item.amount || item.amount === 0) {
                missingFields.push({ section: 'capital', index: i, field: 'amount' });
            }
            if (!item.brandRatio || item.brandRatio === 0) {
                missingFields.push({ section: 'capital', index: i, field: 'brandRatio' });
            }
            
            if (missingFields.length > 0) {
                setHighlightFields(missingFields);
                scrollToSection('capital');
                showToast(`资金准备第${i + 1}条记录：请填写所有必填项`);
                return false;
            }
        }

        return true;
    };

    // 滚动到指定部分
    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(`budget-section-${sectionId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // 显示提示
    const showToast = (message: string) => {
        setToast({ show: true, message });
        setTimeout(() => {
            setToast({ show: false, message: '' });
        }, 8000);
    };

    const handleNext = () => {
        // 校验
        if (!validateBudgetPlan()) {
            return;
        }

        // Save current state
        updateData({ detailedBudgetPlan: plan });
        onNext();
    };

    const handleBack = () => {
        onBack();
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
            {/* Toast 提示 */}
            {toast.show && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-md">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">{toast.message}</p>
                        </div>
                        <button 
                            onClick={() => setToast({ show: false, message: '' })}
                            className="flex-shrink-0 text-amber-500 hover:text-amber-700 p-1"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">规划预算</h2>
                    <p className="text-slate-500 mt-1">做好预算分解，明确各项投入的配置方式、成本分摊与资金来源。</p>
                </div>
                <div className="flex space-x-2">
                    {/* Removed Save Button */}
                </div>
            </div>

            {/* Content Area */}
            <div className="space-y-6">

                {/* Warehouse Section */}
                <div id="budget-section-warehouse" className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${getSectionHighlightClass('warehouse')}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="text-brand-600" size={24} />
                            <h3 className="font-bold text-slate-700 text-lg">仓库租赁</h3>
                        </div>
                        <button
                            onClick={addWarehouseItem}
                            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors"
                        >
                            <Plus size={14} />
                            <span>添加仓库</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3"><span className="text-red-500 mr-0.5">*</span>配置方式</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>建议总面积(㎡)</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>元气仓库占比</th>
                                    <th className="px-4 py-3 text-right">元气专用面积(㎡)</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>月租金(元)</th>
                                    <th className="px-4 py-3 text-right">年租金(元)</th>
                                    <th className="px-4 py-3 text-right">元气分摊年租金(元)</th>
                                    <th className="px-4 py-3">备注</th>
                                    <th className="px-4 py-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {plan.warehouse.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3">
                                            <select 
                                                value={item.type} 
                                                onChange={e => {
                                                    const newItems = [...plan.warehouse]; 
                                                    newItems[idx].type = e.target.value; 
                                                    updatePlan('warehouse', newItems);
                                                    // 清除高亮
                                                    clearFieldHighlight('warehouse', idx, 'type');
                                                }} 
                                                className={`border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white ${getHighlightClass('warehouse', idx, 'type')}`}
                                            >
                                                <option value="">请选择</option>
                                                <option value="长租">长租</option>
                                                <option value="短租">短租</option>
                                                <option value="自有">自有</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`wh_area_${idx}`, item.area)} onChange={e => {
                                            const cleaned = handleDecimalInput(e.target.value, 2);
                                            setInputDisplays(prev => ({...prev, [`wh_area_${idx}`]: cleaned}));
                                            const newItems = [...plan.warehouse]; newItems[idx].area = safeNumber(cleaned); updatePlan('warehouse', newItems);
                                            clearFieldHighlight('warehouse', idx, 'area');
                                        }} className={`w-20 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('warehouse', idx, 'area')}`} placeholder="0" /></td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`wh_ratio_${idx}`, item.brandRatio)} onChange={e => {
                                            const cleaned = handleRatioInput(e.target.value);
                                            setInputDisplays(prev => ({...prev, [`wh_ratio_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.warehouse];
                                            newItems[idx].brandRatio = val;
                                            newItems[idx].brandArea = newItems[idx].area * (val / 100);
                                            newItems[idx].brandYearlyRent = newItems[idx].yearlyRent * (val / 100);
                                            updatePlan('warehouse', newItems);
                                            clearFieldHighlight('warehouse', idx, 'brandRatio');
                                        }} className={`w-16 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('warehouse', idx, 'brandRatio')}`} placeholder="0" />%</td>
                                        <td className="px-4 py-3 text-right">{item.brandArea.toFixed(0)}</td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`wh_rent_${idx}`, item.monthlyRent)} onChange={e => {
                                            const cleaned = handleDecimalInput(e.target.value, 2);
                                            setInputDisplays(prev => ({...prev, [`wh_rent_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.warehouse];
                                            newItems[idx].monthlyRent = val;
                                            newItems[idx].yearlyRent = val * 12;
                                            newItems[idx].brandYearlyRent = val * 12 * (newItems[idx].brandRatio / 100);
                                            updatePlan('warehouse', newItems);
                                            clearFieldHighlight('warehouse', idx, 'monthlyRent');
                                        }} className={`w-24 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('warehouse', idx, 'monthlyRent')}`} placeholder="0" /></td>
                                        <td className="px-4 py-3 text-right">{item.yearlyRent.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right font-bold text-brand-600">{item.brandYearlyRent.toLocaleString()}</td>
                                        <td className="px-4 py-3"><AutoResizingTextarea value={item.remark} onChange={e => {
                                            const newItems = [...plan.warehouse]; newItems[idx].remark = e.target.value; updatePlan('warehouse', newItems);
                                        }} className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="备注信息" /></td>
                                        <td className="px-4 py-3">
                                            {plan.warehouse.length > 1 && (
                                                <button
                                                    onClick={() => removeWarehouseItem(item.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="删除此行"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-bold">
                                    <td className="px-4 py-3">合计</td>
                                    <td className="px-4 py-3 text-right">{plan.warehouse.reduce((s, i) => s + i.area, 0)}</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 text-right">{plan.warehouse.reduce((s, i) => s + i.brandArea, 0).toFixed(0)}</td>
                                    <td className="px-4 py-3 text-right">{plan.warehouse.reduce((s, i) => s + i.monthlyRent, 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">{plan.warehouse.reduce((s, i) => s + i.yearlyRent, 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-brand-600">{plan.warehouse.reduce((s, i) => s + i.brandYearlyRent, 0).toLocaleString()}</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                                <tr className="bg-white border-t border-slate-200">
                                    <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">预算上限</td>
                                    <td className="px-4 py-3" colSpan={5}></td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="font-medium text-slate-700">{budgetLimits.warehouse > 0 ? `${(budgetLimits.warehouse * 10000).toLocaleString()}元` : '--'}</div>
                                        {budgetLimits.warehouse > 0 && <div className="text-xs text-slate-400 font-normal mt-0.5 whitespace-nowrap">取自【拆解策略】-仓库租金</div>}
                                    </td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                                <tr className="bg-white border-t border-slate-200">
                                    <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">预算对比</td>
                                    <td className="px-4 py-3" colSpan={5}></td>
                                    <td className={`px-4 py-3 text-right text-sm font-bold ${budgetLimits.warehouse > 0
                                        ? (budgetLimits.warehouse - currentTotals.warehouse < 0 ? 'text-red-500' : 'text-emerald-600')
                                        : 'text-slate-500'
                                        }`}>
                                        {budgetLimits.warehouse > 0 ? (
                                            <>{budgetLimits.warehouse - currentTotals.warehouse < 0 ? '超支' : '结余'} {Math.abs((budgetLimits.warehouse - currentTotals.warehouse) * 10000).toLocaleString()}元</>
                                        ) : '--'}
                                    </td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Vehicles Section */}
                <div id="budget-section-vehicles" className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${getSectionHighlightClass('vehicles')}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Truck className="text-brand-600" size={24} />
                            <h3 className="font-bold text-slate-700 text-lg">车辆配置</h3>
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={() => {
                                const newId = (Math.max(...plan.vehicles.map(v => parseInt(v.id) || 0), 0) + 1).toString();
                                updatePlan('vehicles', [...plan.vehicles, {
                                    id: newId,
                                    model: '',
                                    type: '',
                                    count: 0,
                                    dailyCapacity: 0,
                                    yearlyCost: 0,
                                    brandRatio: 0,
                                    brandYearlyCost: 0,
                                    remark: ''
                                }]);
                            }} className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors">
                                <Plus size={14} />
                                <span>添加车辆</span>
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3"><span className="text-red-500 mr-0.5">*</span>车型</th>
                                    <th className="px-4 py-3"><span className="text-red-500 mr-0.5">*</span>配置方式</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>数量(辆)</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>日均配送能力(箱/天)</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>年运营成本(元)</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>车辆元气占比</th>
                                    <th className="px-4 py-3 text-right">元气分摊年成本(元)</th>
                                    <th className="px-4 py-3">备注</th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {plan.vehicles.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3">
                                            <select 
                                                value={item.model} 
                                                onChange={e => {
                                                    const newItems = [...plan.vehicles]; 
                                                    newItems[idx].model = e.target.value; 
                                                    updatePlan('vehicles', newItems);
                                                    // 清除高亮
                                                    clearFieldHighlight('vehicles', idx, 'model');
                                                }} 
                                                className={`border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white ${getHighlightClass('vehicles', idx, 'model')}`}
                                            >
                                                <option value="">请选择</option>
                                                <option value="4.2米左右厢货车">4.2米左右厢货车</option>
                                                <option value="3.2米左右面包车">3.2米左右面包车</option>
                                                <option value="2.0米左右三轮车">2.0米左右三轮车</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select 
                                                value={item.type} 
                                                onChange={e => {
                                                    const newItems = [...plan.vehicles]; 
                                                    newItems[idx].type = e.target.value; 
                                                    updatePlan('vehicles', newItems);
                                                    // 清除高亮
                                                    clearFieldHighlight('vehicles', idx, 'type');
                                                }} 
                                                className={`border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white ${getHighlightClass('vehicles', idx, 'type')}`}
                                            >
                                                <option value="">请选择</option>
                                                <option value="自有">自有</option>
                                                <option value="租赁">租赁</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="numeric" value={getDisplay(`vh_count_${idx}`, item.count)} onChange={e => {
                                            const cleaned = handleDecimalInput(e.target.value, 0);
                                            setInputDisplays(prev => ({...prev, [`vh_count_${idx}`]: cleaned}));
                                            const newItems = [...plan.vehicles]; newItems[idx].count = safeNumber(cleaned); updatePlan('vehicles', newItems);
                                            clearFieldHighlight('vehicles', idx, 'count');
                                        }} className={`w-16 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('vehicles', idx, 'count')}`} placeholder="0" /></td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`vh_cap_${idx}`, item.dailyCapacity)} onChange={e => {
                                            const cleaned = handleDecimalInput(e.target.value, 2);
                                            setInputDisplays(prev => ({...prev, [`vh_cap_${idx}`]: cleaned}));
                                            const newItems = [...plan.vehicles]; newItems[idx].dailyCapacity = safeNumber(cleaned); updatePlan('vehicles', newItems);
                                            clearFieldHighlight('vehicles', idx, 'dailyCapacity');
                                        }} className={`w-20 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('vehicles', idx, 'dailyCapacity')}`} placeholder="0" /></td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`vh_cost_${idx}`, item.yearlyCost)} onChange={e => {
                                            const cleaned = handleDecimalInput(e.target.value, 2);
                                            setInputDisplays(prev => ({...prev, [`vh_cost_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.vehicles];
                                            newItems[idx].yearlyCost = val;
                                            newItems[idx].brandYearlyCost = val * (newItems[idx].brandRatio / 100);
                                            updatePlan('vehicles', newItems);
                                            clearFieldHighlight('vehicles', idx, 'yearlyCost');
                                        }} className={`w-24 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('vehicles', idx, 'yearlyCost')}`} placeholder="0" /></td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`vh_ratio_${idx}`, item.brandRatio)} onChange={e => {
                                            const cleaned = handleRatioInput(e.target.value);
                                            setInputDisplays(prev => ({...prev, [`vh_ratio_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.vehicles];
                                            newItems[idx].brandRatio = val;
                                            newItems[idx].brandYearlyCost = newItems[idx].yearlyCost * (val / 100);
                                            updatePlan('vehicles', newItems);
                                            clearFieldHighlight('vehicles', idx, 'brandRatio');
                                        }} className={`w-16 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('vehicles', idx, 'brandRatio')}`} placeholder="0" />%</td>
                                        <td className="px-4 py-3 text-right font-bold text-brand-600">{item.brandYearlyCost.toLocaleString()}</td>
                                        <td className="px-4 py-3"><AutoResizingTextarea value={item.remark} onChange={e => {
                                            const newItems = [...plan.vehicles]; newItems[idx].remark = e.target.value; updatePlan('vehicles', newItems);
                                        }} className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="备注信息" /></td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => removeVehicleItem(item.id)}
                                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                title="删除此行"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-bold">
                                    <td className="px-4 py-3">合计</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 text-right">{plan.vehicles.reduce((s, i) => s + i.count, 0)}</td>
                                    <td className="px-4 py-3 text-right">{plan.vehicles.reduce((s, i) => s + i.dailyCapacity, 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">{plan.vehicles.reduce((s, i) => s + i.yearlyCost, 0).toLocaleString()}</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 text-right text-brand-600">{plan.vehicles.reduce((s, i) => s + i.brandYearlyCost, 0).toLocaleString()}</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                                <tr className="bg-white border-t border-slate-200">
                                    <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">预算上限</td>
                                    <td className="px-4 py-3" colSpan={5}></td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="font-medium text-slate-700">{budgetLimits.vehicles > 0 ? `${(budgetLimits.vehicles * 10000).toLocaleString()}元` : '--'}</div>
                                        {budgetLimits.vehicles > 0 && <div className="text-xs text-slate-400 font-normal mt-0.5 whitespace-nowrap">取自【拆解策略】-邮费/维修/保险/违章</div>}
                                    </td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                                <tr className="bg-white border-t border-slate-200">
                                    <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">预算对比</td>
                                    <td className="px-4 py-3" colSpan={5}></td>
                                    <td className={`px-4 py-3 text-right text-sm font-bold ${budgetLimits.vehicles > 0
                                        ? (budgetLimits.vehicles - currentTotals.vehicles < 0 ? 'text-red-500' : 'text-emerald-600')
                                        : 'text-slate-500'
                                        }`}>
                                        {budgetLimits.vehicles > 0 ? (
                                            <>{budgetLimits.vehicles - currentTotals.vehicles < 0 ? '超支' : '结余'} {Math.abs((budgetLimits.vehicles - currentTotals.vehicles) * 10000).toLocaleString()}元</>
                                        ) : '--'}
                                    </td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Personnel Section */}
                <div id="budget-section-personnel" className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${getSectionHighlightClass('personnel')}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="text-brand-600" size={24} />
                            <h3 className="font-bold text-slate-700 text-lg">人员架构</h3>
                        </div>
                        <button
                            onClick={addPersonnelItem}
                            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors"
                        >
                            <Plus size={14} />
                            <span>添加人员</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 w-44"><span className="text-red-500 mr-0.5">*</span>岗位</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>人数</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>月基本工资(元)</th>
                                    <th className="px-4 py-3 text-right">年基本工资(万)</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>年社保(万)</th>
                                    <th className="px-4 py-3 text-right">年固定成本(万)</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>年提成(万)</th>
                                    <th className="px-4 py-3 text-right">年总成本(万)</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>品牌占比</th>
                                    <th className="px-4 py-3 text-right">元气分摊成本(万)</th>
                                    <th className="px-4 py-3 w-48">备注</th>
                                    <th className="px-4 py-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {plan.personnel.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3">
                                            <select 
                                                value={item.role} 
                                                onChange={e => {
                                                    const newItems = [...plan.personnel]; 
                                                    newItems[idx].role = e.target.value; 
                                                    updatePlan('personnel', newItems);
                                                    // 清除高亮
                                                    clearFieldHighlight('personnel', idx, 'role');
                                                }} 
                                                className={`border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white w-full ${getHighlightClass('personnel', idx, 'role')}`}
                                            >
                                                <option value="">请选择</option>
                                                <optgroup label="经销商自有">
                                                    <option value="经销商自有 - 老板&职业经理">老板&职业经理</option>
                                                    <option value="经销商自有 - 专职业代">专职业代</option>
                                                    <option value="经销商自有 - 司机">司机</option>
                                                    <option value="经销商自有 - 库管">库管</option>
                                                    <option value="经销商自有 - 文员">文员</option>
                                                </optgroup>
                                                <optgroup label="品牌方人员">
                                                    <option value="品牌方人员 - 厂家业代">厂家业代</option>
                                                </optgroup>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="numeric" value={getDisplay(`pe_count_${idx}`, item.count)} onChange={e => {
                                            const cleaned = handleDecimalInput(e.target.value, 0);
                                            setInputDisplays(prev => ({...prev, [`pe_count_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.personnel];
                                            newItems[idx].count = val;
                                            const yearlyBase = (newItems[idx].monthlyBaseSalary * 12 * val) / 10000;
                                            newItems[idx].yearlyBaseSalary = parseFloat(yearlyBase.toFixed(1));
                                            newItems[idx].yearlyFixedCost = parseFloat((newItems[idx].yearlyBaseSalary + newItems[idx].yearlySocialSecurity).toFixed(1));
                                            newItems[idx].yearlyTotalCost = parseFloat((newItems[idx].yearlyFixedCost + newItems[idx].yearlyBonus).toFixed(1));
                                            newItems[idx].brandYearlyCost = parseFloat((newItems[idx].yearlyTotalCost * (newItems[idx].brandRatio / 100)).toFixed(1));
                                            updatePlan('personnel', newItems);
                                            clearFieldHighlight('personnel', idx, 'count');
                                        }} className={`w-12 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('personnel', idx, 'count')}`} placeholder="0" /></td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`pe_sal_${idx}`, item.monthlyBaseSalary)} onChange={e => {
                                            const cleaned = handleDecimalInput(e.target.value, 2);
                                            setInputDisplays(prev => ({...prev, [`pe_sal_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.personnel];
                                            newItems[idx].monthlyBaseSalary = val;
                                            const yearlyBase = (val * 12 * newItems[idx].count) / 10000;
                                            newItems[idx].yearlyBaseSalary = parseFloat(yearlyBase.toFixed(1));
                                            newItems[idx].yearlyFixedCost = parseFloat((newItems[idx].yearlyBaseSalary + newItems[idx].yearlySocialSecurity).toFixed(1));
                                            newItems[idx].yearlyTotalCost = parseFloat((newItems[idx].yearlyFixedCost + newItems[idx].yearlyBonus).toFixed(1));
                                            newItems[idx].brandYearlyCost = parseFloat((newItems[idx].yearlyTotalCost * (newItems[idx].brandRatio / 100)).toFixed(1));
                                            updatePlan('personnel', newItems);
                                            clearFieldHighlight('personnel', idx, 'monthlyBaseSalary');
                                        }} className={`w-20 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('personnel', idx, 'monthlyBaseSalary')}`} placeholder="0" /></td>
                                        <td className="px-4 py-3 text-right">{item.yearlyBaseSalary.toFixed(1)}</td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`pe_ss_${idx}`, item.yearlySocialSecurity)} onChange={e => {
                                            const cleaned = handleDecimalInput(e.target.value, 2);
                                            setInputDisplays(prev => ({...prev, [`pe_ss_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.personnel];
                                            newItems[idx].yearlySocialSecurity = val;
                                            newItems[idx].yearlyFixedCost = parseFloat((newItems[idx].yearlyBaseSalary + val).toFixed(1));
                                            newItems[idx].yearlyTotalCost = parseFloat((newItems[idx].yearlyFixedCost + newItems[idx].yearlyBonus).toFixed(1));
                                            newItems[idx].brandYearlyCost = parseFloat((newItems[idx].yearlyTotalCost * (newItems[idx].brandRatio / 100)).toFixed(1));
                                            updatePlan('personnel', newItems);
                                            clearFieldHighlight('personnel', idx, 'yearlySocialSecurity');
                                        }} className={`w-16 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('personnel', idx, 'yearlySocialSecurity')}`} placeholder="0" /></td>
                                        <td className="px-4 py-3 text-right">{item.yearlyFixedCost.toFixed(1)}</td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`pe_bonus_${idx}`, item.yearlyBonus)} onChange={e => {
                                            const cleaned = handleDecimalInput(e.target.value, 2);
                                            setInputDisplays(prev => ({...prev, [`pe_bonus_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.personnel];
                                            newItems[idx].yearlyBonus = val;
                                            newItems[idx].yearlyTotalCost = parseFloat((newItems[idx].yearlyFixedCost + val).toFixed(1));
                                            newItems[idx].brandYearlyCost = parseFloat((newItems[idx].yearlyTotalCost * (newItems[idx].brandRatio / 100)).toFixed(1));
                                            updatePlan('personnel', newItems);
                                            clearFieldHighlight('personnel', idx, 'yearlyBonus');
                                        }} className={`w-16 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('personnel', idx, 'yearlyBonus')}`} placeholder="0" /></td>
                                        <td className="px-4 py-3 text-right font-bold">{item.yearlyTotalCost.toFixed(1)}</td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`pe_ratio_${idx}`, item.brandRatio)} onChange={e => {
                                            const cleaned = handleRatioInput(e.target.value);
                                            setInputDisplays(prev => ({...prev, [`pe_ratio_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.personnel];
                                            newItems[idx].brandRatio = val;
                                            newItems[idx].brandYearlyCost = parseFloat((newItems[idx].yearlyTotalCost * (val / 100)).toFixed(1));
                                            updatePlan('personnel', newItems);
                                            clearFieldHighlight('personnel', idx, 'brandRatio');
                                        }} className={`w-12 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('personnel', idx, 'brandRatio')}`} placeholder="0" />%</td>
                                        <td className="px-4 py-3 text-right font-bold text-brand-600">{item.brandYearlyCost.toFixed(1)}</td>
                                        <td className="px-4 py-3"><AutoResizingTextarea value={item.remark} onChange={e => {
                                            const newItems = [...plan.personnel]; newItems[idx].remark = e.target.value; updatePlan('personnel', newItems);
                                        }} className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="备注信息" /></td>
                                        <td className="px-4 py-3">
                                            {plan.personnel.length > 1 && (
                                                <button
                                                    onClick={() => removePersonnelItem(item.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="删除此行"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-bold">
                                    <td className="px-4 py-3">合计</td>
                                    <td className="px-4 py-3 text-right">{plan.personnel.reduce((s, i) => s + i.count, 0)}</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 text-right">{plan.personnel.reduce((s, i) => s + i.yearlyBaseSalary, 0).toFixed(1)}</td>
                                    <td className="px-4 py-3 text-right">{plan.personnel.reduce((s, i) => s + i.yearlySocialSecurity, 0).toFixed(1)}</td>
                                    <td className="px-4 py-3 text-right">{plan.personnel.reduce((s, i) => s + i.yearlyFixedCost, 0).toFixed(1)}</td>
                                    <td className="px-4 py-3 text-right">{plan.personnel.reduce((s, i) => s + i.yearlyBonus, 0).toFixed(1)}</td>
                                    <td className="px-4 py-3 text-right">{plan.personnel.reduce((s, i) => s + i.yearlyTotalCost, 0).toFixed(1)}</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 text-right text-brand-600">{plan.personnel.reduce((s, i) => s + i.brandYearlyCost, 0).toFixed(1)}</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                                <tr className="bg-white border-t border-slate-200">
                                    <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">预算上限</td>
                                    <td className="px-4 py-3" colSpan={8}></td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="font-medium text-slate-700">{budgetLimits.personnel > 0 ? `${budgetLimits.personnel.toFixed(2)}万` : '--'}</div>
                                        {budgetLimits.personnel > 0 && <div className="text-xs text-slate-400 font-normal mt-0.5 whitespace-nowrap">取自【拆解策略】-人员费用</div>}
                                    </td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                                <tr className="bg-white border-t border-slate-200">
                                    <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">预算对比</td>
                                    <td className="px-4 py-3" colSpan={8}></td>
                                    <td className={`px-4 py-3 text-right text-sm font-bold ${budgetLimits.personnel > 0
                                        ? (budgetLimits.personnel - currentTotals.personnel < 0 ? 'text-red-500' : 'text-emerald-600')
                                        : 'text-slate-500'
                                        }`}>
                                        {budgetLimits.personnel > 0 ? (
                                            <>{budgetLimits.personnel - currentTotals.personnel < 0 ? '超支' : '结余'} {Math.abs(budgetLimits.personnel - currentTotals.personnel).toFixed(2)}万</>
                                        ) : '--'}
                                    </td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Marketing Section */}
                <div id="budget-section-marketing" className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${getSectionHighlightClass('marketing')}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Megaphone className="text-brand-600" size={24} />
                            <h3 className="font-bold text-slate-700 text-lg">费用规划</h3>
                        </div>
                        <button
                            onClick={addMarketingItem}
                            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors"
                        >
                            <Plus size={14} />
                            <span>添加费用</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 w-32"><span className="text-red-500 mr-0.5">*</span>费用项</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>经销商承担(万元)</th>
                                    <th className="px-4 py-3 text-right">费用占比</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>厂家承担(%)</th>
                                    <th className="px-4 py-3 text-right">厂家承担(万元)</th>
                                    <th className="px-4 py-3 text-right">总投入预算(万元)</th>
                                    <th className="px-4 py-3 w-48">备注说明</th>
                                    <th className="px-4 py-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {plan.marketing.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3">
                                            <select 
                                                value={item.item} 
                                                onChange={e => {
                                                    const newItems = [...plan.marketing]; 
                                                    newItems[idx].item = e.target.value; 
                                                    updatePlan('marketing', newItems);
                                                    // 清除高亮
                                                    clearFieldHighlight('marketing', idx, 'item');
                                                }} 
                                                className={`border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white w-full ${getHighlightClass('marketing', idx, 'item')}`}
                                            >
                                                <option value="">请选择</option>
                                                <option value="陈列费">陈列费</option>
                                                <option value="渠道促销费">渠道促销费</option>
                                                <option value="终端促销费">终端促销费</option>
                                                <option value="消费者促销费">消费者促销费</option>
                                                <option value="其他">其他</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`mk_dist_${idx}`, item.distributorAmount)} onChange={e => {
                                            const cleaned = handleDecimalInput(e.target.value, 2);
                                            setInputDisplays(prev => ({...prev, [`mk_dist_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.marketing];
                                            newItems[idx].distributorAmount = val;
                                            const mfrRatio = newItems[idx].manufacturerRatio;
                                            if (mfrRatio < 100 && val > 0) {
                                                const total = val / (1 - mfrRatio / 100);
                                                newItems[idx].totalAmount = parseFloat(total.toFixed(2));
                                                newItems[idx].manufacturerAmount = parseFloat((total - val).toFixed(2));
                                            } else {
                                                newItems[idx].totalAmount = val;
                                                newItems[idx].manufacturerAmount = 0;
                                            }
                                            const totalDist = newItems.reduce((s, i) => s + i.distributorAmount, 0);
                                            newItems.forEach(i => i.ratio = totalDist > 0 ? parseFloat(((i.distributorAmount / totalDist) * 100).toFixed(1)) : 0);
                                            updatePlan('marketing', newItems);
                                            clearFieldHighlight('marketing', idx, 'distributorAmount');
                                        }} className={`w-20 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('marketing', idx, 'distributorAmount')}`} placeholder="0" /></td>
                                        <td className="px-4 py-3 text-right">{item.ratio}%</td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`mk_mfr_${idx}`, item.manufacturerRatio)} onChange={e => {
                                            const cleaned = handleRatioInput(e.target.value);
                                            setInputDisplays(prev => ({...prev, [`mk_mfr_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.marketing];
                                            newItems[idx].manufacturerRatio = val;
                                            if (val < 100 && newItems[idx].distributorAmount > 0) {
                                                const total = newItems[idx].distributorAmount / (1 - val / 100);
                                                newItems[idx].totalAmount = parseFloat(total.toFixed(2));
                                                newItems[idx].manufacturerAmount = parseFloat((total - newItems[idx].distributorAmount).toFixed(2));
                                            }
                                            updatePlan('marketing', newItems);
                                            clearFieldHighlight('marketing', idx, 'manufacturerRatio');
                                        }} className={`w-16 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('marketing', idx, 'manufacturerRatio')}`} placeholder="0" />%</td>
                                        <td className="px-4 py-3 text-right">{item.manufacturerAmount.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right font-bold">{item.totalAmount.toFixed(2)}</td>
                                        <td className="px-4 py-3"><AutoResizingTextarea value={item.remark} onChange={e => {
                                            const newItems = [...plan.marketing]; newItems[idx].remark = e.target.value; updatePlan('marketing', newItems);
                                        }} className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="备注说明" /></td>
                                        <td className="px-4 py-3">
                                            {plan.marketing.length > 1 && (
                                                <button
                                                    onClick={() => removeMarketingItem(item.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="删除此行"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-bold">
                                    <td className="px-4 py-3">合计</td>
                                    <td className="px-4 py-3 text-right text-brand-600">{plan.marketing.reduce((s, i) => s + i.distributorAmount, 0).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right">100%</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 text-right">{plan.marketing.reduce((s, i) => s + i.manufacturerAmount, 0).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right">{plan.marketing.reduce((s, i) => s + i.totalAmount, 0).toFixed(2)}</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                                <tr className="bg-white border-t border-slate-200">
                                    <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">预算上限</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="font-medium text-slate-700">{budgetLimits.marketing > 0 ? `${budgetLimits.marketing.toFixed(2)}万` : '--'}</div>
                                        {budgetLimits.marketing > 0 && <div className="text-xs text-slate-400 font-normal mt-0.5 whitespace-nowrap">取自【拆解策略】-营销费用</div>}
                                    </td>
                                    <td className="px-4 py-3" colSpan={5}></td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                                <tr className="bg-white border-t border-slate-200">
                                    <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">预算对比</td>
                                    <td className={`px-4 py-3 text-right text-sm font-bold ${budgetLimits.marketing > 0
                                        ? (budgetLimits.marketing - currentTotals.marketing < 0 ? 'text-red-500' : 'text-emerald-600')
                                        : 'text-slate-500'
                                        }`}>
                                        {budgetLimits.marketing > 0 ? (
                                            <>{budgetLimits.marketing - currentTotals.marketing < 0 ? '超支' : '结余'} {Math.abs(budgetLimits.marketing - currentTotals.marketing).toFixed(2)}万</>
                                        ) : '--'}
                                    </td>
                                    <td className="px-4 py-3" colSpan={5}></td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Capital Section */}
                <div id="budget-section-capital" className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${getSectionHighlightClass('capital')}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Wallet className="text-brand-600" size={24} />
                            <h3 className="font-bold text-slate-700 text-lg">资金准备</h3>
                        </div>
                        <button
                            onClick={addCapitalItem}
                            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors"
                        >
                            <Plus size={14} />
                            <span>添加资金</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 w-32"><span className="text-red-500 mr-0.5">*</span>项目</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>金额(元)</th>
                                    <th className="px-4 py-3 text-right"><span className="text-red-500 mr-0.5">*</span>品牌占比</th>
                                    <th className="px-4 py-3 text-right">元气品牌分摊(元)</th>
                                    <th className="px-4 py-3 w-48">备注</th>
                                    <th className="px-4 py-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {plan.capital.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3">
                                            <select 
                                                value={item.item} 
                                                onChange={e => {
                                                    const newItems = [...plan.capital]; 
                                                    newItems[idx].item = e.target.value; 
                                                    updatePlan('capital', newItems);
                                                    // 清除高亮
                                                    clearFieldHighlight('capital', idx, 'item');
                                                }} 
                                                className={`border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white w-full ${getHighlightClass('capital', idx, 'item')}`}
                                            >
                                                <option value="">请选择</option>
                                                <option value="厂家预付款">厂家预付款</option>
                                                <option value="仓库押金">仓库押金</option>
                                                <option value="办公场所押金">办公场所押金</option>
                                                <option value="首月工资">首月工资</option>
                                                <option value="首期车辆费用">首期车辆费用</option>
                                                <option value="冰柜采购成本">冰柜采购成本</option>
                                                <option value="办公设备">办公设备</option>
                                                <option value="备用金">备用金</option>
                                                <option value="其他费用">其他费用</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`cp_amt_${idx}`, item.amount)} onChange={e => {
                                            const cleaned = handleDecimalInput(e.target.value, 2);
                                            setInputDisplays(prev => ({...prev, [`cp_amt_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.capital];
                                            newItems[idx].amount = val;
                                            newItems[idx].brandAmount = val * (newItems[idx].brandRatio / 100);
                                            updatePlan('capital', newItems);
                                            clearFieldHighlight('capital', idx, 'amount');
                                        }} className={`w-32 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('capital', idx, 'amount')}`} placeholder="0" /></td>
                                        <td className="px-4 py-3 text-right"><input type="text" inputMode="decimal" value={getDisplay(`cp_ratio_${idx}`, item.brandRatio)} onChange={e => {
                                            const cleaned = handleRatioInput(e.target.value);
                                            setInputDisplays(prev => ({...prev, [`cp_ratio_${idx}`]: cleaned}));
                                            const val = safeNumber(cleaned);
                                            const newItems = [...plan.capital];
                                            newItems[idx].brandRatio = val;
                                            newItems[idx].brandAmount = newItems[idx].amount * (val / 100);
                                            updatePlan('capital', newItems);
                                            clearFieldHighlight('capital', idx, 'brandRatio');
                                        }} className={`w-16 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${getHighlightClass('capital', idx, 'brandRatio')}`} placeholder="0" />%</td>
                                        <td className="px-4 py-3 text-right font-bold text-brand-600">{item.brandAmount.toLocaleString()}</td>
                                        <td className="px-4 py-3"><AutoResizingTextarea value={item.remark} onChange={e => {
                                            const newItems = [...plan.capital]; newItems[idx].remark = e.target.value; updatePlan('capital', newItems);
                                        }} className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" placeholder="备注说明" /></td>
                                        <td className="px-4 py-3">
                                            {plan.capital.length > 1 && (
                                                <button
                                                    onClick={() => removeCapitalItem(item.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="删除此行"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-bold">
                                    <td className="px-4 py-3">启动资金合计</td>
                                    <td className="px-4 py-3 text-right">{plan.capital.reduce((s, i) => s + i.amount, 0).toLocaleString()}元</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 text-right text-brand-600">{plan.capital.reduce((s, i) => s + i.brandAmount, 0).toLocaleString()}元</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="flex justify-between pt-6 border-t border-slate-100">
                <button onClick={handleBack} className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors flex items-center">
                    <ArrowLeft size={18} className="mr-2" /> 上一步
                </button>
                <button
                    onClick={handleNext}
                    className={`px-8 py-2.5 text-white rounded-xl font-medium shadow-lg transition-colors flex items-center ${
                        checkAllRequiredFieldsFilled() 
                            ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-200' 
                            : 'bg-slate-400 hover:bg-slate-500 shadow-slate-200'
                    }`}
                >
                    下一步 <ArrowRight size={18} className="ml-2" />
                </button>
            </div>
        </div>
    );
};

export default BudgetStep;
