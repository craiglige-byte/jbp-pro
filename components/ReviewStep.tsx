import React, { useState, useMemo } from 'react';
import { JBPData } from '../types';
import BusinessReviewStep from './BusinessReviewStep';
import PurchaseBreakdown from './PurchaseBreakdown';
import { SalesBreakdown } from './SalesBreakdown';
import InventoryBreakdown from './InventoryBreakdown';
import ProfitabilityBreakdown from './ProfitabilityBreakdown';
import { Download, ArrowLeft, TrendingUp, AlertCircle, Lightbulb, ExternalLink, Target, Calendar, Truck, Users, Warehouse, Megaphone, Wallet, X, ChevronDown, ChevronUp, Layers, FileText, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ACTION_OWNERS, OWNER_COLORS } from '../constants';

const extractNumericValue = (str: string): number => {
  if (!str) return 0;
  
  // Try to find explicit currency first: ¥ 1,000,000
  const currencyMatch = str.match(/¥\s*([\d,]+(\.\d+)?)/);
  if (currencyMatch) {
    const val = parseFloat(currencyMatch[1].replace(/,/g, ''));
    return val >= 10000 ? val / 10000 : val; // Convert to Wan if large
  }

  // Try to find explicit unit: 1000万
  const wanMatch = str.match(/([\d,]+(\.\d+)?)\s*万/);
  if (wanMatch) {
    return parseFloat(wanMatch[1].replace(/,/g, ''));
  }

  // Try to find explicit unit: 1亿
  const yiMatch = str.match(/([\d,]+(\.\d+)?)\s*亿/);
  if (yiMatch) {
    return parseFloat(yiMatch[1].replace(/,/g, '')) * 10000;
  }

  // Fallback: just find the largest number
  const matches = str.match(/([\d,]+(\.\d+)?)/g);
  if (matches) {
    const numbers = matches.map(n => parseFloat(n.replace(/,/g, '')));
    const nonYearNumbers = numbers.filter(n => n < 2020 || n > 2030);
    if (nonYearNumbers.length > 0) {
      const val = Math.max(...nonYearNumbers);
      return val >= 10000 ? val / 10000 : val;
    }
    const val = Math.max(...numbers);
    return val >= 10000 ? val / 10000 : val;
  }
  return 0;
};

