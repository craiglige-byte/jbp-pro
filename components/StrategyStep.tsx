import React, { useState, useMemo } from 'react';
import { JBPData, JBPObjective, TemplateStrategy } from '../types';
import { OBJECTIVE_TEMPLATES } from '../constants';
import { Sparkles, Plus, X, Lightbulb, Scale, PieChart, BrainCircuit, MessageSquareQuote, Loader2 } from 'lucide-react';
import PurchaseBreakdown from './PurchaseBreakdown';
import { SalesBreakdown } from './SalesBreakdown';
import InventoryBreakdown from './InventoryBreakdown';
import ProfitabilityBreakdown from './ProfitabilityBreakdown';

interface StrategyStepProps {
  data: JBPData;
  updateData: (updates: Partial<JBPData>) => void;
  onNext: () => void;
  onBack: () => void;
  planVersion?: 'large' | 'small';
}

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
    // Filter out likely years (2020-2030)
    const candidates = numbers.filter(n => n < 2020 || n > 2030);
    const max = candidates.length > 0 ? Math.max(...candidates) : Math.max(...numbers);
    return max >= 10000 ? max / 10000 : max;
  }

  return 0;
};

const StrategyStep: React.FC<StrategyStepProps> = ({ data, updateData, onNext, onBack, planVersion = 'large' }) => {
  const isSmall = planVersion === 'small';
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ show: boolean; message: string; objId?: string }>({ show: false, message: '' });
  
  // 验证错误状态
  const [validationErrors, setValidationErrors] = useState<{
    [objId: string]: {
      keyResults?: { [krId: string]: { text?: boolean; target?: boolean } };
      strategies?: { [sId: string]: { text?: boolean; measure?: boolean } };
      missingKeyResults?: boolean;
      missingStrategies?: boolean;
    };
  }>({});

  // 记录是否已尝试提交（用于显示错误提示）
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // 逐步引导状态：当前聚焦的目标和部分
  type FocusPart = 'breakdown' | 'strategy';
  const [currentFocus, setCurrentFocus] = useState<{ objId: string; part: FocusPart } | null>(null);

  // 检查单个目标的部分是否完成
  const isPartComplete = (obj: any, part: FocusPart): boolean => {
    // Small version: skip strategy validation — each breakdown module handles its own validation
    if (part === 'strategy' && isSmall) return true;

    const isSpecial = ['达成进货承诺', '实现销售目标', '守住库存健康', '提升盈利能力'].includes(obj.title);

    if (part === 'breakdown') {
      if (isSpecial) {
        if (obj.title === '达成进货承诺') return !!obj.purchasePlan;
        if (obj.title === '实现销售目标') return !!obj.salesPlan;
        if (obj.title === '守住库存健康') return !!obj.inventoryPlan;
        if (obj.title === '提升盈利能力') return !!obj.profitabilityPlan;
      } else {
        return !!obj.keyResults && obj.keyResults.length > 0;
      }
    } else {
      if (!obj.strategies || obj.strategies.length === 0) {
        return false;
      }
      // 检查每个策略是否都有 text 和 measure
      return obj.strategies.every((s: any) => s.text?.trim());
    }
  };

  // 获取下一个未完成的部分
  const getNextIncompletePart = (): { objId: string; part: FocusPart } | null => {
    for (const obj of data.objectives) {
      if (!isPartComplete(obj, 'breakdown')) {
        return { objId: obj.id, part: 'breakdown' };
      }
      if (!isPartComplete(obj, 'strategy')) {
        return { objId: obj.id, part: 'strategy' };
      }
    }
    return null;
  };

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

  const addStrategy = (objId: string, suggestion: TemplateStrategy) => {
    const obj = data.objectives.find(o => o.id === objId);
    let actions: any[] = [];

    // Special handling for "达成进货承诺" strategies
    if (obj && obj.title === '达成进货承诺') {
        // Parse target value
        let targetNum = 0;
        const targetStr = obj.targetValue || '';
        const cleanStr = targetStr.replace(/[^\d.]/g, '');
        if (cleanStr) {
            targetNum = parseFloat(cleanStr);
            if (targetStr.includes('万')) targetNum *= 10000;
            else if (targetStr.includes('亿')) targetNum *= 100000000;
        }

        // Determine year for deadlines (Previous year relative to plan year)
        let year = 2025; // Default
        if (data.period.includes('2024')) year = 2024;
        if (data.period.includes('2025')) year = 2025;
        if (data.period.includes('2026')) year = 2026;
        if (data.period.includes('2027')) year = 2027;
        const prevYear = year - 1;

        if (suggestion.text.startsWith('资金前置储备')) {
            const reserveNum = targetNum * 0.3;
            const reserveStr = reserveNum >= 10000 
                ? `${(reserveNum / 10000).toFixed(2).replace(/\.00$/, '')}万元`
                : `${reserveNum.toFixed(0)}元`;
            
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '资金需求测算与来源确认',
                    content: `测算30%储备金额，并明确资金来源（自有资金、银行贷款或股东增资），形成书面方案。`,
                    text: `资金需求测算与来源确认：测算30%储备金额，并明确资金来源（自有资金、银行贷款或股东增资），形成书面方案。`,
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '资金存入专用账户',
                    content: `由经销商老板在12月31日前，将资金存入指定的专用账户，确保账户资金仅用于支付厂家货款。`,
                    text: `资金存入专用账户：由经销商老板在12月31日前，将资金存入指定的专用账户，确保账户资金仅用于支付厂家货款。`,
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('年度规划与动态复盘双循环')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '年度进货规划制定',
                    content: '由经销商老板与品牌方城市经理在11月-12月期间共同制定年度进货规划，明确各季度品类进货目标与节奏，形成书面文件作为全年执行依据。',
                    text: '年度进货规划制定：由经销商老板与品牌方城市经理在11月-12月期间共同制定年度进货规划，明确各季度品类进货目标与节奏，形成书面文件作为全年执行依据。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '月度预实分析',
                    content: '由经销商老板组织销售主管每月对实际进货与月度计划进行对比分析，计算偏差率并分析原因，形成月度预实分析报表，用于指导下月进货调整。',
                    text: '月度预实分析：由经销商老板组织销售主管每月对实际进货与月度计划进行对比分析，计算偏差率并分析原因，形成月度预实分析报表，用于指导下月进货调整。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '季度复盘与策略调整',
                    content: '由经销商老板每季度末组织品牌方城市经理、销售主管召开复盘会，结合厂家政策变化、市场动态及季度目标达成情况，调整下一季度进货策略，并形成会议纪要。',
                    text: '季度复盘与策略调整：由经销商老板每季度末组织品牌方城市经理、销售主管召开复盘会，结合厂家政策变化、市场动态及季度目标达成情况，调整下一季度进货策略，并形成会议纪要。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_4`,
                    title: '年度总结与经验沉淀',
                    content: '由经销商老板在全年结束后，组织品牌方城市经理、销售主管等核心人员召开年度总结会，分析目标达成情况，总结成功经验和偏差教训，形成书面报告用于下一年规划。',
                    text: '年度总结与经验沉淀：由经销商老板在全年结束后，组织品牌方城市经理、销售主管等核心人员召开年度总结会，分析目标达成情况，总结成功经验和偏差教训，形成书面报告用于下一年规划。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('月度预估与订货微调双保险')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '月度进货计划制定',
                    content: '由经销商老板（或指定数据分析人员）每月下旬，基于历史同期销售数据、下月销售预测（由销售主管提供）及厂家已知政策，制定下月各品类进货计划，作为月度执行的基准。',
                    text: '月度进货计划制定：由经销商老板（或指定数据分析人员）每月下旬，基于历史同期销售数据、下月销售预测（由销售主管提供）及厂家已知政策，制定下月各品类进货计划，作为月度执行的基准。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '订货前动态微调',
                    content: '由经销商老板在实际下单前（通常为每月初），结合销售主管反馈的最新终端动销数据、当前库存水位及厂家临时政策，对月度计划进行灵活调整，确保每次订货贴近市场实际。',
                    text: '订货前动态微调：由经销商老板在实际下单前（通常为每月初），结合销售主管反馈的最新终端动销数据、当前库存水位及厂家临时政策，对月度计划进行灵活调整，确保每次订货贴近市场实际。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                }
            ];
        }
    }

    // Special handling for "实现销售目标" strategies
    if (obj && obj.title === '实现销售目标') {
        let year = 2025; // Default
        if (data.period.includes('2024')) year = 2024;
        if (data.period.includes('2025')) year = 2025;
        if (data.period.includes('2026')) year = 2026;
        if (data.period.includes('2027')) year = 2027;
        const prevYear = year - 1;

        if (suggestion.text.startsWith('人效提升与激励绑定')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '人与片区匹配优化',
                    text: '人与片区匹配优化：盘点现有业务员负责的片区，分析各片区终端数量、潜力、现有业绩，重新分配片区（如有必要），确保人区匹配；同时根据终端分级明确各片区业务员的拜访频率和路线规划。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '绩效奖金方案设计',
                    text: '绩效奖金方案设计：制定详细的月度绩效奖金方案，包括：完成80%以下无提成；80%-100%按比例线性发放；超过100%部分给予坎级超额提成（如超额1%-5%提成1%，超额5%以上提成1.5%）；明确计算公式并全员宣导。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '月度排名与即时激励',
                    text: '月度排名与即时激励：每月1日统计上月各业务员销售目标完成率，制作排名榜在团队群内公示；对前三名给予即时奖励（如红包、荣誉证书），营造比学赶超氛围。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_4`,
                    title: '协访帮扶机制',
                    text: '协访帮扶机制：明确连续两个月完成率低于80%的业务员，由销售主管安排每周一次协访，现场诊断问题，制定改进计划并记录帮扶过程；连续三个月仍不达标者，考虑调整片区或岗位。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('存量维持与单品突破')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '存量基础盘点与目标设定',
                    text: '存量基础盘点与目标设定：梳理各片区各终端现有SKU覆盖情况，识别下滑风险；为各片区设定年度SKU维持目标（确保现有SKU不下滑）和重点单品铺货目标。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '战略单品筛选与方案制定',
                    text: '战略单品筛选与方案制定：结合区域历史数据和公司产品趋势，确定年度战略单品（如外星人电解质水），制定专项推广方案，包括重点门店清单、陈列标准、促销形式、店员激励政策及推广时间轴。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '战略单品推广落地',
                    text: '战略单品推广落地：在重点门店按方案执行陈列调整、店员培训、促销活动，每周统计铺货进度和销售数据；确保外星人电解质水销售额达成率100%。',
                    owner: '业务员',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_4`,
                    title: '存量与单品跟踪复盘',
                    text: '存量与单品跟踪复盘：每月分析存量SKU动销变化，对下滑SKU制定补救措施；每月统计战略单品销售额达成率，对比目标分析偏差；每季度复盘推广效果，优化后续策略。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('终端分级与单店产出提升')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '终端分级标准制定',
                    text: '终端分级标准制定：根据门店销量、位置、合作意愿、潜力等维度，制定A/B/C类终端分级标准；完成所有终端门店的分类建档，明确各等级门店名单及占比。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '分级服务政策与资源配置',
                    text: '分级服务政策与资源配置：针对A/B/C类门店制定差异化服务政策（A类店高频拜访、陈列奖励、冰柜投放、优先促销；B类店常规拜访、基础陈列维护、阶段性促销；C类店定期拜访、保持铺货），确保资源精准投入。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '陈列标杆与样板片区打造',
                    text: '陈列标杆与样板片区打造：在各片区选取不同等级的代表性门店，打造标准化陈列标杆，形成可复制的模板，组织业务员现场学习，推动全片区陈列水平提升。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_4`,
                    title: '消费者促销形式探索',
                    text: '消费者促销形式探索：在不同等级门店试点差异化消费者促销形式（A类店试饮、买赠；B类店第二件半价；C类店搭赠），评估效果后筛选有效形式，形成标准化方案推广。',
                    owner: '品牌专员',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_5`,
                    title: '单店产出跟踪与分级优化',
                    text: '单店产出跟踪与分级优化：每月统计各等级门店单店销售额及增长率，分析产出变化；对增长未达标的门店匹配不同提升策略，确保全部门店单店产出稳步提升，A类店同比增长≥10%。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('渠道拓展与空白区域开发')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '潜在终端分析与开发计划',
                    text: '潜在终端分析与开发计划：运用互联网工具和实地摸排，梳理各片区未覆盖的潜在终端（新小区底商、写字楼便利店、健身房、企事业单位等）；为每个片区制定年度开发计划，明确新增有效终端数量目标。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '冰柜投放与陈列抢占',
                    text: '冰柜投放与陈列抢占：根据开发计划，为符合条件的新终端投放冰柜，抢占陈列位；排查现有终端冰柜使用情况，对闲置或竞品占用的冰柜进行回收或置换，提升冰柜产出效率。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '特通渠道专项开发',
                    text: '特通渠道专项开发：由经销商老板或指定专员负责，对接企事业单位、健身房、学校、运动赛事等，争取团购订单、福利用水、赛事赞助等合作机会；建立特通客户档案，定期维护。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_4`,
                    title: '增量目标跟踪与复盘',
                    text: '增量目标跟踪与复盘：每月统计新开发终端贡献的销售额，与存量销售额对比，计算增量部分是否达到全年目标（增量 = 总目标 - 存量老终端销售额）；季度复盘开发进度，对滞后片区调整开发策略。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('过程管控与数据复盘')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '日报周报机制',
                    text: '日报周报机制：建立每日销量上报制度（业务员通过微信群或小程序提报当日销售额）；销售主管每周一汇总上周各片区完成情况，形成周报在团队内通报进度。',
                    owner: '业务员',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '月度预实分析与改进会',
                    text: '月度预实分析与改进会：每月5日前召开月度预实分析会：对比上月实际与计划，计算偏差率，分析原因，针对滞后片区或品类制定改进措施，明确责任人和完成时限。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '季度复盘与策略微调',
                    text: '季度复盘与策略微调：每季度末由经销商老板组织季度复盘会：回顾本季度目标达成情况，分析策略执行效果，对下一季度销售策略进行必要微调（全年总目标不变）。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_4`,
                    title: '偏差预警与快速响应',
                    text: '偏差预警与快速响应：建立偏差预警机制：当某片区月度进度偏差超过10%时，销售主管需在一周内进行专项分析并提交改进计划；连续两个月偏差超过10%的片区，由经销商老板亲自介入复盘。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_5`,
                    title: '数据工具与报表体系',
                    text: '数据工具与报表体系：建立或优化Excel销售追踪模板，实现每日数据自动汇总、月度偏差自动计算、目标完成率可视化；逐步引入数字化工具提升数据效率。',
                    owner: '品牌专员',
                    deadline: '',
                    status: 'pending'
                }
            ];
        }
    }

    // Special handling for "守住库存健康" strategies
    if (obj && obj.title === '守住库存健康') {
        let year = 2025; // Default
        if (data.period.includes('2024')) year = 2024;
        if (data.period.includes('2025')) year = 2025;
        if (data.period.includes('2026')) year = 2026;
        if (data.period.includes('2027')) year = 2027;
        const prevYear = year - 1;

        if (suggestion.text.startsWith('动态安全库存与补货预警')) {
             actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '安全库存模型建立',
                    content: '收集各品类过去12个月的销售数据、采购周期，计算各品类月度平均销量、标准差，设定安全库存系数（如1.5倍），制定安全库存计算公式。',
                    text: '安全库存模型建立：收集各品类过去12个月的销售数据、采购周期，计算各品类月度平均销量、标准差，设定安全库存系数（如1.5倍），制定安全库存计算公式。',
                    owner: '数据分析',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '安全库存参数设置',
                    content: '根据模型，为每个品类设置安全库存天数（如A类高周转品7天，B类15天，C类30天），并在进销存系统中设置预警线。',
                    text: '安全库存参数设置：根据模型，为每个品类设置安全库存天数（如A类高周转品7天，B类15天，C类30天），并在进销存系统中设置预警线。',
                    owner: '采购',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '补货预警触发机制',
                    content: '当库存低于安全线时，系统或手工记录触发预警，采购员需在24小时内评估是否需要下单补货，并与销售确认需求。',
                    text: '补货预警触发机制：当库存低于安全线时，系统或手工记录触发预警，采购员需在24小时内评估是否需要下单补货，并与销售确认需求。',
                    owner: '采购',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_4`,
                    title: '模型参数月度优化',
                    content: '每月根据最新销售数据，重新计算平均销量和标准差，动态调整安全库存系数，确保模型贴近实际。',
                    text: '模型参数月度优化：每月根据最新销售数据，重新计算平均销量和标准差，动态调整安全库存系数，确保模型贴近实际。',
                    owner: '数据分析',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('进销存数据滚动预测')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '建立滚动预测模板',
                    content: '设计Excel或系统模板，包含：上月库存、本月销售目标、本月进货计划、在途订单，自动计算月末库存及未来3个月库存预测。',
                    text: '建立滚动预测模板：设计Excel或系统模板，包含：上月库存、本月销售目标、本月进货计划、在途订单，自动计算月末库存及未来3个月库存预测。',
                    owner: '数据分析',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '月度预实分析会同步',
                    content: '每月5日前，在销售预实分析会后，由采购主持进销存预测会，根据最新销售进度调整进货计划，确保库存不超标。',
                    text: '月度预实分析会同步：每月5日前，在销售预实分析会后，由采购主持进销存预测会，根据最新销售进度调整进货计划，确保库存不超标。',
                    owner: '采购',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '预测偏差跟踪',
                    content: '每月对比实际库存与预测值，分析偏差原因（销售波动、到货延迟），改进预测模型。',
                    text: '预测偏差跟踪：每月对比实际库存与预测值，分析偏差原因（销售波动、到货延迟），改进预测模型。',
                    owner: '数据分析',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('临期品专项处理机制')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '临期品月度盘点',
                    content: '每月25日，仓管盘点库存，筛选出剩余保质期不足2个月的临期品，形成预警清单。',
                    text: '临期品月度盘点：每月25日，仓管盘点库存，筛选出剩余保质期不足2个月的临期品，形成预警清单。',
                    owner: '仓管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '临期品处理方案制定',
                    content: '销售主管根据临期品清单，制定处理方案（特价、搭赠、转团购、捐赠等），明确责任人和完成时限（一般1个月内处理完毕）。',
                    text: '临期品处理方案制定：销售主管根据临期品清单，制定处理方案（特价、搭赠、转团购、捐赠等），明确责任人和完成时限（一般1个月内处理完毕）。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '临期品处理跟踪',
                    content: '每周跟踪临期品消化进度，对处理缓慢的及时督促；月底统计处理率，纳入考核。',
                    text: '临期品处理跟踪：每周跟踪临期品消化进度，对处理缓慢的及时督促；月底统计处理率，纳入考核。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_4`,
                    title: '临期原因分析',
                    content: '每季度分析临期品产生原因（进货过量？动销慢？），反馈给采购，优化后续进货计划。',
                    text: '临期原因分析：每季度分析临期品产生原因（进货过量？动销慢？），反馈给采购，优化后续进货计划。',
                    owner: '采购',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('库存盘点与责任制度')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '月度抽盘',
                    content: '每月随机抽取5-10个SKU进行实物盘点，核对账面库存，记录差异。',
                    text: '月度抽盘：每月随机抽取5-10个SKU进行实物盘点，核对账面库存，记录差异。',
                    owner: '仓管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '季度全盘',
                    content: '每季度末对所有库存进行全面盘点，调整账面差异，分析原因（出入库错误、丢失等）。',
                    text: '季度全盘：每季度末对所有库存进行全面盘点，调整账面差异，分析原因（出入库错误、丢失等）。',
                    owner: '仓管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '差异追责与改进',
                    content: '对盘点差异超过0.1%的，追查责任人（仓管、收发员），制定改进措施（如加强培训、优化流程）。',
                    text: '差异追责与改进：对盘点差异超过0.1%的，追查责任人（仓管、收发员），制定改进措施（如加强培训、优化流程）。',
                    owner: '仓库主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_4`,
                    title: '库存准确率考核',
                    content: '将库存准确率纳入仓管绩效考核，目标≥99%，低于目标扣减绩效。',
                    text: '库存准确率考核：将库存准确率纳入仓管绩效考核，目标≥99%，低于目标扣减绩效。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('进销联动与库存健康考核')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '库存健康指标纳入考核',
                    content: '将月度平均库存周转天数≤45天纳入采购和销售主管的绩效考核，权重10%-20%。',
                    text: '库存健康指标纳入考核：将月度平均库存周转天数≤45天纳入采购和销售主管的绩效考核，权重10%-20%。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '月度库存健康报告',
                    content: '每月5日前，数据分析出具上月库存健康报告，包括周转天数、断货次数、临期品占比、库存准确率，通报全员。',
                    text: '月度库存健康报告：每月5日前，数据分析出具上月库存健康报告，包括周转天数、断货次数、临期品占比、库存准确率，通报全员。',
                    owner: '数据分析',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '库存健康复盘会',
                    content: '每季度在经营分析会中，专门复盘库存健康指标，对不达标月份分析原因，调整后续策略。',
                    text: '库存健康复盘会：每季度在经营分析会中，专门复盘库存健康指标，对不达标月份分析原因，调整后续策略。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                }
            ];
        }
    }

    // Special handling for "提升盈利能力" strategies
    if (obj && obj.title === '提升盈利能力') {
        let year = 2025; // Default
        if (data.period.includes('2024')) year = 2024;
        if (data.period.includes('2025')) year = 2025;
        if (data.period.includes('2026')) year = 2026;
        if (data.period.includes('2027')) year = 2027;
        const prevYear = year - 1;

        if (suggestion.text.startsWith('产品结构优化与毛利提升')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '完成产品“毛利-返利”四象限分析',
                    content: '财务与销售部门拉通数据，计算每个SKU的“毛利率+返利收益”，划分为明星、金牛、问题和瘦狗产品，明确主攻与淘汰对象。',
                    text: '完成产品“毛利-返利”四象限分析：财务与销售部门拉通数据，计算每个SKU的“毛利率+返利收益”，划分为明星、金牛、问题和瘦狗产品，明确主攻与淘汰对象。',
                    owner: '财务',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '制定并发布高收益产品主推手册',
                    content: '基于分析结果，确定年度主推产品清单，配套专用话术、陈列标准及销售激励方案，组织全员培训。',
                    text: '制定并发布高收益产品主推手册：基于分析结果，确定年度主推产品清单，配套专用话术、陈列标准及销售激励方案，组织全员培训。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '执行低效产品清退计划',
                    content: '对“问题”和“瘦狗”产品制定停购、促销清库或退回厂家的具体计划，释放资金与货架空间。',
                    text: '执行低效产品清退计划：对“问题”和“瘦狗”产品制定停购、促销清库或退回厂家的具体计划，释放资金与货架空间。',
                    owner: '采购',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_4`,
                    title: '实施月度产品结构复盘',
                    content: '每月销售会议首要分析各品类销售收入与毛利占比，对照目标调整下月主推重心。',
                    text: '实施月度产品结构复盘：每月销售会议首要分析各品类销售收入与毛利占比，对照目标调整下月主推重心。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('渠道精耕与单点价值挖掘')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '完成全渠道网点价值分级',
                    content: '根据历史进货数据、利润贡献、合作稳定性，将网点划分为A（核心）、B（成长）、C（覆盖）三类，并列出A类网点明细。',
                    text: '完成全渠道网点价值分级：根据历史进货数据、利润贡献、合作稳定性，将网点划分为A（核心）、B（成长）、C（覆盖）三类，并列出A类网点明细。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '启动A类网点“金牌伙伴计划”',
                    content: '为每个A类网点定制服务方案，包括固定拜访频率、专属促销支持、优先新品上架、季度生意回顾。',
                    text: '启动A类网点“金牌伙伴计划”：为每个A类网点定制服务方案，包括固定拜访频率、专属促销支持、优先新品上架、季度生意回顾。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '建立与复制“单店盈利提升模型”',
                    content: '在3-5个标杆A类店试点，通过优化排面、增加冰柜、组合促销等方式提升产出，总结经验并推广至同类门店。',
                    text: '建立与复制“单店盈利提升模型”：在3-5个标杆A类店试点，通过优化排面、增加冰柜、组合促销等方式提升产出，总结经验并推广至同类门店。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('市场费用精准化与效能提升')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '完成历史营销费用审计',
                    content: '复盘上一年度每项市场投入（陈列、促销活动），计算其带来的直接销量增量与毛利，识别并终止低效或无效投入模式。',
                    text: '完成历史营销费用审计：复盘上一年度每项市场投入（陈列、促销活动），计算其带来的直接销量增量与毛利，识别并终止低效或无效投入模式。',
                    owner: '品牌专员',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '推行“预算-目标-核销”闭环管理',
                    content: '所有市场费用申请需明确预期提升的销量/网点目标；执行后需通过终端拍照、数据对比等方式验证效果，方可核销。',
                    text: '推行“预算-目标-核销”闭环管理：所有市场费用申请需明确预期提升的销量/网点目标；执行后需通过终端拍照、数据对比等方式验证效果，方可核销。',
                    owner: '品牌专员',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '每季度召开费效专项评审会',
                    content: '分析上季度各项营销活动的实际ROI，决策下季度费用投向，持续优化费用结构。',
                    text: '每季度召开费效专项评审会：分析上季度各项营销活动的实际ROI，决策下季度费用投向，持续优化费用结构。',
                    owner: '财务',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('供应链与运营成本精益化')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '严格执行动态安全库存与补货预警机制',
                    content: '在进销存系统中为每个主力SKU设置安全库存线，触发预警后24小时内必须响应。',
                    text: '严格执行动态安全库存与补货预警机制：在进销存系统中为每个主力SKU设置安全库存线，触发预警后24小时内必须响应。',
                    owner: '采购',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '实施月度“进-销-存”滚动预测会议',
                    content: '每月5日，销售、采购、财务基于最新销售预测，共同审视并调整未来3个月的采购计划，避免过剩与缺货。',
                    text: '实施月度“进-销-存”滚动预测会议：每月5日，销售、采购、财务基于最新销售预测，共同审视并调整未来3个月的采购计划，避免过剩与缺货。',
                    owner: '采购',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '优化仓储布局与配送线路',
                    content: '分析订单热力图，调整仓储备货区，合并邻近区域的零散配送订单，提升车辆满载率。',
                    text: '优化仓储布局与配送线路：分析订单热力图，调整仓储备货区，合并邻近区域的零散配送订单，提升车辆满载率。',
                    owner: '仓库主管',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('运营费用管控与效率提升')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '实施全面预算管理与审批冻结机制',
                    content: '制定详细的年度费用预算，任何预算外支出需经老板特批，并对超预算部门发出预警。',
                    text: '实施全面预算管理与审批冻结机制：制定详细的年度费用预算，任何预算外支出需经老板特批，并对超预算部门发出预警。',
                    owner: '财务',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '推行业代移动办公系统（APP）',
                    content: '上线集成客户拜访、订单录入、库存查看、费用申报功能的APP，提升业务效率，减少内勤工作量。',
                    text: '推行业代移动办公系统（APP）：上线集成客户拜访、订单录入、库存查看、费用申报功能的APP，提升业务效率，减少内勤工作量。',
                    owner: '销售主管',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '开展“节流增效”全员倡议',
                    content: '公开各项行政费用标准，鼓励无纸化办公、拼车出差，对节约建议给予奖励。',
                    text: '开展“节流增效”全员倡议：公开各项行政费用标准，鼓励无纸化办公、拼车出差，对节约建议给予奖励。',
                    owner: '经销商老板',
                    deadline: '',
                    status: 'pending'
                }
            ];
        } else if (suggestion.text.startsWith('厂家返利政策研究与最大化获取')) {
            actions = [
                {
                    id: `act_${Date.now()}_1`,
                    title: '解码返利政策并制定“获取路线图”',
                    content: '与厂家经理确认所有返利条款，将销量、品类、季度等返利目标分解到月，形成可视化追踪表。',
                    text: '解码返利政策并制定“获取路线图”：与厂家经理确认所有返利条款，将销量、品类、季度等返利目标分解到月，形成可视化追踪表。',
                    owner: '财务',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_2`,
                    title: '建立返利达成月度预警机制',
                    content: '每月财务对照“路线图”核对进度，对可能无法达成的项目，提前一个月向销售与采购部门发出红色预警，并制定补救计划。',
                    text: '建立返利达成月度预警机制：每月财务对照“路线图”核对进度，对可能无法达成的项目，提前一个月向销售与采购部门发出红色预警，并制定补救计划。',
                    owner: '财务',
                    deadline: '',
                    status: 'pending'
                },
                {
                    id: `act_${Date.now()}_3`,
                    title: '主动进行返利兑现核对与申诉',
                    content: '在厂家每个返利结算周期结束后一周内，主动提交对账数据与所需凭证，如有差异立即沟通申诉，确保返利足额到账。',
                    text: '主动进行返利兑现核对与申诉：在厂家每个返利结算周期结束后一周内，主动提交对账数据与所需凭证，如有差异立即沟通申诉，确保返利足额到账。',
                    owner: '财务',
                    deadline: '',
                    status: 'pending'
                }
            ];
        }
    }

    const newObjectives = data.objectives.map(obj => {
      if (obj.id === objId) {
        return {
          ...obj,
          strategies: [
            ...obj.strategies,
            { 
              id: `strat_${Date.now()}_${Math.random()}`, 
              text: suggestion.text, 
              measure: suggestion.measure,
              contribution: '',
              tag: suggestion.tag,
              actions: actions 
            }
          ]
        };
      }
      return obj;
    });
    updateData({ objectives: newObjectives });
  };

  const removeStrategy = (objId: string, sId: string) => {
    const newObjectives = data.objectives.map(obj => {
      if (obj.id === objId) {
        return {
          ...obj,
          strategies: obj.strategies.filter(s => s.id !== sId)
        };
      }
      return obj;
    });
    updateData({ objectives: newObjectives });
  };

  const updateStrategyField = (objId: string, sId: string, field: 'text' | 'measure' | 'contribution', value: string) => {
    const newObjectives = data.objectives.map(obj => {
      if (obj.id === objId) {
        return {
          ...obj,
          strategies: obj.strategies.map(s => s.id === sId ? { ...s, [field]: value } : s)
        };
      }
      return obj;
    });
    updateData({ objectives: newObjectives });
    
    // 清除该字段的验证错误（仅处理 text 和 measure 字段）
    if (field === 'text' || field === 'measure') {
      if (validationErrors[objId]?.strategies?.[sId]?.[field]) {
        setValidationErrors(prev => {
          const newObjErrors = { ...prev[objId] };
          if (newObjErrors.strategies) {
            const newSErrors = { ...newObjErrors.strategies };
            if (newSErrors[sId]) {
              const newSError = { ...newSErrors[sId] };
              delete newSError[field];
              if (Object.keys(newSError).length === 0) {
                delete newSErrors[sId];
              } else {
                newSErrors[sId] = newSError;
              }
            }
            if (Object.keys(newSErrors).length === 0) {
              delete newObjErrors.strategies;
            } else {
              newObjErrors.strategies = newSErrors;
            }
          }
          if (Object.keys(newObjErrors).length === 0) {
            const newErrors = { ...prev };
            delete newErrors[objId];
            return newErrors;
          }
          return { ...prev, [objId]: newObjErrors };
        });
      }
    }
  };

  const handleCustomInputChange = (objId: string, value: string) => {
    setCustomInputs(prev => ({ ...prev, [objId]: value }));
  };

  const addCustomStrategy = (objId: string) => {
    const text = customInputs[objId]?.trim();
    if (!text) return;

    const newObjectives = data.objectives.map(obj => {
      if (obj.id === objId) {
        return {
          ...obj,
          strategies: [
            ...obj.strategies,
            { 
              id: `strat_custom_${Date.now()}_${Math.random()}`, 
              text: text, 
              measure: '', 
              contribution: '',
              actions: [] 
            }
          ]
        };
      }
      return obj;
    });
    updateData({ objectives: newObjectives });
    setCustomInputs(prev => ({ ...prev, [objId]: '' }));
  };

  const addKeyResult = (objId: string) => {
    const newObjectives = data.objectives.map(obj => {
      if (obj.id === objId) {
        return {
          ...obj,
          keyResults: [
            ...(obj.keyResults || []),
            { 
              id: `kr_${Date.now()}_${Math.random()}`, 
              text: '', 
              target: '' 
            }
          ]
        };
      }
      return obj;
    });
    updateData({ objectives: newObjectives });
  };

  const updateKeyResult = (objId: string, krId: string, field: 'text' | 'target', value: string) => {
    const newObjectives = data.objectives.map(obj => {
      if (obj.id === objId) {
        return {
          ...obj,
          keyResults: (obj.keyResults || []).map(kr => kr.id === krId ? { ...kr, [field]: value } : kr)
        };
      }
      return obj;
    });
    updateData({ objectives: newObjectives });
    
    // 清除该字段的验证错误
    if (validationErrors[objId]?.keyResults?.[krId]?.[field]) {
      setValidationErrors(prev => {
        const newObjErrors = { ...prev[objId] };
        if (newObjErrors.keyResults) {
          const newKrErrors = { ...newObjErrors.keyResults };
          if (newKrErrors[krId]) {
            const newKrError = { ...newKrErrors[krId] };
            delete newKrError[field];
            if (Object.keys(newKrError).length === 0) {
              delete newKrErrors[krId];
            } else {
              newKrErrors[krId] = newKrError;
            }
          }
          if (Object.keys(newKrErrors).length === 0) {
            delete newObjErrors.keyResults;
          } else {
            newObjErrors.keyResults = newKrErrors;
          }
        }
        if (Object.keys(newObjErrors).length === 0) {
          const newErrors = { ...prev };
          delete newErrors[objId];
          return newErrors;
        }
        return { ...prev, [objId]: newObjErrors };
      });
    }
  };

  const removeKeyResult = (objId: string, krId: string) => {
    const newObjectives = data.objectives.map(obj => {
      if (obj.id === objId) {
        return {
          ...obj,
          keyResults: (obj.keyResults || []).filter(kr => kr.id !== krId)
        };
      }
      return obj;
    });
    updateData({ objectives: newObjectives });
  };

  // 获取目标当前需要优先处理的提示（按优先级）
  const getCurrentPrompt = (obj: any): { type: 'breakdown' | 'strategy' | null; message: string } => {
    const isSpecialObjective = ['达成进货承诺', '实现销售目标', '守住库存健康', '提升盈利能力'].includes(obj.title);

    // 特殊目标：检查 breakdown
    if (isSpecialObjective) {
      let hasBreakdown = false;
      if (obj.title === '达成进货承诺') {
        hasBreakdown = !!(obj.purchasePlan && Object.keys(obj.purchasePlan).length > 0);
      } else if (obj.title === '实现销售目标') {
        hasBreakdown = !!(obj.salesPlan && Object.keys(obj.salesPlan).length > 0);
      } else if (obj.title === '守住库存健康') {
        hasBreakdown = !!(obj.inventoryPlan && Object.keys(obj.inventoryPlan).length > 0);
      } else if (obj.title === '提升盈利能力') {
        hasBreakdown = !!(obj.profitPlan && Object.keys(obj.profitPlan).length > 0);
      }

      // 优先级1：目标拆解未完成
      if (!hasBreakdown) {
        return { type: 'breakdown', message: '请完成目标拆解' };
      }

      // 优先级2：策略未添加
      const strategies = obj.strategies || [];
      if (strategies.length === 0) {
        return { type: 'strategy', message: '请添加策略' };
      }

      // 优先级3：检查策略内容是否完整
      const hasIncompleteStrategy = strategies.some(s => !s.text?.trim());
      if (hasIncompleteStrategy) {
        return { type: 'strategy', message: '请完善策略内容' };
      }

      return { type: null, message: '' };
    }

    // 普通目标：检查 keyResults
    const keyResults = obj.keyResults || [];

    // 优先级1：目标拆解未添加
    if (keyResults.length === 0) {
      return { type: 'breakdown', message: '请添加目标拆解' };
    }

    // 优先级2：检查拆解内容是否完整
    const hasIncompleteKeyResult = keyResults.some(kr => !kr.text?.trim() || !kr.target?.trim());
    if (hasIncompleteKeyResult) {
      return { type: 'breakdown', message: '请完善目标拆解' };
    }

    // 优先级3：策略未添加
    const strategies = obj.strategies || [];
    if (strategies.length === 0) {
      return { type: 'strategy', message: '请添加策略' };
    }

    // 优先级4：检查策略内容是否完整
    const hasIncompleteStrategy = strategies.some(s => !s.text?.trim());
    if (hasIncompleteStrategy) {
      return { type: 'strategy', message: '请完善策略内容' };
    }

    return { type: null, message: '' };
  };

  // 验证目标拆解和已选策略是否填写完整，返回详细的验证信息
  const validateForm = (): { 
    valid: boolean; 
    firstInvalid?: { objId: string; objTitle: string; message: string };
    errors: {
      [objId: string]: {
        keyResults?: { [krId: string]: { text?: boolean; target?: boolean } };
        strategies?: { [sId: string]: { text?: boolean; measure?: boolean } };
        missingKeyResults?: boolean;
        missingStrategies?: boolean;
      };
    };
  } => {
    const errors: {
      [objId: string]: {
        keyResults?: { [krId: string]: { text?: boolean; target?: boolean } };
        strategies?: { [sId: string]: { text?: boolean; measure?: boolean } };
        missingKeyResults?: boolean;
        missingStrategies?: boolean;
      };
    } = {};
    let firstInvalid: { objId: string; objTitle: string; message: string } | undefined;
    
    for (const obj of data.objectives) {
      const objTitle = obj.title;
      const objErrors: {
        keyResults?: { [krId: string]: { text?: boolean; target?: boolean } };
        strategies?: { [sId: string]: { text?: boolean; measure?: boolean } };
        missingKeyResults?: boolean;
        missingStrategies?: boolean;
      } = {};
      
      // 检查目标拆解
      // 根据目标类型使用不同的验证规则
      const isSpecialObjective = ['达成进货承诺', '实现销售目标', '守住库存健康', '提升盈利能力'].includes(obj.title);
      
      if (isSpecialObjective) {
        // 特殊目标类型使用专门的 Plan 字段
        let hasValidBreakdown = false;
        
        if (obj.title === '达成进货承诺') {
          // 检查 purchasePlan
          const purchasePlan = obj.purchasePlan;
          hasValidBreakdown = !!(purchasePlan && 
            purchasePlan.categorySplit && purchasePlan.categorySplit.length > 0 &&
            purchasePlan.quarterSplit && purchasePlan.quarterSplit.length > 0);
        } else if (obj.title === '实现销售目标') {
          // 检查 salesPlan
          const salesPlan = obj.salesPlan;
          hasValidBreakdown = !!(salesPlan && 
            salesPlan.timeBreakdown && salesPlan.timeBreakdown.length > 0);
        } else if (obj.title === '守住库存健康') {
          // 检查 inventoryPlan
          const inventoryPlan = obj.inventoryPlan;
          hasValidBreakdown = !!(inventoryPlan && 
            inventoryPlan.categorySettings && inventoryPlan.categorySettings.length > 0);
        } else if (obj.title === '提升盈利能力') {
          // 检查 profitabilityPlan
          const profitabilityPlan = obj.profitabilityPlan;
          hasValidBreakdown = !!(profitabilityPlan && 
            (profitabilityPlan.salesRevenue > 0 || profitabilityPlan.targetProfitMargin > 0));
        }
        
        if (!hasValidBreakdown) {
          objErrors.missingKeyResults = true;
          if (!firstInvalid) {
            firstInvalid = {
              objId: obj.id,
              objTitle: obj.title,
              message: `"${objTitle}" 请完成目标拆解`
            };
          }
        }
      } else {
        // 普通目标使用 keyResults 字段
        const keyResults = obj.keyResults || [];
        if (keyResults.length === 0) {
          objErrors.missingKeyResults = true;
          if (!firstInvalid) {
            firstInvalid = {
              objId: obj.id,
              objTitle: obj.title,
              message: `"${objTitle}" 请添加目标拆解`
            };
          }
        } else {
          const krErrors: { [krId: string]: { text?: boolean; target?: boolean } } = {};
          // 检查每个目标拆解项
          for (let i = 0; i < keyResults.length; i++) {
            const kr = keyResults[i];
            const krError: { text?: boolean; target?: boolean } = {};
            if (!kr.text?.trim()) {
              krError.text = true;
              if (!firstInvalid) {
                firstInvalid = {
                  objId: obj.id,
                  objTitle: obj.title,
                  message: `"${objTitle}" 的目标拆解第${i + 1}项「拆解项」未填写`
                };
              }
            }
            if (!kr.target?.trim()) {
              krError.target = true;
              if (!firstInvalid) {
                firstInvalid = {
                  objId: obj.id,
                  objTitle: obj.title,
                  message: `"${objTitle}" 的目标拆解第${i + 1}项「目标值」未填写`
                };
              }
            }
            if (krError.text || krError.target) {
              krErrors[kr.id] = krError;
            }
          }
          if (Object.keys(krErrors).length > 0) {
            objErrors.keyResults = krErrors;
          }
        }
      }
      
      // 检查策略
      const strategies = obj.strategies || [];
      if (strategies.length === 0) {
        objErrors.missingStrategies = true;
        if (!firstInvalid) {
          firstInvalid = {
            objId: obj.id,
            objTitle: obj.title,
            message: `"${objTitle}" 请添加策略`
          };
        }
      } else {
        const sErrors: { [sId: string]: { text?: boolean; measure?: boolean } } = {};
        // 检查每个策略
        for (let i = 0; i < strategies.length; i++) {
          const s = strategies[i];
          const sError: { text?: boolean; measure?: boolean } = {};
          if (!s.text?.trim()) {
            sError.text = true;
            if (!firstInvalid) {
              firstInvalid = {
                objId: obj.id,
                objTitle: obj.title,
                message: `"${objTitle}" 的策略${i + 1}「策略内容」未填写`
              };
            }
          }
          if (sError.text) {
            sErrors[s.id] = sError;
          }
        }
        if (Object.keys(sErrors).length > 0) {
          objErrors.strategies = sErrors;
        }
      }
      
      if (objErrors.missingKeyResults || objErrors.missingStrategies || 
          objErrors.keyResults || objErrors.strategies) {
        errors[obj.id] = objErrors;
      }
    }
    
    return { 
      valid: Object.keys(errors).length === 0, 
      firstInvalid,
      errors 
    };
  };

  // 处理下一步点击 - 逐步引导式验证
  const handleNextClick = () => {
    // 直接找第一个未完成的部分
    const next = getNextIncompletePart();
    if (!next) {
      // 所有部分都完成，直接提交
      onNext();
      return;
    }
    
    // 设置聚焦并显示错误
    setCurrentFocus(next);
    showFocusError(next);
  };
  
  // 显示聚焦部分的错误
  const showFocusError = (focus: { objId: string; part: FocusPart }) => {
    const obj = data.objectives.find(o => o.id === focus.objId);
    if (!obj) return;
    
    setHasAttemptedSubmit(true);
    
    // 构建错误信息
    let message = '';
    if (focus.part === 'breakdown') {
      if (['达成进货承诺', '实现销售目标', '守住库存健康', '提升盈利能力'].includes(obj.title)) {
        message = `请先完成"${obj.title}"的目标拆解`;
      } else {
        message = `请先完成"${obj.title}"的目标拆解`;
      }
    } else {
      message = `请先为"${obj.title}"填写相应的达成策略`;

      // 设置策略验证错误，让 input 框高亮
      const strategies = obj.strategies || [];
      if (strategies.length > 0) {
        const sErrors: { [sId: string]: { text?: boolean } } = {};
        for (const s of strategies) {
          const sError: { text?: boolean } = {};
          if (!s.text?.trim()) sError.text = true;
          if (sError.text) {
            sErrors[s.id] = sError;
          }
        }
        setValidationErrors(prev => ({
          ...prev,
          [focus.objId]: {
            ...prev[focus.objId],
            strategies: sErrors
          }
        }));
      }
    }
    
    setToast({
      show: true,
      message: message,
      objId: focus.objId
    });
    
    // 8秒后自动关闭提示
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 8000);
    
    // 滚动到对应位置
    const element = document.getElementById(`objective-${focus.objId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2');
      }, 3000);
    }
  };

  const getPresets = (title: string) => {
     const t = OBJECTIVE_TEMPLATES.find(temp => temp.label === title);
     return t ? t.suggestedStrategies : [];
  };

  const getSimplifiedTarget = (title: string, fullText: string) => {
    if (!fullText) return "未设定目标值";
    
    // 1. 达成进货承诺
    if (title === '达成进货承诺') {
        const match = fullText.match(/(¥[\d,]+|[\d,]+元)/);
        if (match) return `完成 ${match[0]} 进货额`;
    }
    
    // 2. 实现销售目标
    if (title === '实现销售目标') {
        const match = fullText.match(/([\d,]+)\s*箱/);
        if (match) return `完成 ${match[1]}箱 销售量`;
    }

    // 3. 守住库存健康
    if (title === '守住库存健康') {
        const match = fullText.match(/([\d,]+)\s*天/);
        if (match) return `保持库存周转≤${match[1]}天`;
    }

    // 4. 提升盈利能力
    if (title === '提升盈利能力') {
        const match = fullText.match(/([\d,.]+%)/);
        if (match) return `提升至 ${match[1]} 的年度利润率`;
    }

    // Fallback: truncate if too long
    return fullText.length > 20 ? fullText.substring(0, 20) + '...' : fullText;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
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
      
      <div className="mb-6">
         <h2 className="text-2xl font-bold text-slate-800">{isSmall ? '拆解目标' : '拆解策略'}</h2>
         {!isSmall && <p className="text-slate-500">先拆解目标，再匹配相应的策略。</p>}
      </div>

      <div className="space-y-8">
        {data.objectives.map((obj, idx) => {

          
          return (
          <div key={obj.id} id={`objective-${obj.id}`} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
               <div className="flex items-center space-x-3">
                 <span className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">{idx + 1}</span>
                 <h3 className="text-lg font-bold text-slate-800">{obj.title}</h3>
               </div>
               
               <div className="flex-shrink-0">
                    <span className="text-base font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-md border border-brand-200 inline-block shadow-sm">
                        {getSimplifiedTarget(obj.title, obj.targetValue)}
                    </span>
               </div>
            </div>



            <div className="p-6 space-y-8">
              {/* Section 1: Objective Breakdown (Key Results) */}
              <div>
                {obj.title !== '达成进货承诺' && obj.title !== '实现销售目标' && obj.title !== '提升盈利能力' && obj.title !== '守住库存健康' && (
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center">
                    <PieChart size={16} className="mr-2 text-brand-500" /> 目标拆解
                  </h4>
                )}
                
                {obj.title === '达成进货承诺' ? (
                  <PurchaseBreakdown
                    objective={obj}
                    updateObjective={(updates) => {
                      const newObjectives = data.objectives.map(o => o.id === obj.id ? { ...o, ...updates } : o);
                      updateData({ objectives: newObjectives });
                    }}
                    months={months}
                    trends={data.trends}
                    productCategories={data.productCategories}
                    highlight={currentFocus?.objId === obj.id && currentFocus?.part === 'breakdown' && !isPartComplete(obj, 'breakdown')}
                  />
                ) : obj.title === '实现销售目标' ? (
                  <SalesBreakdown
                    objective={obj}
                    onUpdate={(updatedObj) => {
                      const newObjectives = data.objectives.map(o => o.id === obj.id ? updatedObj : o);
                      updateData({ objectives: newObjectives });
                    }}
                    highlight={currentFocus?.objId === obj.id && currentFocus?.part === 'breakdown' && !isPartComplete(obj, 'breakdown')}
                  />
                ) : obj.title === '守住库存健康' ? (
                  <InventoryBreakdown
                    objective={obj}
                    updateObjective={(updates) => {
                      const newObjectives = data.objectives.map(o => o.id === obj.id ? { ...o, ...updates } : o);
                      updateData({ objectives: newObjectives });
                    }}
                    productCategories={data.productCategories}
                    purchasePlan={data.objectives.find(o => o.title === '达成进货承诺')?.purchasePlan}
                    salesPlan={data.objectives.find(o => o.title === '实现销售目标')?.salesPlan}
                    salesTarget={data.objectives.find(o => o.title === '实现销售目标')?.targetValue}
                    months={months}
                    highlight={currentFocus?.objId === obj.id && currentFocus?.part === 'breakdown' && !isPartComplete(obj, 'breakdown')}
                  />
                ) : obj.title === '提升盈利能力' ? (
                  <ProfitabilityBreakdown
                    objective={obj}
                    updateObjective={(updates) => {
                      const newObjectives = data.objectives.map(o => o.id === obj.id ? { ...o, ...updates } : o);
                      updateData({ objectives: newObjectives });
                    }}
                    salesTarget={extractNumericValue(data.objectives.find(o => o.title === '实现销售目标')?.targetValue || '')}
                    purchaseTarget={extractNumericValue(data.objectives.find(o => o.title === '达成进货承诺')?.targetValue || '')}
                    highlight={currentFocus?.objId === obj.id && currentFocus?.part === 'breakdown' && !isPartComplete(obj, 'breakdown')}
                  />
                ) : (
                  <div className={`bg-slate-50 rounded-xl p-4 border space-y-3 ${currentFocus?.objId === obj.id && currentFocus?.part === 'breakdown' && !isPartComplete(obj, 'breakdown') ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}>
                    {currentFocus?.objId === obj.id && currentFocus?.part === 'breakdown' && !isPartComplete(obj, 'breakdown') && (
                      <div className="text-sm text-red-500 font-medium flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        请添加至少一个目标拆解项
                      </div>
                    )}
                    {(obj.keyResults || []).map((kr, kIdx) => {
                      const krError = validationErrors[obj.id]?.keyResults?.[kr.id];
                      return (
                      <div key={kr.id} className="flex items-center gap-3 animate-fade-in">
                        <span className="text-xs font-bold text-slate-400 w-6 text-center">{kIdx + 1}.</span>
                        <div className="flex-grow relative">
                          <input 
                            type="text"
                            className={`w-full bg-white border rounded px-3 py-2 text-sm focus:ring-1 outline-none transition-all placeholder-slate-400 ${krError?.text ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-200'}`}
                            placeholder="拆解项 (例如: 提升A渠道销量)"
                            value={kr.text}
                            onChange={(e) => updateKeyResult(obj.id, kr.id, 'text', e.target.value)}
                          />
                          {krError?.text && (
                            <span className="absolute -bottom-5 left-0 text-xs text-red-500">请填写拆解项</span>
                          )}
                        </div>
                        <div className="w-32 relative">
                          <input 
                            type="text"
                            className={`w-full bg-white border rounded px-3 py-2 text-sm focus:ring-1 outline-none transition-all placeholder-slate-400 ${krError?.target ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-200'}`}
                            placeholder="目标值"
                            value={kr.target}
                            onChange={(e) => updateKeyResult(obj.id, kr.id, 'target', e.target.value)}
                          />
                          {krError?.target && (
                            <span className="absolute -bottom-5 left-0 text-xs text-red-500 whitespace-nowrap">请填写目标值</span>
                          )}
                        </div>
                        <button 
                          onClick={() => removeKeyResult(obj.id, kr.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );})}
                    <button
                      onClick={() => addKeyResult(obj.id)}
                      className={`flex items-center text-xs font-medium px-2 py-1 rounded transition-colors mt-2 border-2 ${
                        currentFocus?.objId === obj.id && currentFocus?.part === 'breakdown' && !isPartComplete(obj, 'breakdown')
                          ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-400 bg-red-50/50 animate-pulse-border'
                          : 'text-brand-600 hover:text-brand-700 hover:bg-brand-50 border-brand-300'
                      }`}
                    >
                      <Plus size={14} className="mr-1" /> 添加拆解项
                    </button>
                  </div>
                )}
              </div>

              {/* Section 2: Strategies & Measures — only for large version */}
              {!isSmall && (
              <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center">
                  <Lightbulb size={16} className="mr-2 text-brand-500" /> 策略
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left: Suggestions Source - Reference Only */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      参考策略库
                    </h5>
                    <div className="space-y-2">
                      {getPresets(obj.title).map((suggestion, i) => (
                        <div
                          key={i}
                          className="w-full text-left p-3 rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-600 flex flex-col"
                        >
                          <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-start">
                              <span className="whitespace-pre-wrap">{suggestion.text}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {getPresets(obj.title).length === 0 && (
                        <div className="text-sm text-slate-400 italic p-2">暂无推荐策略</div>
                      )}
                    </div>
                  </div>

                  {/* Right: Selected Strategies */}
                  <div className={`bg-slate-50 rounded-xl p-4 border flex flex-col ${currentFocus?.objId === obj.id && currentFocus?.part === 'strategy' && !isPartComplete(obj, 'strategy') ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}>
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                       <span>{['达成进货承诺', '实现销售目标', '守住库存健康', '提升盈利能力'].includes(obj.title) ? '已选策略' : '已选策略与贡献'}</span>
                       {!['达成进货承诺', '实现销售目标', '守住库存健康', '提升盈利能力'].includes(obj.title) && (
                           <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-400">
                             请填写贡献值以匹配总目标
                           </span>
                       )}
                    </h5>

                    {currentFocus?.objId === obj.id && currentFocus?.part === 'strategy' && !isPartComplete(obj, 'strategy') && (
                      <div className="text-sm text-red-500 font-medium flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        请填写相应的达成策略
                      </div>
                    )}
                    
                    <div className="flex-grow space-y-3 mb-4">
                        {obj.strategies.map(strat => {
                          const stratError = validationErrors[obj.id]?.strategies?.[strat.id];
                          return (
                          <div key={strat.id} className={`bg-white p-3 rounded-lg border shadow-sm animate-slide-in-right group relative hover:border-brand-200 transition-colors ${stratError ? 'border-red-300' : 'border-slate-200'}`}>
                            <div className="grid gap-3 pr-6 grid-cols-1">
                               {/* Content */}
                               <div className="min-w-0">
                                    <div className="relative">
                                      <textarea
                                          rows={['达成进货承诺', '实现销售目标', '守住库存健康', '提升盈利能力'].includes(obj.title) ? 4 : 2}
                                          className={`w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none placeholder-slate-300 resize-none py-0.5 rounded transition-all border px-0 ${stratError?.text ? 'border-red-300 focus:border-red-400' : 'border-transparent focus:border-brand-200'}`}
                                          value={strat.text}
                                          onChange={(e) => updateStrategyField(obj.id, strat.id, 'text', e.target.value)}
                                          placeholder="策略内容..."
                                      />
                                      {stratError?.text && (
                                        <span className="text-xs text-red-500 absolute -bottom-4 left-0">请填写策略内容</span>
                                      )}
                                    </div>
                                    
                                    <div className="flex flex-col gap-2 mt-3">
                                        {/* Contribution Input */}
                                        {!['达成进货承诺', '实现销售目标', '守住库存健康', '提升盈利能力'].includes(obj.title) && (
                                            <div className="flex items-center bg-indigo-50/50 rounded px-2 py-1.5 border border-indigo-100 focus-within:border-indigo-300 transition-all max-w-sm">
                                                <PieChart size={12} className="text-indigo-400 mr-2 flex-shrink-0" />
                                                <span className="text-xs text-indigo-500 mr-1 font-bold whitespace-nowrap">预估贡献:</span>
                                                <input 
                                                    type="text"
                                                    className="w-full bg-transparent text-xs text-slate-700 focus:outline-none placeholder-indigo-300/70"
                                                    placeholder="例如: 500万"
                                                    value={strat.contribution || ''}
                                                    onChange={(e) => updateStrategyField(obj.id, strat.id, 'contribution', e.target.value)}
                                                />
                                            </div>
                                        )}

                                    </div>
                               </div>
                            </div>

                            <button onClick={() => removeStrategy(obj.id, strat.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500">
                                 <X size={14} />
                            </button>
                          </div>
                        );})}
                        {obj.strategies.length === 0 && (
                            <div className={`text-center py-6 text-slate-400 text-sm italic border-2 border-dashed rounded-lg ${validationErrors[obj.id]?.missingStrategies ? 'border-red-300 text-red-400' : 'border-slate-200'}`}>
                                请在下方输入框填写策略内容后添加
                            </div>
                        )}

                    {/* Custom Strategy Input */}
                    <div className="mt-auto pt-2 border-t border-slate-200/50">
                        <div className="relative">
                            <input
                                type="text"
                                value={customInputs[obj.id] || ''}
                                onChange={(e) => handleCustomInputChange(obj.id, e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addCustomStrategy(obj.id); }}
                                className="w-full pl-3 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all placeholder-slate-400"
                                placeholder="请输入策略内容，按回车添加..."
                            />
                            <button
                                onClick={() => addCustomStrategy(obj.id)}
                                disabled={!customInputs[obj.id]?.trim()}
                                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-slate-100 hover:bg-brand-50 text-slate-500 hover:text-brand-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                title="添加自定义策略"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                    </div>

                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
        )})}
      </div>

      <div className="flex justify-between pt-6 border-t border-slate-100">
        <button onClick={onBack} className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
          上一步
        </button>
        <button
          onClick={handleNextClick}
          className={`px-8 py-2.5 rounded-xl font-medium shadow-lg transition-colors ${
            getNextIncompletePart() 
              ? 'bg-slate-400 hover:bg-slate-500 text-white shadow-slate-200' 
              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-200'
          }`}
        >
          {isSmall ? '下一步：规划预算' : '下一步：行动战术'}
        </button>
      </div>
    </div>
  );
};

export default StrategyStep;