interface ReviewStepProps {
    data: JBPData;
    onBack: () => void;
    planVersion?: 'large' | 'small';
    readOnly?: boolean;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ data, onBack, planVersion = 'large', readOnly = false }) => {
    const isSmall = planVersion === 'small';
    const [showBusinessReviewModal, setShowBusinessReviewModal] = useState(false);
    const [budgetModalCategory, setBudgetModalCategory] = useState<string | null>(null);
    const [activePlanModal, setActivePlanModal] = useState<string | null>(null);
    const [filterOwner, setFilterOwner] = useState<string>('all');
    const [selectedAction, setSelectedAction] = useState<{ action: any, strategy: any, objective: any } | null>(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);

    // 提交审核 - 经销商列表
    const [approvalDealers] = useState(() => [
        { id: 'd1', name: '星辰贸易有限公司', status: 'changed', planYear: '2027 FY' },
    ]);
    const hasChangedDealer = approvalDealers.some(d => d.status === 'changed');
    const [refreshKey, setRefreshKey] = useState(0);

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

    // 获取有任务的角色列表
    const getOwnersWithActions = (): string[] => {
        const ownersSet = new Set<string>();
        
        data.objectives.forEach(obj => {
            obj.strategies.forEach(strat => {
                strat.actions.forEach(action => {
                    if (action.owners && action.owners.length > 0) {
                        action.owners.forEach(owner => ownersSet.add(owner));
                    }
                });
            });
        });
        
        return Array.from(ownersSet);
    };

    const plan = data.detailedBudgetPlan;
    const currentTotals = useMemo(() => {
        if (!plan) return { warehouse: 0, vehicles: 0, personnel: 0, capital: 0, marketing: 0 };
        return {
            warehouse: plan.warehouse.reduce((sum, item) => sum + item.brandYearlyRent, 0) / 10000,
            vehicles: plan.vehicles.reduce((sum, item) => sum + item.brandYearlyCost, 0) / 10000,
            personnel: plan.personnel.reduce((sum, item) => sum + item.brandYearlyCost, 0),
            capital: plan.capital.reduce((s, i) => s + i.brandAmount, 0) / 10000,
            marketing: plan.marketing.reduce((sum, item) => sum + item.distributorAmount, 0) // Distributor amount is the cost to us
        };
    }, [plan]);

    // Generate months based on period (shared logic)
    const months = useMemo(() => {
        const period = data.period;
        let startMonth = 1;
        let year = 2024;
        let count = 3;

        if (period.includes('2024')) year = 2024;
        if (period.includes('2025')) year = 2025;
        if (period.includes('2026')) year = 2026;
        if (period.includes('2027')) year = 2027;

        if (period.includes('Q3')) { startMonth = 7; count = 3; }
        else if (period.includes('Q4')) { startMonth = 10; count = 3; }
        else if (period.includes('Q1')) { startMonth = 1; count = 3; }
        else if (period.includes('FY')) { 
            startMonth = 12; 
            count = 12;
            year--; // FY starts from Dec of previous year
        }

        const ms = [];
        for (let i = 0; i < count; i++) {
            let m = startMonth + i;
            let y = year;
            if (m > 12) { m -= 12; y++; }
            ms.push({
                id: `${y}-${String(m).padStart(2, '0')}`,
                label: `${y}年${m}月`,
                shortLabel: `${m}月`
            });
        }
        return ms;
    }, [data.period]);

    const toggleAction = (id: string) => {
        if (expandedActionId === id) {
            setExpandedActionId(null);
        } else {
            setExpandedActionId(id);
        }
    };

    const getShortTarget = (obj: any) => {
        const text = obj.targetValue;
        if (obj.title === '达成进货承诺') {
            const match = text.match(/人民币(.*?)（¥(.*?)）/);
            if (match) return `完成 ${match[2]} 进货额`;
            const fallback = text.match(/完成总计\s*(.*?)\s*的/);
            return fallback ? `完成 ${fallback[1]} 进货额` : text;
        }
        if (obj.title === '实现销售目标') {
            const match = text.match(/销售目标\s*(.*?)\s*箱/);
            return match ? `完成 ${match[1]} 箱销售量` : text;
        }
        if (obj.title === '守住库存健康') {
            const match = text.match(/优化至\s*(.*?)\s*天/);
            return match ? `保持库存周转${match[1]}天` : text;
        }
        if (obj.title === '提升盈利能力') {
            const match = text.match(/提升至\s*(.*?)\s*%/);
            return match ? `提升至 ${match[1]}% 的年度利润率` : text;
        }
        return text;
    };

    const downloadHTML = () => {
        const reportNode = document.getElementById('jbp-report-container');
        if (!reportNode) {
            alert("无法导出报告，找不到报告容器。");
            return;
        }

        // 1. Clone the report DOM
        const reportClone = reportNode.cloneNode(true) as HTMLElement;
        reportClone.style.margin = '0';
        reportClone.style.borderRadius = '0';
        reportClone.style.border = 'none';
        reportClone.style.boxShadow = 'none';

        // 2. Fix Recharts SVG sizing (only main chart SVG, not legend icons)
        const chartWrappers = reportClone.querySelectorAll('.recharts-wrapper');
        chartWrappers.forEach(wrapper => {
            const el = wrapper as HTMLElement;
            el.style.position = 'relative';
            el.style.width = '100%';
            el.style.height = '300px';
            const svg = el.querySelector(':scope > svg');
            if (svg) {
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '300');
            }
        });

        // 3. Collect ALL CSS rules from the document
        const allCSSRules: string[] = [];
        for (let i = 0; i < document.styleSheets.length; i++) {
            const sheet = document.styleSheets[i];
            try {
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                    for (let j = 0; j < rules.length; j++) {
                        allCSSRules.push(rules[j].cssText);
                    }
                }
            } catch (e) {
                // CORS blocked - try to fetch the stylesheet content
                if (sheet.href) {
                    // We'll handle external sheets below
                }
            }
        }
        // Also grab any inline <style> tag contents (Vite dev mode injects styles this way)
        document.querySelectorAll('style').forEach(styleEl => {
            if (styleEl.textContent) {
                allCSSRules.push(styleEl.textContent);
            }
        });

        // 4. Build the HTML document using DOM API (avoids template literal escaping issues)
        const doc = document.implementation.createHTMLDocument('JBP Plan - ' + data.distributorName);

        // Set charset and viewport meta
        const metaCharset = doc.createElement('meta');
        metaCharset.setAttribute('charset', 'UTF-8');
        doc.head.appendChild(metaCharset);

        const metaViewport = doc.createElement('meta');
        metaViewport.setAttribute('name', 'viewport');
        metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
        doc.head.appendChild(metaViewport);

        // Google Fonts link
        const fontLink = doc.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
        doc.head.appendChild(fontLink);

        // Main style block with all captured CSS
        const mainStyle = doc.createElement('style');
        mainStyle.textContent = allCSSRules.join('\n');
        doc.head.appendChild(mainStyle);

        // Extra override styles for the standalone HTML
        const overrideStyle = doc.createElement('style');
        overrideStyle.textContent = `
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f1f5f9; padding: 40px 20px; color: #1e293b; margin: 0; }
            .export-wrapper { max-width: 1152px; margin: 0 auto; background-color: white; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; border: 1px solid #e2e8f0; }
            @media print {
                body { padding: 0; background-color: white; }
                .export-wrapper { box-shadow: none; border-radius: 0; max-width: 100%; border: none; }
                #static-modal-overlay { display: none !important; }
            }
            #static-modal-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
                z-index: 9999; display: none; align-items: center; justify-content: center; padding: 1rem;
            }
            #static-modal-container {
                background-color: white; border-radius: 1rem; width: 100%; max-width: 64rem; max-height: 90vh;
                display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
            #static-modal-header { padding: 1.5rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background-color: #f8fafc; }
            #static-modal-body { padding: 1.5rem; overflow-y: auto; overflow-x: auto; }
            #static-modal-footer { background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 1rem; display: flex; justify-content: flex-end; }
        `;
        doc.head.appendChild(overrideStyle);

        // 5. Build body content
        // Wrapper div
        const wrapper = doc.createElement('div');
        wrapper.className = 'export-wrapper';
        wrapper.innerHTML = reportClone.outerHTML;
        doc.body.appendChild(wrapper);

        // Hidden modals container
        const modalsNode = document.getElementById('jbp-export-modals');
        if (modalsNode) {
            const hiddenModals = doc.createElement('div');
            hiddenModals.style.display = 'none';
            hiddenModals.innerHTML = modalsNode.innerHTML;
            doc.body.appendChild(hiddenModals);
        }

        // Static modal overlay
        const modalOverlay = doc.createElement('div');
        modalOverlay.id = 'static-modal-overlay';
        modalOverlay.setAttribute('onclick', 'closeStaticModal()');
        modalOverlay.innerHTML = `
            <div id="static-modal-container" onclick="event.stopPropagation()">
                <div id="static-modal-header">
                    <h2 id="static-modal-title" style="font-size:1.25rem;font-weight:700;color:#1e293b;margin:0;">详情</h2>
                    <button onclick="closeStaticModal()" style="padding:0.5rem;background:transparent;border:none;cursor:pointer;border-radius:9999px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div id="static-modal-body"></div>
                <div id="static-modal-footer">
                    <button onclick="closeStaticModal()" style="padding:0.5rem 1.5rem;background-color:#1e293b;color:white;border-radius:0.5rem;font-weight:500;border:none;cursor:pointer;">关闭详情</button>
                </div>
            </div>
        `;
        doc.body.appendChild(modalOverlay);

        // Interactive script
        const scriptEl = doc.createElement('script');
        scriptEl.textContent = `
            function openBudgetModal(category) {
                var contentNode = document.getElementById('export-modal-content-' + category);
                if (!contentNode) return;
                var titles = { warehouse: '仓库租赁详情', vehicles: '车辆配置详情', personnel: '人员架构详情', marketing: '营销费用规划详情', capital: '资金准备详情' };
                document.getElementById('static-modal-title').innerText = titles[category] || '详情';
                document.getElementById('static-modal-body').innerHTML = contentNode.innerHTML;
                document.getElementById('static-modal-overlay').style.display = 'flex';
            }
            function openBusinessReviewModal() {
                var contentNode = document.getElementById('export-business-review');
                if (!contentNode) return;
                document.getElementById('static-modal-title').innerText = '年度经营回顾详情';
                document.getElementById('static-modal-body').innerHTML = contentNode.innerHTML;
                document.getElementById('static-modal-overlay').style.display = 'flex';
            }
            function openPlanModal(id, title) {
                var contentNode = document.getElementById('export-plan-modal-' + id);
                if (!contentNode) return;
                document.getElementById('static-modal-title').innerText = title;
                document.getElementById('static-modal-body').innerHTML = contentNode.innerHTML;
                document.getElementById('static-modal-overlay').style.display = 'flex';
            }
            function openActionDetailModal(el) {
                var template = document.getElementById('export-action-detail-template');
                if (!template) return;
                
                var title = el.getAttribute('data-export-action-title') || '';
                var content = el.getAttribute('data-export-action-content') || '';
                var deadline = el.getAttribute('data-export-action-deadline') || '';
                var strategy = el.getAttribute('data-export-action-strategy') || '';
                var objective = el.getAttribute('data-export-action-objective') || '';
                var ownersStr = el.getAttribute('data-export-action-owners') || '';
                var owners = ownersStr ? ownersStr.split(',') : [];
                
                // Clone the template content
                var clone = template.cloneNode(true);
                clone.id = '';
                
                // Populate data
                var titleEl = clone.querySelector('#export-action-detail-title');
                if (titleEl) titleEl.innerText = title;
                
                var contentEl = clone.querySelector('#export-action-detail-content');
                if (contentEl) contentEl.innerText = content;
                
                var deadlineEl = clone.querySelector('#export-action-detail-deadline');
                if (deadlineEl) deadlineEl.innerText = deadline;
                
                var strategyEl = clone.querySelector('#export-action-detail-strategy');
                if (strategyEl) strategyEl.innerText = strategy;
                
                var objectiveEl = clone.querySelector('#export-action-detail-objective');
                if (objectiveEl) objectiveEl.innerText = objective;
                
                var ownersEl = clone.querySelector('#export-action-detail-owners');
                if (ownersEl) {
                    ownersEl.innerHTML = '';
                    if (owners.length > 0) {
                        owners.forEach(function(o) {
                            var span = document.createElement('span');
                            span.className = 'text-xs px-2 py-1 rounded-md font-medium bg-slate-100 text-slate-600';
                            span.innerText = o;
                            ownersEl.appendChild(span);
                        });
                    } else {
                        var span = document.createElement('span');
                        span.className = 'text-sm text-slate-400';
                        span.innerText = '-';
                        ownersEl.appendChild(span);
                    }
                }
                
                document.getElementById('static-modal-title').innerText = '行动详情 (Action Details)';
                document.getElementById('static-modal-body').innerHTML = '';
                document.getElementById('static-modal-body').appendChild(clone);
                document.getElementById('static-modal-overlay').style.display = 'flex';
            }
            function closeStaticModal() {
                document.getElementById('static-modal-overlay').style.display = 'none';
            }
            
            // Recharts fallback tooltip for exported HTML
            function setupChartsHover() {
                var chartContainers = document.querySelectorAll('[data-export-chart]');
                chartContainers.forEach(function(container) {
                    var rawDataStr = container.getAttribute('data-chart-data');
                    if (!rawDataStr) return;
                    
                    try {
                        var chartData = JSON.parse(rawDataStr);
                        var svg = container.querySelector('svg');
                        if (!svg) return;
                        
                        // Create tooltip element
                        var tooltip = document.createElement('div');
                        tooltip.style.position = 'absolute';
                        tooltip.style.display = 'none';
                        tooltip.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                        tooltip.style.border = '1px solid #e2e8f0';
                        tooltip.style.padding = '10px';
                        tooltip.style.borderRadius = '8px';
                        tooltip.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                        tooltip.style.pointerEvents = 'none';
                        tooltip.style.zIndex = '100';
                        tooltip.style.fontSize = '12px';
                        container.style.position = 'relative';
                        container.appendChild(tooltip);

                        // Find all Recharts dots/bars that have explicit positions (heuristic)
                        // This uses generic logic to find interactive svg elements in Recharts
                        var interactiveElements = svg.querySelectorAll('.recharts-dot, .recharts-bar-rectangle');
                        var dataLen = chartData.length;
                        
                        interactiveElements.forEach(function(el, i) {
                            var index = i % dataLen; 
                            var dataPoint = chartData[index];
                            if (!dataPoint) return;
                            
                            el.addEventListener('mouseenter', function(e) {
                                var month = dataPoint.month || '';
                                var inv = dataPoint.inventory || 0;
                                var days = dataPoint.days || 0;
                                var sellIn = dataPoint.sellIn || 0;
                                var sellOut = dataPoint.sellOut || 0;
                                
                                tooltip.innerHTML = '<div style="font-weight:bold;margin-bottom:4px;color:#334155">' + month + '</div>' +
                                    '<div style="color:#8b5cf6">库存数量: ' + inv + '</div>' +
                                    '<div style="color:#f59e0b">周转天数: ' + days + '</div>' +
                                    '<div style="color:#0ea5e9">进货达成率: ' + sellIn + '%</div>' +
                                    '<div style="color:#10b981">卖出达成率: ' + sellOut + '%</div>';
                                    
                                tooltip.style.display = 'block';
                            });
                            
                            el.addEventListener('mousemove', function(e) {
                                var rect = container.getBoundingClientRect();
                                tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
                                tooltip.style.top = (e.clientY - rect.top - 15) + 'px';
                            });
                            
                            el.addEventListener('mouseleave', function() {
                                tooltip.style.display = 'none';
                            });
                        });
                    } catch(e) { console.error('Error setting up chart hover:', e); }
                });
            }

            document.addEventListener('DOMContentLoaded', function() {
                // Action Schedule Filtering
                document.querySelectorAll('[data-export-filter]').forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        var filter = btn.getAttribute('data-export-filter');
                        
                        // Update button styles
                        document.querySelectorAll('[data-export-filter]').forEach(function(b) {
                            var bFilter = b.getAttribute('data-export-filter');
                            if (bFilter === filter) {
                                b.className = b.getAttribute('data-active-class');
                                var dot = b.querySelector('span');
                                if (dot && dot.hasAttribute('data-active-class')) {
                                    dot.className = dot.getAttribute('data-active-class');
                                }
                            } else {
                                b.className = b.getAttribute('data-inactive-class');
                                var dot = b.querySelector('span');
                                if (dot && dot.hasAttribute('data-inactive-class')) {
                                    dot.className = dot.getAttribute('data-inactive-class');
                                }
                            }
                        });

                        // Filter objectives
                        document.querySelectorAll('[data-export-obj-owners]').forEach(function(el) {
                            var owners = el.getAttribute('data-export-obj-owners').split(',');
                            if (filter === 'all' || owners.indexOf(filter) !== -1) {
                                el.classList.remove('hidden');
                            } else {
                                el.classList.add('hidden');
                            }
                        });

                        // Filter strategies
                        document.querySelectorAll('[data-export-strat-owners]').forEach(function(el) {
                            var owners = el.getAttribute('data-export-strat-owners').split(',');
                            if (filter === 'all' || owners.indexOf(filter) !== -1) {
                                el.classList.remove('hidden');
                            } else {
                                el.classList.add('hidden');
                            }
                        });

                        // Filter actions
                        document.querySelectorAll('[data-export-action-owners]').forEach(function(el) {
                            var owners = el.getAttribute('data-export-action-owners').split(',');
                            if (filter === 'all' || owners.indexOf(filter) !== -1) {
                                el.classList.remove('hidden');
                            } else {
                                el.classList.add('hidden');
                            }
                        });
                    });
                });

                document.querySelectorAll('[data-export-action-toggle]').forEach(function(el) {
                    el.addEventListener('click', function() {
                        var id = el.getAttribute('data-export-action-toggle');
                        var content = document.getElementById('action-content-' + id);
                        var up = document.getElementById('chevron-up-' + id);
                        var down = document.getElementById('chevron-down-' + id);
                        if (content) {
                            var isHidden = content.classList.contains('hidden');
                            if (isHidden) {
                                content.classList.remove('hidden');
                                content.classList.add('block');
                                if (up) up.style.display = 'block';
                                if (down) down.style.display = 'none';
                            } else {
                                content.classList.remove('block');
                                content.classList.add('hidden');
                                if (up) up.style.display = 'none';
                                if (down) down.style.display = 'block';
                            }
                        }
                    });
                });
                document.querySelectorAll('[data-export-modal]').forEach(function(el) {
                    el.addEventListener('click', function() {
                        openBudgetModal(el.getAttribute('data-export-modal'));
                    });
                });
                var brLink = document.querySelector('[data-export-business-review]');
                if (brLink) { brLink.addEventListener('click', openBusinessReviewModal); }
                
                document.querySelectorAll('[data-export-plan-modal]').forEach(function(el) {
                    el.addEventListener('click', function() {
                        openPlanModal(el.getAttribute('data-export-plan-modal'), el.getAttribute('data-plan-title'));
                    });
                });

                document.querySelectorAll('[data-export-action-detail]').forEach(function(el) {
                    el.addEventListener('click', function() {
                        openActionDetailModal(el);
                    });
                });

                setupChartsHover();
            });
        `;
        doc.body.appendChild(scriptEl);

        // 6. Serialize to standard HTML5 (NOT XMLSerializer which produces XHTML with self-closing tags)
        const htmlString = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;

        // 7. Create download with safe filename
        const safeName = (data.distributorName || 'report').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
        const safePeriod = (data.period || '').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
        const fileName = 'JBP_Plan_' + safeName + '_' + safePeriod + '.html';

        const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        
        // Prevent React Router from intercepting the click and ruining the "download" attribute
        a.addEventListener('click', (e) => e.stopPropagation());

        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            if (document.body.contains(a)) {
                document.body.removeChild(a);
            }
            URL.revokeObjectURL(url);
        }, 100);
    };

    // Helper to get budget summary
    const getBudgetSummary = () => {
        if (data.detailedBudgetPlan) {
            const warehouseArea = data.detailedBudgetPlan.warehouse.reduce((acc, i) => acc + i.area, 0);
            const vehicleCount = data.detailedBudgetPlan.vehicles.reduce((acc, i) => acc + i.count, 0);
            const personnelCount = data.detailedBudgetPlan.personnel.reduce((acc, i) => acc + i.count, 0);
            const marketingInvest = data.detailedBudgetPlan.marketing.reduce((acc, i) => acc + (i.distributorAmount || ((i.amount || i.totalAmount) * ((i.distributorRatio || (100 - (i.manufacturerRatio || i.ratio || 0))) / 100)) || 0), 0);
            const capitalTotal = data.detailedBudgetPlan.capital.reduce((acc, i) => acc + i.amount, 0) / 10000;
            return { warehouseArea, vehicleCount, personnelCount, marketingInvest, capitalTotal };
        }
        // Fallback to operations data if detailed plan not available
        const warehouseArea = parseInt(data.operations.warehouse.toString()) || 0;
        const vehicleCount = data.operations.vehicles.reduce((acc, i) => acc + (typeof i.count === 'string' ? parseInt(i.count) : i.count), 0);
        const personnelCount = data.operations.personnel.reduce((acc, i) => acc + (typeof i.count === 'string' ? parseInt(i.count) : i.count), 0);
        return { warehouseArea, vehicleCount, personnelCount, marketingInvest: 0, capitalTotal: 0 };
    };

    const budgetSummary = getBudgetSummary();

    // --- Modals ---

    // Budget Detail Content Renderer Utility
    const renderBudgetModalContent = (categoryOverride?: string | null) => {
        const activeCategory = categoryOverride || budgetModalCategory;
        if (!activeCategory) return null;

        // If detailed plan is missing, show a fallback message or simplified stats
        if (!data.detailedBudgetPlan) {
            return (
                <div className="p-12 text-center">
                    <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-400 mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 mb-2">暂无详细预算计划</h4>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                        请先在“规划预算”步骤中填写详细信息，系统将在此处自动展示完整明细。
                    </p>
                </div>
            );
        }

        const plan = data.detailedBudgetPlan;

        switch (activeCategory) {
            case 'warehouse':
                return (
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="p-4 border-b border-slate-100">配置方式</th>
                                <th className="p-4 border-b border-slate-100 text-right">建议总面积(㎡)</th>
                                <th className="p-4 border-b border-slate-100 text-right">元气仓库占比</th>
                                <th className="p-4 border-b border-slate-100 text-right">元气专用面积(㎡)</th>
                                <th className="p-4 border-b border-slate-100 text-right">月租金(元)</th>
                                <th className="p-4 border-b border-slate-100 text-right">年租金(元)</th>
                                <th className="p-4 border-b border-slate-100 text-right">元气分摊年租金(元)</th>
                                <th className="p-4 border-b border-slate-100">备注</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {plan.warehouse.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800">{item.type}</td>
                                    <td className="p-4 text-right text-slate-600">{item.area}</td>
                                    <td className="p-4 text-right text-slate-500">{item.brandRatio}%</td>
                                    <td className="p-4 text-right font-medium text-slate-700">{item.brandArea?.toFixed(0) || '-'}</td>
                                    <td className="p-4 text-right text-slate-600">¥{item.monthlyRent.toLocaleString()}</td>
                                    <td className="p-4 text-right text-slate-600">¥{item.yearlyRent.toLocaleString()}</td>
                                    <td className="p-4 text-right font-bold text-brand-600">¥{item.brandYearlyRent.toLocaleString()}</td>
                                    <td className="p-4 text-slate-500 text-xs max-w-xs">{item.remark}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                            <tr>
                                <td className="p-4">合计</td>
                                <td className="p-4 text-right">{plan.warehouse.reduce((s, i) => s + i.area, 0)}</td>
                                <td className="p-4"></td>
                                <td className="p-4 text-right">{plan.warehouse.reduce((s, i) => s + (i.brandArea || 0), 0).toFixed(0)}</td>
                                <td className="p-4 text-right">¥{plan.warehouse.reduce((s, i) => s + i.monthlyRent, 0).toLocaleString()}</td>
                                <td className="p-4 text-right">¥{plan.warehouse.reduce((s, i) => s + i.yearlyRent, 0).toLocaleString()}</td>
                                <td className="p-4 text-right text-brand-600">¥{plan.warehouse.reduce((s, i) => s + i.brandYearlyRent, 0).toLocaleString()}</td>
                                <td className="p-4"></td>
                            </tr>
                            <tr className="bg-white border-t border-slate-200">
                                <td className="p-4 font-medium text-slate-600">预算上限</td>
                                <td className="p-4" colSpan={5}></td>
                                <td className="p-4 text-right font-medium text-slate-700">
                                    {budgetLimits.warehouse > 0 ? (budgetLimits.warehouse * 10000).toLocaleString() : '--'}
                                </td>
                                <td className="p-4"></td>
                            </tr>
                            <tr className="bg-white border-t border-slate-200">
                                <td className="p-4 font-medium text-slate-600">预算对比</td>
                                <td className="p-4" colSpan={5}></td>
                                <td className={`p-4 text-right text-sm font-bold ${budgetLimits.warehouse > 0
                                    ? (budgetLimits.warehouse - currentTotals.warehouse < 0 ? 'text-red-500' : 'text-emerald-600')
                                    : 'text-slate-500'
                                    }`}>
                                    {budgetLimits.warehouse > 0 ? (
                                        <>
                                            {budgetLimits.warehouse - currentTotals.warehouse < 0 ? '超支' : '结余'} {Math.abs((budgetLimits.warehouse - currentTotals.warehouse) * 10000).toLocaleString()}
                                        </>
                                    ) : '--'}
                                </td>
                                <td className="p-4"></td>
                            </tr>
                        </tfoot>
                    </table>
                );
            case 'vehicles':
                return (
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="p-4 border-b border-slate-100">车型</th>
                                <th className="p-4 border-b border-slate-100">配置方式</th>
                                <th className="p-4 border-b border-slate-100 text-right">数量(辆)</th>
                                <th className="p-4 border-b border-slate-100 text-right">日均配送能力(箱/天)</th>
                                <th className="p-4 border-b border-slate-100 text-right">年运营成本(元)</th>
                                <th className="p-4 border-b border-slate-100 text-right">车辆元气占比</th>
                                <th className="p-4 border-b border-slate-100 text-right">元气分摊年成本(元)</th>
                                <th className="p-4 border-b border-slate-100">备注</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {plan.vehicles.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800">{item.model}</td>
                                    <td className="p-4 text-slate-600">{item.type}</td>
                                    <td className="p-4 text-right text-slate-700">{item.count}</td>
                                    <td className="p-4 text-right text-slate-500">{item.dailyCapacity || '-'}</td>
                                    <td className="p-4 text-right text-slate-600">¥{item.yearlyCost.toLocaleString()}</td>
                                    <td className="p-4 text-right text-slate-500">{item.brandRatio}%</td>
                                    <td className="p-4 text-right font-bold text-brand-600">¥{item.brandYearlyCost.toLocaleString()}</td>
                                    <td className="p-4 text-slate-500 text-xs max-w-xs">{item.remark}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                            <tr>
                                <td className="p-4" colSpan={2}>合计</td>
                                <td className="p-4 text-right">{plan.vehicles.reduce((s, i) => s + i.count, 0)}</td>
                                <td className="p-4 text-right">{plan.vehicles.reduce((s, i) => s + (i.dailyCapacity || 0), 0).toLocaleString()}</td>
                                <td className="p-4 text-right">¥{plan.vehicles.reduce((s, i) => s + i.yearlyCost, 0).toLocaleString()}</td>
                                <td className="p-4"></td>
                                <td className="p-4 text-right text-brand-600">¥{plan.vehicles.reduce((s, i) => s + i.brandYearlyCost, 0).toLocaleString()}</td>
                                <td className="p-4"></td>
                            </tr>
                            <tr className="bg-white border-t border-slate-200">
                                <td className="p-4 font-medium text-slate-600" colSpan={2}>预算上限</td>
                                <td className="p-4" colSpan={4}></td>
                                <td className="p-4 text-right font-medium text-slate-700">
                                    {budgetLimits.vehicles > 0 ? (budgetLimits.vehicles * 10000).toLocaleString() : '--'}
                                </td>
                                <td className="p-4"></td>
                            </tr>
                            <tr className="bg-white border-t border-slate-200">
                                <td className="p-4 font-medium text-slate-600" colSpan={2}>预算对比</td>
                                <td className="p-4" colSpan={4}></td>
                                <td className={`p-4 text-right text-sm font-bold ${budgetLimits.vehicles > 0
                                    ? (budgetLimits.vehicles - currentTotals.vehicles < 0 ? 'text-red-500' : 'text-emerald-600')
                                    : 'text-slate-500'
                                    }`}>
                                    {budgetLimits.vehicles > 0 ? (
                                        <>
                                            {budgetLimits.vehicles - currentTotals.vehicles < 0 ? '超支' : '结余'} {Math.abs((budgetLimits.vehicles - currentTotals.vehicles) * 10000).toLocaleString()}
                                        </>
                                    ) : '--'}
                                </td>
                                <td className="p-4"></td>
                            </tr>
                        </tfoot>
                    </table>
                );
            case 'personnel':
                return (
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="p-4 border-b border-slate-100">岗位</th>
                                <th className="p-4 border-b border-slate-100 text-right">人数</th>
                                <th className="p-4 border-b border-slate-100 text-right">月基本工资(元)</th>
                                <th className="p-4 border-b border-slate-100 text-right">年基本工资(万)</th>
                                <th className="p-4 border-b border-slate-100 text-right">年社保(万)</th>
                                <th className="p-4 border-b border-slate-100 text-right">年固定成本(万)</th>
                                <th className="p-4 border-b border-slate-100 text-right">年提成(万)</th>
                                <th className="p-4 border-b border-slate-100 text-right">年总成本(万)</th>
                                <th className="p-4 border-b border-slate-100 text-right">品牌占比</th>
                                <th className="p-4 border-b border-slate-100 text-right">元气分摊成本(万)</th>
                                <th className="p-4 border-b border-slate-100">备注</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {plan.personnel.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800">{item.role}</td>
                                    <td className="p-4 text-right text-slate-700">{item.count}</td>
                                    <td className="p-4 text-right text-slate-600">¥{item.monthlyBaseSalary?.toLocaleString() || '0'}</td>
                                    <td className="p-4 text-right text-slate-600">{item.yearlyBaseSalary?.toFixed(1) || '0'}</td>
                                    <td className="p-4 text-right text-slate-600">{item.yearlySocialSecurity?.toFixed(1) || '0'}</td>
                                    <td className="p-4 text-right text-slate-600">{item.yearlyFixedCost?.toFixed(1) || '0'}</td>
                                    <td className="p-4 text-right text-slate-600">{item.yearlyBonus?.toFixed(1) || '0'}</td>
                                    <td className="p-4 text-right text-slate-600">{item.yearlyTotalCost?.toFixed(1) || '0'}</td>
                                    <td className="p-4 text-right text-slate-500">{item.brandRatio}%</td>
                                    <td className="p-4 text-right font-bold text-brand-600">{item.brandYearlyCost.toFixed(1)}</td>
                                    <td className="p-4 text-slate-500 text-xs max-w-xs">{item.remark}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                            <tr>
                                <td className="p-4">合计</td>
                                <td className="p-4 text-right">{plan.personnel.reduce((s, i) => s + i.count, 0)}</td>
                                <td className="p-4 text-right">¥{plan.personnel.reduce((s, i) => s + (i.monthlyBaseSalary || 0), 0).toLocaleString()}</td>
                                <td className="p-4 text-right">{plan.personnel.reduce((s, i) => s + (i.yearlyBaseSalary || 0), 0).toFixed(1)}</td>
                                <td className="p-4 text-right">{plan.personnel.reduce((s, i) => s + (i.yearlySocialSecurity || 0), 0).toFixed(1)}</td>
                                <td className="p-4 text-right">{plan.personnel.reduce((s, i) => s + (i.yearlyFixedCost || 0), 0).toFixed(1)}</td>
                                <td className="p-4 text-right">{plan.personnel.reduce((s, i) => s + (i.yearlyBonus || 0), 0).toFixed(1)}</td>
                                <td className="p-4 text-right">{plan.personnel.reduce((s, i) => s + (i.yearlyTotalCost || 0), 0).toFixed(1)}</td>
                                <td className="p-4"></td>
                                <td className="p-4 text-right text-brand-600">{plan.personnel.reduce((s, i) => s + i.brandYearlyCost, 0).toFixed(1)}</td>
                                <td className="p-4"></td>
                            </tr>
                            <tr className="bg-white border-t border-slate-200">
                                <td className="p-4 font-medium text-slate-600">预算上限</td>
                                <td className="p-4" colSpan={8}></td>
                                <td className="p-4 text-right font-medium text-slate-700">
                                    {budgetLimits.personnel > 0 ? budgetLimits.personnel.toLocaleString() : '--'}
                                </td>
                                <td className="p-4"></td>
                            </tr>
                            <tr className="bg-white border-t border-slate-200">
                                <td className="p-4 font-medium text-slate-600">预算对比</td>
                                <td className="p-4" colSpan={8}></td>
                                <td className={`p-4 text-right text-sm font-bold ${budgetLimits.personnel > 0
                                    ? (budgetLimits.personnel - currentTotals.personnel < 0 ? 'text-red-500' : 'text-emerald-600')
                                    : 'text-slate-500'
                                    }`}>
                                    {budgetLimits.personnel > 0 ? (
                                        <>
                                            {budgetLimits.personnel - currentTotals.personnel < 0 ? '超支' : '结余'} {Math.abs(budgetLimits.personnel - currentTotals.personnel).toLocaleString()}
                                        </>
                                    ) : '--'}
                                </td>
                                <td className="p-4"></td>
                            </tr>
                        </tfoot>
                    </table>
                );
            case 'marketing':
                return (
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="p-4 border-b border-slate-100">费用项</th>
                                <th className="p-4 border-b border-slate-100 text-right">经销商承担(万元)</th>
                                <th className="p-4 border-b border-slate-100 text-right">费用占比</th>
                                <th className="p-4 border-b border-slate-100 text-right">厂家承担(%)</th>
                                <th className="p-4 border-b border-slate-100 text-right">厂家承担(万元)</th>
                                <th className="p-4 border-b border-slate-100 text-right">总投入预算(万元)</th>
                                <th className="p-4 border-b border-slate-100">备注说明</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {plan.marketing.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800">{item.item}</td>
                                    <td className="p-4 text-right font-medium text-brand-600">¥{item.distributorAmount || ((item.amount || item.totalAmount) * ((item.distributorRatio || (100 - (item.manufacturerRatio || item.ratio || 0))) / 100)).toFixed(2)}</td>
                                    <td className="p-4 text-right text-slate-500">{item.ratio}%</td>
                                    <td className="p-4 text-right text-slate-500">{item.manufacturerRatio || item.ratio || 0}%</td>
                                    <td className="p-4 text-right text-slate-600">¥{item.manufacturerAmount || ((item.amount || item.totalAmount) * ((item.manufacturerRatio || item.ratio || 0) / 100)).toFixed(2)}</td>
                                    <td className="p-4 text-right font-bold text-slate-800">¥{item.amount || item.totalAmount}</td>
                                    <td className="p-4 text-slate-500 text-xs max-w-xs">{item.remark || ''}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                            <tr>
                                <td className="p-4">合计</td>
                                <td className="p-4 text-right text-brand-600">¥{plan.marketing.reduce((s, i) => s + (i.distributorAmount || ((i.amount || i.totalAmount) * ((i.distributorRatio || (100 - (i.manufacturerRatio || i.ratio || 0))) / 100)) || 0), 0).toFixed(2)}</td>
                                <td className="p-4"></td>
                                <td className="p-4"></td>
                                <td className="p-4 text-right">¥{plan.marketing.reduce((s, i) => s + (i.manufacturerAmount || ((i.amount || i.totalAmount) * ((i.manufacturerRatio || i.ratio || 0) / 100)) || 0), 0).toFixed(2)}</td>
                                <td className="p-4 text-right">¥{plan.marketing.reduce((s, i) => s + (i.amount || i.totalAmount || 0), 0).toFixed(2)}</td>
                                <td className="p-4"></td>
                            </tr>
                            <tr className="bg-white border-t border-slate-200">
                                <td className="p-4 font-medium text-slate-600">预算上限</td>
                                <td className="p-4 text-right font-medium text-slate-700">
                                    {budgetLimits.marketing > 0 ? budgetLimits.marketing.toLocaleString() : '--'}
                                </td>
                                <td className="p-4" colSpan={4}></td>
                                <td className="p-4"></td>
                            </tr>
                            <tr className="bg-white border-t border-slate-200">
                                <td className="p-4 font-medium text-slate-600">预算对比</td>
                                <td className={`p-4 text-right text-sm font-bold ${budgetLimits.marketing > 0
                                    ? (budgetLimits.marketing - currentTotals.marketing < 0 ? 'text-red-500' : 'text-emerald-600')
                                    : 'text-slate-500'
                                    }`}>
                                    {budgetLimits.marketing > 0 ? (
                                        <>
                                            {budgetLimits.marketing - currentTotals.marketing < 0 ? '超支' : '结余'} {Math.abs(budgetLimits.marketing - currentTotals.marketing).toLocaleString()}
                                        </>
                                    ) : '--'}
                                </td>
                                <td className="p-4" colSpan={4}></td>
                                <td className="p-4"></td>
                            </tr>
                        </tfoot>
                    </table>
                );
            case 'capital':
                return (
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="p-4 border-b border-slate-100">项目</th>
                                <th className="p-4 border-b border-slate-100 text-right">资金需求(万)</th>
                                <th className="p-4 border-b border-slate-100 text-right">品牌占比</th>
                                <th className="p-4 border-b border-slate-100 text-right">元气资金需求(万)</th>
                                <th className="p-4 border-b border-slate-100">备注</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {plan.capital.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800">{item.item}</td>
                                    <td className="p-4 text-right text-slate-600">¥{(item.amount / 10000).toFixed(1)}</td>
                                    <td className="p-4 text-right text-slate-500">{item.brandRatio}%</td>
                                    <td className="p-4 text-right font-bold text-brand-600">¥{(item.brandAmount / 10000).toFixed(1)}</td>
                                    <td className="p-4 text-slate-500 text-xs max-w-xs">{item.remark}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                            <tr>
                                <td className="p-4">合计</td>
                                <td className="p-4 text-right">¥{(plan.capital.reduce((s, i) => s + i.amount, 0) / 10000).toFixed(1)}</td>
                                <td className="p-4"></td>
                                <td className="p-4 text-right text-brand-600">¥{(plan.capital.reduce((s, i) => s + i.brandAmount, 0) / 10000).toFixed(1)}</td>
                                <td className="p-4"></td>
                            </tr>
                        </tfoot>
                    </table>
                );
            default:
                return null;
        }
    };

    const budgetModalTitles: Record<string, string> = {
        warehouse: '仓库租赁详情',
        vehicles: '车辆配置详情',
        personnel: '人员架构详情',
        marketing: '营销费用规划详情',
        capital: '资金准备详情'
    };

    const budgetModalIcons: Record<string, React.ReactNode> = {
        warehouse: <Warehouse size={20} className="text-blue-600" />,
        vehicles: <Truck size={20} className="text-indigo-600" />,
        personnel: <Users size={20} className="text-emerald-600" />,
        marketing: <Megaphone size={20} className="text-amber-600" />,
        capital: <Wallet size={20} className="text-rose-600" />
    };


    const renderPlanModalContent = () => {
        if (!activePlanModal) return null;
        const obj = data.objectives.find(o => o.id === activePlanModal);
        if (!obj) return null;

        if (obj.title === '达成进货承诺') {
            return (
                <PurchaseBreakdown 
                    objective={obj} 
                    updateObjective={() => {}}
                    months={months}
                    trends={data.trends}
                    productCategories={data.productCategories}
                    readOnly={true}
                />
            );
        } else if (obj.title === '实现销售目标') {
            return (
                <SalesBreakdown 
                    objective={obj} 
                    onUpdate={() => {}}
                    readOnly={true}
                />
            );
        } else if (obj.title === '守住库存健康') {
            return (
                <InventoryBreakdown
                    objective={obj}
                    updateObjective={() => {}}
                    productCategories={data.productCategories}
                    purchasePlan={data.objectives.find(o => o.title === '达成进货承诺')?.purchasePlan}
                    salesPlan={data.objectives.find(o => o.title === '实现销售目标')?.salesPlan}
                    salesTarget={data.objectives.find(o => o.title === '实现销售目标')?.targetValue}
                    months={months}
                    readOnly={true}
                />
            );
        } else if (obj.title === '提升盈利能力') {
            return (
                <ProfitabilityBreakdown
                    objective={obj}
                    updateObjective={() => {}}
                    salesTarget={extractNumericValue(data.objectives.find(o => o.title === '实现销售目标')?.targetValue || '')}
                    purchaseTarget={extractNumericValue(data.objectives.find(o => o.title === '达成进货承诺')?.targetValue || '')}
                    readOnly={true}
                />
            );
        }
        return null;
    };

    return (
        <>
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">

            {/* Plan Modal */}
            {activePlanModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
                            <h2 className="text-2xl font-bold text-slate-800">
                                {data.objectives.find(o => o.id === activePlanModal)?.title === '达成进货承诺' ? '年度进货规划表' :
                                 data.objectives.find(o => o.id === activePlanModal)?.title === '实现销售目标' ? '年度销售规划表' :
                                 data.objectives.find(o => o.id === activePlanModal)?.title === '守住库存健康' ? '年度库存规划表' :
                                 data.objectives.find(o => o.id === activePlanModal)?.title === '提升盈利能力' ? '年度盈利规划表' : '规划详情'}
                            </h2>
                            <button onClick={() => setActivePlanModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors group">
                                <X size={24} className="text-slate-400 group-hover:text-slate-600" />
                            </button>
                        </div>
                        <div className="p-8 bg-slate-50/50">
                            {renderPlanModalContent()}
                        </div>
                    </div>
                </div>
            )}

            {/* Business Review Modal */}
            {showBusinessReviewModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
                            <h2 className="text-2xl font-bold text-slate-800">年度经营回顾详情</h2>
                            <button onClick={() => setShowBusinessReviewModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors group">
                                <X size={24} className="text-slate-400 group-hover:text-slate-600" />
                            </button>
                        </div>
                        <div className="p-8 bg-slate-50/50">
                            <BusinessReviewStep
                                data={data}
                                updateData={() => { }}
                                onNext={() => { }}
                                onBack={() => { }}
                                readOnly={true}
                            />
                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={() => setShowBusinessReviewModal(false)}
                                    className="px-8 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium shadow-lg transition-colors"
                                >
                                    关闭详情
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Budget Detail Modal */}
            {budgetModalCategory && (
                <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    {budgetModalIcons[budgetModalCategory]}
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg">{budgetModalTitles[budgetModalCategory]}</h3>
                            </div>
                            <button
                                onClick={() => setBudgetModalCategory(null)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors group"
                            >
                                <X size={20} className="text-slate-400 group-hover:text-slate-600" />
                            </button>
                        </div>
                        <div className="p-0 overflow-x-auto max-h-[70vh]">
                            {renderBudgetModalContent()}
                        </div>
                        <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end">
                            <button
                                onClick={() => setBudgetModalCategory(null)}
                                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors text-sm"
                            >
                                关闭详情
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Actions */}
            {!readOnly && (
            <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center transition-colors">
                    <ArrowLeft size={18} className="mr-1" /> 返回编辑
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => alert('草稿已保存')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
                    >
                        保存草稿
                    </button>
                    <button
                        onClick={() => setShowApprovalModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center text-sm"
                    >
                        <FileText size={16} className="mr-2" />
                        提交计划
                    </button>
                </div>
            </div>
            )}

            {/* Report Container */}
            <div id="jbp-report-container" className="bg-white shadow-xl shadow-slate-200/50 rounded-none md:rounded-lg overflow-hidden border border-slate-100 min-h-[1000px]">

                {/* Report Header */}
                <div className="bg-slate-50/50 p-10 border-b border-slate-100 flex flex-col items-center text-center">
                    <h1 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">
                        元气森林 <span className="text-brand-600 mx-2">X</span> {data.distributorName} 年度联合生意规划
                    </h1>
                    <div className="flex items-center space-x-8 text-sm text-slate-500 justify-center">
                        <span>创建日期: {new Date().toLocaleDateString()}</span>
                        <span>创建人: {data.managerName}</span>
                        <span>周期: {data.period}</span>
                    </div>
                </div>

                <div className="p-10 space-y-12">

                    {/* Section 1: Business Review */}
                    <section>
                        <div className="flex items-center mb-6 border-l-4 border-brand-600 pl-4">
                            <h2 className="text-xl font-bold text-slate-800">第一部分: 年度生意回顾</h2>
                        </div>

                        {/* Metrics Grid */}
                        <div className="mb-8">
                            <h3 className="flex items-center text-sm font-bold text-brand-600 mb-4">
                                <TrendingUp size={16} className="mr-2" /> 经营数据概览
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Sell-in (进货)', value: data.performance.sellIn, unit: '万' },
                                    { label: 'Sell-out (出货)', value: data.performance.sellOut, unit: '万' },
                                    { label: '网点覆盖', value: data.performance.coverage, unit: '家' },
                                    { label: '核心分销', value: data.performance.distribution, unit: '%' },
                                    { label: '冰柜投放', value: data.performance.coolers, unit: '台' },
                                    { label: 'vpo', value: data.performance.efficiency, unit: '元/店' },
                                    { label: '经营利润', value: data.performance.profit, unit: '万', color: 'text-green-600' },
                                ].map((item, i) => (
                                    <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                                        <div className={`text-xl font-bold ${item.color || 'text-slate-800'}`}>
                                            {item.value} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Trend Chart */}
                        <div className="mb-8">
                            <h3 className="flex items-center text-sm font-bold text-brand-600 mb-4">
                                <TrendingUp size={16} className="mr-2" /> 经营趋势分析
                            </h3>
                            <div 
                                className="h-80 w-full bg-slate-50 rounded-xl p-4 border border-slate-100"
                                data-export-chart="trends"
                                data-chart-data={JSON.stringify(data.trends)}
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data.trends}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="left" orientation="left" stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="inventory" name="库存数量" fill="#8b5cf6" barSize={20} radius={[4, 4, 0, 0]} fillOpacity={0.6} />
                                        <Line yAxisId="right" type="monotone" dataKey="days" name="周转天数" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                                        <Line yAxisId="right" type="monotone" dataKey="sellIn" name="进货达成率(%)" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
                                        <Line yAxisId="right" type="monotone" dataKey="sellOut" name="卖出达成率(%)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Issues & Opportunities */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-red-50/50 p-6 rounded-xl border border-red-100">
                                <h3 className="flex items-center text-sm font-bold text-red-600 mb-4">
                                    <AlertCircle size={16} className="mr-2" /> 待解决问题
                                </h3>
                                <div className="space-y-4">
                                    {data.issues.map(issue => (
                                        <div key={issue.id}>
                                            <div className="text-sm font-bold text-slate-800 mb-1 flex items-center">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></span>
                                                {issue.title}
                                            </div>
                                            <div className="text-xs text-slate-600 pl-3.5 leading-relaxed">{issue.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-emerald-50/50 p-6 rounded-xl border border-emerald-100">
                                <h3 className="flex items-center text-sm font-bold text-emerald-600 mb-4">
                                    <Lightbulb size={16} className="mr-2" /> 待挖掘机会
                                </h3>
                                <div className="space-y-4">
                                    {data.opportunities.map(opp => (
                                        <div key={opp.id}>
                                            <div className="text-sm font-bold text-slate-800 mb-1 flex items-center">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                                                {opp.title}
                                            </div>
                                            <div className="text-xs text-slate-600 pl-3.5 leading-relaxed">{opp.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="text-center mt-6">
                            <button
                                onClick={() => setShowBusinessReviewModal(true)}
                                data-export-business-review="true"
                                className="text-brand-600 text-sm font-medium hover:underline flex items-center justify-center mx-auto"
                            >
                                查看完整经营回顾 <ExternalLink size={14} className="ml-1" />
                            </button>
                        </div>
                    </section>

                    {/* Section 2: Business Plan */}
                    <section>
                        <div className="flex items-center mb-6 border-l-4 border-brand-600 pl-4">
                            <h2 className="text-xl font-bold text-slate-800">第二部分: 年度生意规划</h2>
                        </div>

                        {/* Objectives Breakdown */}
                        <div className="mb-10">
                            <h3 className="flex items-center text-lg font-bold text-slate-800 mb-6">
                                <Target size={20} className="mr-2 text-brand-600" /> 1. 拆解目标 (Breakdown Objectives)
                            </h3>

                            <div className="space-y-6">
                                {data.objectives.map((obj, idx) => (
                                    <div key={obj.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                            <div className="font-bold text-slate-800 flex items-center">
                                                <span className="text-brand-600 mr-2">G{idx + 1}</span> {obj.title}
                                            </div>
                                            <div 
                                                className="text-xs font-semibold text-brand-700 bg-brand-50 px-4 py-1.5 rounded-lg border border-brand-200/50 flex items-center shadow-sm cursor-pointer hover:bg-brand-100 transition-colors"
                                                onClick={() => setActivePlanModal(obj.id)}
                                                data-export-plan-modal={obj.id}
                                                data-plan-title={
                                                    obj.title === '达成进货承诺' ? '年度进货规划表' :
                                                    obj.title === '实现销售目标' ? '年度销售规划表' :
                                                    obj.title === '守住库存健康' ? '年度库存规划表' :
                                                    obj.title === '提升盈利能力' ? '年度盈利规划表' : '规划详情'
                                                }
                                            >
                                                <Target size={14} className="mr-2 flex-shrink-0 text-brand-500" />
                                                <span>{getShortTarget(obj)}</span>
                                            </div>
                                        </div>
                                        {!isSmall && (
                                        <div className="p-0">
                                            <div className="grid grid-cols-12 text-xs font-medium text-slate-500 border-b border-slate-100 bg-slate-50/30">
                                                <div className="col-span-6 p-3 pl-6">策略 (Strategy)</div>
                                                <div className="col-span-6 p-3 border-l border-slate-100">行动 (Action)</div>
                                            </div>
                                            {obj.strategies.map((strat) => (
                                                <div key={strat.id} className="grid grid-cols-12 text-sm border-b last:border-0 border-slate-100 group hover:bg-slate-50/50 transition-colors">
                                                    <div className="col-span-6 p-4 pl-6 text-slate-800 font-medium leading-relaxed">
                                                        {strat.text}
                                                    </div>
                                                    <div className="col-span-6 p-4 border-l border-slate-100 space-y-2">
                                                        {strat.actions.map(act => (
                                                            <div
                                                                key={act.id}
                                                                className="flex flex-col text-xs text-slate-600 bg-white border border-slate-100 rounded p-2 shadow-sm cursor-pointer hover:border-brand-200 hover:shadow-md transition-all"
                                                                onClick={() => toggleAction(act.id)}
                                                                data-export-action-toggle={act.id}
                                                            >
                                                                <div className="flex items-start">
                                                                    <span className="text-brand-500 mr-1.5 mt-0.5" id={`chevron-up-${act.id}`} style={{ display: expandedActionId === act.id ? 'block' : 'none' }}>
                                                                        <ChevronUp size={12} />
                                                                    </span>
                                                                    <span className="text-brand-500 mr-1.5 mt-0.5" id={`chevron-down-${act.id}`} style={{ display: expandedActionId === act.id ? 'none' : 'block' }}>
                                                                        <ChevronDown size={12} />
                                                                    </span>
                                                                    <div className="flex-1">
                                                                        <div className="font-medium text-slate-700 mb-0.5">{act.title || act.text.split(/[:：]/)[0]}</div>
                                                                        <div className="flex items-center text-slate-400 scale-90 origin-left">
                                                                            <Users size={10} className="mr-1" /> {(act.owners || []).join(', ')}
                                                                            <Calendar size={10} className="ml-2 mr-1" /> {act.deadline}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {(act.content || act.text) && (
                                                                    <div 
                                                                        id={`action-content-${act.id}`} 
                                                                        className={`mt-2 pt-2 border-t border-slate-100 text-slate-500 pl-5 ${expandedActionId === act.id ? 'block' : 'hidden'}`}
                                                                    >
                                                                        {act.content || act.text}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Budget Plan */}
                        <div className="mb-10">
                            <h3 className="flex items-center text-lg font-bold text-slate-800 mb-6">
                                <Wallet size={20} className="mr-2 text-brand-600" /> 2. 预算规划 (Budget Planning)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div
                                    onClick={() => setBudgetModalCategory('warehouse')}
                                    data-export-modal="warehouse"
                                    className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center cursor-pointer hover:border-brand-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink size={14} className="text-brand-400" />
                                    </div>
                                    <div className="w-12 h-12 mx-auto bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Warehouse size={24} />
                                    </div>
                                    <div className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">仓库租赁</div>
                                    <div className="text-base font-bold text-slate-800">{budgetSummary.warehouseArea} <span className="text-xs font-normal text-slate-400">㎡</span></div>
                                    <div className="mt-2 text-[10px] text-brand-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">查看明细</div>
                                </div>
                                <div
                                    onClick={() => setBudgetModalCategory('vehicles')}
                                    data-export-modal="vehicles"
                                    className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center cursor-pointer hover:border-brand-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink size={14} className="text-brand-400" />
                                    </div>
                                    <div className="w-12 h-12 mx-auto bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Truck size={24} />
                                    </div>
                                    <div className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">元气车辆数量</div>
                                    <div className="text-base font-bold text-slate-800">{budgetSummary.vehicleCount} <span className="text-xs font-normal text-slate-400">辆</span></div>
                                    <div className="mt-2 text-[10px] text-brand-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">查看明细</div>
                                </div>
                                <div
                                    onClick={() => setBudgetModalCategory('personnel')}
                                    data-export-modal="personnel"
                                    className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center cursor-pointer hover:border-brand-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink size={14} className="text-brand-400" />
                                    </div>
                                    <div className="w-12 h-12 mx-auto bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Users size={24} />
                                    </div>
                                    <div className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">人员架构</div>
                                    <div className="text-base font-bold text-slate-800">{budgetSummary.personnelCount} <span className="text-xs font-normal text-slate-400">人</span></div>
                                    <div className="mt-2 text-[10px] text-brand-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">查看明细</div>
                                </div>
                                <div
                                    onClick={() => setBudgetModalCategory('marketing')}
                                    data-export-modal="marketing"
                                    className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center cursor-pointer hover:border-brand-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink size={14} className="text-brand-400" />
                                    </div>
                                    <div className="w-12 h-12 mx-auto bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Megaphone size={24} />
                                    </div>
                                    <div className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">费用规划</div>
                                    <div className="text-base font-bold text-slate-800">¥{budgetSummary.marketingInvest.toFixed(1)} <span className="text-xs font-normal text-slate-400">万</span></div>
                                    <div className="mt-2 text-[10px] text-brand-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">查看明细</div>
                                </div>
                                <div
                                    onClick={() => setBudgetModalCategory('capital')}
                                    data-export-modal="capital"
                                    className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center cursor-pointer hover:border-brand-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink size={14} className="text-brand-400" />
                                    </div>
                                    <div className="w-12 h-12 mx-auto bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Wallet size={24} />
                                    </div>
                                    <div className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">资金准备</div>
                                    <div className="text-base font-bold text-slate-800">¥{budgetSummary.capitalTotal.toFixed(1)} <span className="text-xs font-normal text-slate-400">万</span></div>
                                    <div className="mt-2 text-[10px] text-brand-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">查看明细</div>
                                </div>
                            </div>
                        </div>

                        {/* Action Schedule — only for large version */}
                        {!isSmall && (
                        <div>
                            <h3 className="flex items-center text-lg font-bold text-slate-800 mb-6">
                                <Calendar size={20} className="mr-2 text-brand-600" /> 3. 行动排期 (Action Schedule)
                            </h3>
                            
                            {/* Filter Tabs */}
                            <div className="flex-shrink-0 mb-4 flex space-x-2 overflow-x-auto pb-2 hide-scrollbar">
                                <button
                                    onClick={() => setFilterOwner('all')}
                                    data-export-filter="all"
                                    data-active-class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center bg-slate-800 text-white shadow-md"
                                    data-inactive-class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center ${
                                        filterOwner === 'all' 
                                        ? 'bg-slate-800 text-white shadow-md' 
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <Layers size={14} className="mr-1.5" />
                                    全局视图 (All)
                                </button>
                                <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
                                {getOwnersWithActions().map(owner => (
                                    <button
                                        key={owner}
                                        onClick={() => setFilterOwner(owner)}
                                        data-export-filter={owner}
                                        data-active-class={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center ring-2 ring-offset-1 ring-offset-slate-50 ${OWNER_COLORS[owner]?.bg.replace('50', '100')} ${OWNER_COLORS[owner]?.text} border-transparent font-bold shadow-sm`}
                                        data-inactive-class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center ${
                                            filterOwner === owner 
                                            ? `ring-2 ring-offset-1 ring-offset-slate-50 ${OWNER_COLORS[owner]?.bg.replace('50', '100')} ${OWNER_COLORS[owner]?.text} border-transparent font-bold shadow-sm` 
                                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span 
                                            data-active-class="w-2 h-2 rounded-full mr-1.5 bg-current"
                                            data-inactive-class={`w-2 h-2 rounded-full mr-1.5 ${OWNER_COLORS[owner]?.bg.replace('bg-', 'bg-').replace('50', '400')}`}
                                            className={`w-2 h-2 rounded-full mr-1.5 ${filterOwner === owner ? 'bg-current' : OWNER_COLORS[owner]?.bg.replace('bg-', 'bg-').replace('50', '400')}`}
                                        ></span>
                                        {owner}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="flex-1 overflow-auto relative">
                                    <div style={{ minWidth: 250 + (4 * 140) }}>
                                        {/* Matrix Header */}
                                        <div className="sticky top-0 z-30 grid border-b border-slate-200 bg-slate-50 shadow-sm" 
                                              style={{ gridTemplateColumns: `250px repeat(4, minmax(140px, 1fr))` }}>
                                            <div className="p-3 text-xs font-bold text-slate-500 uppercase flex items-center bg-slate-50 border-b border-slate-200">
                                                策略 (Strategy)
                                            </div>
                                            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                                                <div key={q} className="p-3 text-center text-xs font-bold text-slate-500 uppercase border-l border-slate-200 bg-slate-50 border-b">
                                                    {q}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Matrix Body */}
                                        <div>
                                            {data.objectives.map(obj => {
                                                // Check if objective has any actions with deadlines
                                                const validActions = obj.strategies.flatMap(s => s.actions.filter(a => a.deadline));
                                                if (validActions.length === 0) return null;
                                                
                                                const objOwners = Array.from(new Set(validActions.flatMap(a => a.owners || [])));
                                                const isObjVisible = filterOwner === 'all' || objOwners.includes(filterOwner);

                                                return (
                                                    <div key={obj.id} className={`border-b border-slate-200 last:border-0 ${isObjVisible ? '' : 'hidden'}`} data-export-obj-owners={objOwners.join(',')}>
                                                        <div className="sticky top-[41px] z-20 bg-slate-100/95 px-4 py-2 text-xs font-bold text-slate-800 border-b border-slate-200 backdrop-blur-sm shadow-sm flex items-center">
                                                            Goal: {obj.title}
                                                        </div>

                                                        {obj.strategies.map(strat => {
                                                            // Check if strategy has any actions with deadlines
                                                            const validStratActions = strat.actions.filter(a => a.deadline);
                                                            if (validStratActions.length === 0) return null;
                                                            
                                                            const stratOwners = Array.from(new Set(validStratActions.flatMap(a => a.owners || [])));
                                                            const isStratVisible = filterOwner === 'all' || stratOwners.includes(filterOwner);

                                                            return (
                                                                <div key={strat.id} className={`grid group min-h-[100px] ${isStratVisible ? '' : 'hidden'}`} data-export-strat-owners={stratOwners.join(',')} 
                                                                    style={{ gridTemplateColumns: `250px repeat(4, minmax(140px, 1fr))` }}>
                                                                    
                                                                    {/* Strategy Cell */}
                                                                    <div className="p-3 border-r border-slate-100 text-xs text-slate-600 bg-white">
                                                                        <div className="line-clamp-4 font-medium mb-1 leading-relaxed" title={strat.text}>{strat.text}</div>
                                                                    </div>

                                                                    {/* Quarter Cells */}
                                                                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                                                                        const actions = strat.actions.filter(act => {
                                                                            const month = act.scheduledMonth || act.deadline;
                                                                            if (!month) return false;
                                                                            
                                                                            const m = month.toLowerCase();
                                                                            const isAll = m.includes('每月') || m.includes('全年') || m.includes('每季度') || m.includes('持续');
                                                                            
                                                                            if (q === 'Q1' && (isAll || m.includes('1月') || m.includes('2月') || m.includes('3月') || m.includes('q1') || m.includes('01') || m.includes('02') || m.includes('03'))) return true;
                                                                            if (q === 'Q2' && (isAll || m.includes('4月') || m.includes('5月') || m.includes('6月') || m.includes('q2') || m.includes('04') || m.includes('05') || m.includes('06'))) return true;
                                                                            if (q === 'Q3' && (isAll || m.includes('7月') || m.includes('8月') || m.includes('9月') || m.includes('q3') || m.includes('07') || m.includes('08') || m.includes('09'))) return true;
                                                                            if (q === 'Q4' && (isAll || m.includes('10月') || m.includes('11月') || m.includes('12月') || m.includes('q4') || m.includes('10') || m.includes('11') || m.includes('12'))) return true;
                                                                            
                                                                            return false;
                                                                        });
                                                                        
                                                                        return (
                                                                            <div key={q} className="p-2 border-l border-slate-100 bg-white min-h-[100px]">
                                                                                {actions.map((act: any, i: number) => {
                                                                                    const primaryOwner = act.owners && act.owners.length > 0 ? act.owners[0] : '经销商';
                                                                                    const colors = OWNER_COLORS[primaryOwner] || { bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-500' };
                                                                                    const isActVisible = filterOwner === 'all' || (act.owners && act.owners.includes(filterOwner));
                                                                                    
                                                                                    return (
                                                                                        <div 
                                                                                            key={i} 
                                                                                            className={`mb-2 last:mb-0 p-1.5 border rounded-md shadow-sm relative cursor-pointer hover:shadow-md transition-all ${colors.bg} ${colors.border} ${isActVisible ? '' : 'hidden'}`}
                                                                                            data-export-action-owners={(act.owners || []).join(',')}
                                                                                            data-export-action-detail={act.id}
                                                                                            data-export-action-title={act.title || act.text.split(/[:：]/)[0]}
                                                                                            data-export-action-content={act.content || act.text}
                                                                                            data-export-action-deadline={act.deadline || '未排期'}
                                                                                            data-export-action-strategy={strat.text}
                                                                                            data-export-action-objective={obj.title}
                                                                                            onClick={() => setSelectedAction({ action: act, strategy: strat, objective: obj })}
                                                                                        >
                                                                                            <div className="flex items-start gap-2">
                                                                                                <div className="mt-0.5 flex-shrink-0 text-slate-400 opacity-60">
                                                                                                    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                                        <circle cx="2.5" cy="2.5" r="1.5" fill="currentColor"/>
                                                                                                        <circle cx="2.5" cy="7" r="1.5" fill="currentColor"/>
                                                                                                        <circle cx="2.5" cy="11.5" r="1.5" fill="currentColor"/>
                                                                                                        <circle cx="7.5" cy="2.5" r="1.5" fill="currentColor"/>
                                                                                                        <circle cx="7.5" cy="7" r="1.5" fill="currentColor"/>
                                                                                                        <circle cx="7.5" cy="11.5" r="1.5" fill="currentColor"/>
                                                                                                    </svg>
                                                                                                </div>
                                                                                                <div className="flex-grow min-w-0">
                                                                                                    <div className={`leading-tight break-words text-xs line-clamp-2 ${colors.text}`}>
                                                                                                        {act.title ? (
                                                                                                            <div className="font-bold">{act.title}</div>
                                                                                                        ) : (
                                                                                                            <div className="font-medium">{act.text}</div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                                                                        {(act.owners || []).map((o: string) => (
                                                                                                            <span key={o} className={`text-[10px] px-1.5 py-0.5 rounded ${OWNER_COLORS[o]?.badge || 'bg-slate-100 text-slate-500'}`}>
                                                                                                                {o}
                                                                                                            </span>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}

                        {/* Action Details Modal */}
                        {selectedAction && (
                            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                                    <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
                                        <h3 className="font-bold text-slate-800 flex items-center">
                                            <Target size={18} className="mr-2 text-brand-600" />
                                            行动详情 (Action Details)
                                        </h3>
                                        <button onClick={() => setSelectedAction(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                                        {/* Action Title/Content */}
                                        <div>
                                            <div className="text-lg font-bold text-slate-900 mb-2">
                                                {selectedAction.action.title || selectedAction.action.text.split(/[:：]/)[0]}
                                            </div>
                                            <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                {selectedAction.action.content || selectedAction.action.text}
                                            </div>
                                        </div>

                                        {/* Meta Info Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">负责人 (Owners)</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(selectedAction.action.owners || []).map((o: string) => (
                                                        <span key={o} className={`text-xs px-2 py-1 rounded-md font-medium ${OWNER_COLORS[o]?.badge || 'bg-slate-100 text-slate-600'}`}>
                                                            {o}
                                                        </span>
                                                    ))}
                                                    {(!selectedAction.action.owners || selectedAction.action.owners.length === 0) && (
                                                        <span className="text-sm text-slate-400">-</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">时间 (Deadline)</div>
                                                <div className="text-sm font-medium text-slate-800 flex items-center">
                                                    <Calendar size={14} className="mr-1.5 text-slate-400" />
                                                    {selectedAction.action.deadline || '未排期'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Context */}
                                        <div className="border-t border-slate-100 pt-4 space-y-3">
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">所属策略 (Strategy)</div>
                                                <div className="text-sm text-slate-700">{selectedAction.strategy.text}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">所属目标 (Objective)</div>
                                                <div className="text-sm font-medium text-slate-800">{selectedAction.objective.title}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                        <button 
                                            onClick={() => setSelectedAction(null)}
                                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
                                        >
                                            关闭
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Hidden Export Static Modal Templates */}
                        <div id="jbp-export-modals" style={{ position: 'absolute', top: '-9999px', left: '-9999px', visibility: 'hidden', width: '1000px' }}>
                            <div id="export-action-detail-template">
                                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                                    <div>
                                        <div id="export-action-detail-title" className="text-lg font-bold text-slate-900 mb-2"></div>
                                        <div id="export-action-detail-content" className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">负责人 (Owners)</div>
                                            <div id="export-action-detail-owners" className="flex flex-wrap gap-1.5"></div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">时间 (Deadline)</div>
                                            <div className="text-sm font-medium text-slate-800 flex items-center">
                                                <Calendar size={14} className="mr-1.5 text-slate-400" />
                                                <span id="export-action-detail-deadline"></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t border-slate-100 pt-4 space-y-3">
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">所属策略 (Strategy)</div>
                                            <div id="export-action-detail-strategy" className="text-sm text-slate-700"></div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">所属目标 (Objective)</div>
                                            <div id="export-action-detail-objective" className="text-sm font-medium text-slate-800"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="export-business-review">
                                <BusinessReviewStep
                                    data={data}
                                    updateData={() => { }}
                                    onNext={() => { }}
                                    onBack={() => { }}
                                    readOnly={true}
                                />
                            </div>
                            <div id="export-modal-content-warehouse">
                                {renderBudgetModalContent('warehouse')}
                            </div>
                            <div id="export-modal-content-vehicles">
                                {renderBudgetModalContent('vehicles')}
                            </div>
                            <div id="export-modal-content-personnel">
                                {renderBudgetModalContent('personnel')}
                            </div>
                            <div id="export-modal-content-marketing">
                                {renderBudgetModalContent('marketing')}
                            </div>
                            <div id="export-modal-content-capital">
                                {renderBudgetModalContent('capital')}
                            </div>
                            {data.objectives.map(obj => {
                                const activePlanModalBackup = activePlanModal;
                                // We need a way to render the content for each objective.
                                // Since renderPlanModalContent uses activePlanModal state, we can just render the components directly here.
                                let content = null;
                                if (obj.title === '达成进货承诺') {
                                    content = <PurchaseBreakdown objective={obj} updateObjective={() => {}} months={months} trends={data.trends} productCategories={data.productCategories} readOnly={true} />;
                                } else if (obj.title === '实现销售目标') {
                                    content = <SalesBreakdown objective={obj} onUpdate={() => {}} readOnly={true} />;
                                } else if (obj.title === '守住库存健康') {
                                    content = <InventoryBreakdown objective={obj} updateObjective={() => {}} productCategories={data.productCategories} purchasePlan={data.objectives.find(o => o.title === '达成进货承诺')?.purchasePlan} salesPlan={data.objectives.find(o => o.title === '实现销售目标')?.salesPlan} salesTarget={data.objectives.find(o => o.title === '实现销售目标')?.targetValue} months={months} readOnly={true} />;
                                } else if (obj.title === '提升盈利能力') {
                                    content = <ProfitabilityBreakdown objective={obj} updateObjective={() => {}} salesTarget={extractNumericValue(data.objectives.find(o => o.title === '实现销售目标')?.targetValue || '')} purchaseTarget={extractNumericValue(data.objectives.find(o => o.title === '达成进货承诺')?.targetValue || '')} readOnly={true} />;
                                }
                                return (
                                    <div key={obj.id} id={`export-plan-modal-${obj.id}`}>
                                        {content}
                                    </div>
                                );
                            })}
                        </div>

                    </section>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 p-12 flex justify-center items-center text-sm text-slate-500">
                    <div className="flex justify-center gap-32 w-full max-w-3xl">
                        <div className="border-t border-slate-300 pt-2 w-64 text-center">
                            <div className="font-bold text-slate-800 mb-1">经销商签字 (DISTRIBUTOR)</div>
                        </div>
                        <div className="border-t border-slate-300 pt-2 w-64 text-center">
                            <div className="font-bold text-slate-800 mb-1">城市经理签字 (MANAGER)</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        {/* Toast 提示 */}
        {showToast && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-slide-down">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    已提交
                </div>
            </div>
        )}

        {/* ========== 提交计划弹窗 ========== */}
        {showApprovalModal && (
            <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h3 className="text-base font-bold text-slate-800">年度计划提交</h3>
                        <button onClick={() => setShowApprovalModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1">
                        <p className="text-sm font-medium text-slate-700 mb-3">本次提交经销商：小黄鸭商贸有限公司</p>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                            <p className="text-xs text-amber-800">
                                以下经销商授权区域发生变更，本次提交将回退下列经销商生意计划，稍后需自行前往年度计划列表重新编辑与提交。
                            </p>
                        </div>

                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 rounded-lg">
                                <tr>
                                    <th className="px-4 py-2 font-semibold">经销商名称</th>
                                    <th className="px-4 py-2 font-semibold">计划年度</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvalDealers.map((dealer) => (
                                    <tr key={dealer.id} className="border-b border-slate-100">
                                        <td className="px-4 py-2 font-medium text-slate-800">{dealer.name}</td>
                                        <td className="px-4 py-2">{dealer.planYear}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                        <button
                            onClick={() => setShowApprovalModal(false)}
                            className="px-4 py-1.5 text-slate-600 text-sm font-medium hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            className="px-6 py-2 rounded-lg font-medium shadow-md bg-slate-800 hover:bg-slate-900 text-white transition-colors"
                            onClick={() => { setShowApprovalModal(false); setShowToast(true); setTimeout(() => setShowToast(false), 3000); }}
                        >
                            确认提交
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default ReviewStep;
