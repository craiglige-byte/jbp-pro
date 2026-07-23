// 参考案例数据 —— 小黄鸭商贸有限公司 2027 FY
// 数据来源：Coze JBP Plan HTML (小黄鸭商贸有限公司 2026 FY)
// 已映射至 JBPData 类型，保留匹配字段，忽略多余字段
// 最后更新: 2026-07-06

import { JBPData } from './types';

const DEMO_DATA: JBPData = {
  "distributorName": "[示例]小黄鸭商贸有限公司",
  "managerName": "胡凯",
  "period": "2027 FY",
  "contractType": "",
  "contractDetail": "",
  "selectedRelatedCustomers": [],
  "authorizedRegions": [],
  "authorizationConfirmed": true,
  "authorizationPolygons": [],
  "performance": {
    "sellIn": 1280,
    "sellOut": 1150,
    "coverage": 892,
    "distribution": 85,
    "coolers": 450,
    "efficiency": 120,
    "profit": 180,
    "profitMargin": 14,
    "investment": 85,
    "roi": 250
  },
  "operations": {
    "warehouse": 1300,
    "vehicles": [
      { "id": "v1", "name": "元气车辆数量", "count": 25 }
    ],
    "personnel": [
      { "id": "p1", "name": "客户团队人数", "count": 8 },
      { "id": "p2", "name": "业务人员", "count": 15 },
      { "id": "p3", "name": "管理人员", "count": 3 },
      { "id": "p4", "name": "文职人员", "count": 2 },
      { "id": "p5", "name": "后勤人员", "count": 5 }
    ],
    "capital": [
      { "id": "c1", "name": "资金投入", "amount": 270 }
    ]
  },
  "trends": [
    { "month": "12月", "inventory": 16000, "days": 46, "sellIn": 110, "sellOut": 100 },
    { "month": "1月", "inventory": 15000, "days": 45, "sellIn": 100, "sellOut": 95 },
    { "month": "2月", "inventory": 18000, "days": 52, "sellIn": 80, "sellOut": 70 },
    { "month": "3月", "inventory": 16000, "days": 48, "sellIn": 90, "sellOut": 92 },
    { "month": "4月", "inventory": 14000, "days": 42, "sellIn": 110, "sellOut": 105 },
    { "month": "5月", "inventory": 12000, "days": 35, "sellIn": 120, "sellOut": 125 },
    { "month": "6月", "inventory": 10000, "days": 28, "sellIn": 150, "sellOut": 160 },
    { "month": "7月", "inventory": 9000, "days": 25, "sellIn": 160, "sellOut": 170 },
    { "month": "8月", "inventory": 9500, "days": 26, "sellIn": 155, "sellOut": 150 },
    { "month": "9月", "inventory": 11000, "days": 32, "sellIn": 130, "sellOut": 120 },
    { "month": "10月", "inventory": 13000, "days": 38, "sellIn": 100, "sellOut": 90 },
    { "month": "11月", "inventory": 14500, "days": 43, "sellIn": 90, "sellOut": 85 }
  ],
  "productCategories": [
    { "id": "1", "name": "电解质水", "color": "#3b82f6", "sales": 500, "growth": 18, "profitMargin": 15 },
    { "id": "2", "name": "气泡水", "color": "#10b981", "sales": 320, "growth": 12, "profitMargin": 12 },
    { "id": "3", "name": "冰茶", "color": "#f59e0b", "sales": 280, "growth": 8, "profitMargin": 10 },
    { "id": "4", "name": "维生素水", "color": "#8b5cf6", "sales": 180, "growth": 25, "profitMargin": 18 },
    { "id": "5", "name": "好自在", "color": "#ec4899", "sales": 120, "growth": 35, "profitMargin": 20 },
    { "id": "6", "name": "其他", "color": "#64748b", "sales": 50, "growth": 5, "profitMargin": 8 }
  ],
  "channelAnalysis": [
    { "id": "1", "name": "大卖场", "sales": 320, "growth": 15, "profitMargin": 12, "contribution": 28 },
    { "id": "2", "name": "连锁便利", "sales": 450, "growth": 25, "profitMargin": 18, "contribution": 39 },
    { "id": "3", "name": "食杂店", "sales": 210, "growth": -5, "profitMargin": 10, "contribution": 18 },
    { "id": "4", "name": "餐饮渠道", "sales": 120, "growth": 8, "profitMargin": 15, "contribution": 10 },
    { "id": "5", "name": "特通/线上", "sales": 50, "growth": 35, "profitMargin": 20, "contribution": 5 }
  ],
  "teamAnalysis": [
    { "id": "1", "name": "张经理", "status": "active", "sales": 350, "growth": 20, "profitMargin": 15, "contribution": 30 },
    { "id": "2", "name": "李主管", "status": "active", "sales": 280, "growth": 15, "profitMargin": 13, "contribution": 24 },
    { "id": "3", "name": "王业代", "status": "active", "sales": 210, "growth": 10, "profitMargin": 12, "contribution": 18 },
    { "id": "4", "name": "赵业代", "status": "active", "sales": 180, "growth": 5, "profitMargin": 11, "contribution": 15 },
    { "id": "5", "name": "孙业代", "status": "active", "sales": 130, "growth": 2, "profitMargin": 10, "contribution": 11 },
    { "id": "6", "name": "钱业代 (离职)", "status": "resigned", "sales": 0, "growth": 0, "profitMargin": 0, "contribution": 2 }
  ],
  "customerAnalysis": {
    "segments": [
      {
        "type": "A", "label": "核心客户 (年销>10万)", "criteria": "年销>10万或利润>2万", "count": 45, "salesShare": 65, "profitShare": 70,
        "customers": [
          { "id": "a1", "name": "好邻居连锁超市", "sales": 320000, "profit": 58000, "growth": 15 },
          { "id": "a2", "name": "大学城商圈", "sales": 280000, "profit": 52000, "growth": 22 }
        ]
      },
      {
        "type": "B", "label": "成长客户 (年销3-10万)", "criteria": "年销3-10万", "count": 120, "salesShare": 25, "profitShare": 20,
        "customers": [
          { "id": "b1", "name": "老张便利店", "sales": 80000, "profit": 15000, "growth": 5 }
        ]
      },
      {
        "type": "C", "label": "长尾客户 (年销<3万)", "criteria": "年销<3万", "count": 350, "salesShare": 10, "profitShare": 10,
        "customers": []
      }
    ],
    "insights": []
  },
  "marketStats": { "population": "245", "gdp": "380.2", "perCapitaConsumption": "42.5" },
  "competitors": [
    { "id": "c1", "name": "农夫山泉", "abbr": "NF", "target": "420", "achievement": 92, "outlets": 1200 },
    { "id": "c2", "name": "怡宝", "abbr": "MD", "target": "180", "achievement": 85, "outlets": 850 },
    { "id": "c3", "name": "康师傅", "abbr": "KS", "target": "250", "achievement": 78, "outlets": 920 }
  ],
  "issues": [
    { "id": "iss_1", "title": "餐饮渠道渗透率低", "description": "当前渗透率仅为30%，远低于竞品的65%，缺乏针对餐饮渠道的专职业务团队及相应的高利润产品组合" },
    { "id": "iss_2", "title": "费用核销效率低", "description": "Q3促销费用核销周期平均为45天，导致经销商资金周转压力大，需优化核销材料提交流程" }
  ],
  "opportunities": [
    { "id": "opp_1", "title": "大学城特通开发", "description": "辖区内两所大学目前仅覆盖校内超市，可尝试开发校内食堂及社团活动赞助", "tag": "新渠道" },
    { "id": "opp_2", "title": "无糖茶系列铺市", "description": "无糖茶品类在CVS渠道增长迅速，建议Q4重点引入，抢占货架份额", "tag": "新产品" },
    { "id": "opp_3", "title": "数字化访销系统升级", "description": "利用新的SFA系统功能，优化业务员巡店路线，提升人均日访店数", "tag": "效率优化" }
  ],
  "objectives": [
    {
      "id": "obj_1", "title": "达成进货承诺",
      "targetValue": "为保障市场供应并深化战略协作，我司承诺在元气森林2027财年（2026年12月1日至2027年11月30日）内，根据双方共同确认的滚动预测，完成总计人民币陆佰伍拾万元整（¥650万）的Sell-in进货。",
      "strategies": [
        {
          "id": "s1_1", "text": "资金前置储备：提前测算旺季资金缺口，落实银行授信或自有资金增资，确保打款无忧。", "measure": "旺季前资金到位率100%", "tag": "资金", "contribution": "", "actions": [
            { "id": "a1_1_1", "title": "资金需求测算与来源确认", "text": "测算30%储备金额，并明确资金来源（自有资金、银行贷款或股东增资），形成书面方案。", "owners": ["经销商老板"], "deadline": "Q1", "status": "pending" },
            { "id": "a1_1_2", "title": "资金存入专用账户", "text": "由经销商老板在12月31日前，将资金存入指定的专用账户，确保账户资金仅用于支付厂家货款。", "owners": ["经销商老板"], "deadline": "2026年12月", "status": "pending" }
          ]
        },
        {
          "id": "s1_2", "text": "年度规划与动态复盘双循环：制定年度进货规划，并建立月度预实分析、季度策略调整机制，确保目标不偏航。", "measure": "季度进货目标达成率≥95%", "tag": "管理", "contribution": "", "actions": [
            { "id": "a1_2_1", "title": "年度进货规划制定", "text": "由经销商老板与品牌方城市经理在11月-12月期间共同制定年度进货规划，明确各季度品类进货目标与节奏，形成书面文件作为全年执行依据。", "owners": ["经销商老板", "城市经理"], "deadline": "2026年11月", "status": "pending" },
            { "id": "a1_2_2", "title": "月度预实分析", "text": "由经销商老板组织销售主管每月对实际进货与月度计划进行对比分析，计算偏差率并分析原因，形成月度预实分析报表。", "owners": ["经销商老板"], "deadline": "每月5日", "status": "pending" }
          ]
        }
      ],
      "purchasePlan": {
        "categorySplit": [
          { "id": "cat1", "name": "电解质水", "ratio": 38, "amount": 247 },
          { "id": "cat2", "name": "气泡水", "ratio": 23, "amount": 149.5 },
          { "id": "cat3", "name": "冰茶", "ratio": 16, "amount": 104 },
          { "id": "cat4", "name": "维生素水", "ratio": 10, "amount": 65 },
          { "id": "cat5", "name": "好自在", "ratio": 10, "amount": 65 },
          { "id": "cat6", "name": "其他", "ratio": 3, "amount": 19.5 }
        ],
        "quarterSplit": [
          { "id": "Q1", "name": "Q1季度 (12-2月)", "amount": 152.6, "ratio": 23.5 },
          { "id": "Q2", "name": "Q2季度 (3-5月)", "amount": 211.3, "ratio": 32.6 },
          { "id": "Q3", "name": "Q3季度 (6-8月)", "amount": 188.6, "ratio": 29 },
          { "id": "Q4", "name": "Q4季度 (9-11月)", "amount": 97.5, "ratio": 14.9 }
        ],
        "monthlyData": {
          "2026-12": { "scenario": "元旦备货", "logic": "", "ratio": 7.0, "total": 45.8, "categoryValues": { "cat1": 18.5, "cat2": 8.1, "cat3": 5.9, "cat4": 4.9, "cat5": 4.9, "cat6": 3.5 } },
          "2027-01": { "scenario": "春节高峰", "logic": "", "ratio": 10.6, "total": 68.7, "categoryValues": { "cat1": 27.8, "cat2": 12.1, "cat3": 8.9, "cat4": 7.3, "cat5": 7.3, "cat6": 5.3 } },
          "2027-02": { "scenario": "节后淡季", "logic": "", "ratio": 5.9, "total": 38.2, "categoryValues": { "cat1": 15.4, "cat2": 6.7, "cat3": 4.9, "cat4": 4.1, "cat5": 4.1, "cat6": 2.9 } },
          "2027-03": { "scenario": "压水头启动", "logic": "", "ratio": 9.8, "total": 63.4, "categoryValues": { "cat1": 22.2, "cat2": 16.6, "cat3": 10.9, "cat4": 5.9, "cat5": 5.5, "cat6": 2.3 } },
          "2027-04": { "scenario": "压水头高峰", "logic": "", "ratio": 13.0, "total": 84.5, "categoryValues": { "cat1": 29.6, "cat2": 22.1, "cat3": 14.6, "cat4": 7.8, "cat5": 7.3, "cat6": 3.1 } },
          "2027-05": { "scenario": "五一升温", "logic": "", "ratio": 9.8, "total": 63.4, "categoryValues": { "cat1": 22.2, "cat2": 16.6, "cat3": 10.9, "cat4": 5.9, "cat5": 5.5, "cat6": 2.3 } },
          "2027-06": { "scenario": "高温旺季", "logic": "", "ratio": 9.3, "total": 60.3, "categoryValues": { "cat1": 22.1, "cat2": 16.7, "cat3": 10.7, "cat4": 5.6, "cat5": 5.2, "cat6": 0 } },
          "2027-07": { "scenario": "最热旺季", "logic": "", "ratio": 10.4, "total": 67.9, "categoryValues": { "cat1": 24.9, "cat2": 18.8, "cat3": 12.0, "cat4": 6.3, "cat5": 5.9, "cat6": 0 } },
          "2027-08": { "scenario": "高温延续", "logic": "", "ratio": 9.3, "total": 60.3, "categoryValues": { "cat1": 22.1, "cat2": 16.7, "cat3": 10.7, "cat4": 5.6, "cat5": 5.2, "cat6": 0 } },
          "2027-09": { "scenario": "开学军训", "logic": "", "ratio": 5.2, "total": 34.1, "categoryValues": { "cat1": 14.7, "cat2": 5.2, "cat3": 5.1, "cat4": 4.1, "cat5": 5.0, "cat6": 0 } },
          "2027-10": { "scenario": "国庆降温", "logic": "", "ratio": 5.2, "total": 34.1, "categoryValues": { "cat1": 14.7, "cat2": 5.2, "cat3": 5.1, "cat4": 4.1, "cat5": 5.0, "cat6": 0 } },
          "2027-11": { "scenario": "财年末冲刺", "logic": "", "ratio": 4.5, "total": 29.3, "categoryValues": { "cat1": 12.6, "cat2": 4.5, "cat3": 4.4, "cat4": 3.5, "cat5": 4.3, "cat6": 0 } }
        }
      }
    },
    {
      "id": "obj_2", "title": "实现销售目标",
      "targetValue": "为共同扩大市场份额，我司承诺在元气森林2027财年（2026年12月1日至2027年11月30日）内，通过全渠道精细化运营，达成终端市场Sell-out销售目标145,000箱。",
      "strategies": [
        {
          "id": "s2_1", "text": "人效提升与激励绑定：优化人员片区匹配，设计高激励提成方案，将个人收入与销售目标强挂钩。", "measure": "人均销售额提升15%", "tag": "团队", "contribution": "", "actions": [
            { "id": "a2_1_1", "title": "人与片区匹配优化", "text": "盘点现有业务员负责的片区，分析各片区终端数量、潜力、现有业绩，重新分配片区（如有必要），确保人区匹配。", "owners": ["销售主管"], "deadline": "2027年1月", "status": "pending" },
            { "id": "a2_1_2", "title": "绩效奖金方案设计", "text": "制定详细的月度绩效奖金方案：完成80%以下无提成；80%-100%按比例线性发放；超过100%部分给予坎级超额提成。", "owners": ["经销商老板"], "deadline": "2026年12月", "status": "pending" }
          ]
        },
        {
          "id": "s2_2", "text": "终端分级与单店产出提升：实施终端分级管理（A/B/C类），对高产出A类店进行资源倾斜与精细化服务。", "measure": "A类店单店产出提升10%", "tag": "渠道", "contribution": "", "actions": [
            { "id": "a2_2_1", "title": "终端分级标准制定", "text": "根据门店销量、位置、合作意愿、潜力等维度，制定A/B/C类终端分级标准，完成所有终端门店的分类建档。", "owners": ["销售主管"], "deadline": "2026年12月", "status": "pending" },
            { "id": "a2_2_2", "title": "分级服务政策与资源配置", "text": "针对A/B/C类门店制定差异化服务政策：A类店高频拜访、陈列奖励、冰柜投放、优先促销。", "owners": ["销售主管"], "deadline": "2027年1月", "status": "pending" }
          ]
        }
      ],
      "salesPlan": {
        "timeBreakdown": [
          { "id": "12", "label": "12月", "type": "month", "lastYearActuals": 8500, "lastYearRatio": 5.9, "scenario": "元旦备货启动", "thisYearRatio": 7.5, "thisYearTarget": 10876 },
          { "id": "01", "label": "1月", "type": "month", "lastYearActuals": 15000, "lastYearRatio": 10.3, "scenario": "春节前销售高峰", "thisYearRatio": 10.5, "thisYearTarget": 15226 },
          { "id": "02", "label": "2月", "type": "month", "lastYearActuals": 7000, "lastYearRatio": 4.8, "scenario": "春节及节后淡季", "thisYearRatio": 7.5, "thisYearTarget": 10876 },
          { "id": "Q1", "label": "Q1", "type": "quarter", "lastYearActuals": 30500, "lastYearRatio": 21.0, "scenario": "", "thisYearRatio": 25.5, "thisYearTarget": 36978 },
          { "id": "03", "label": "3月", "type": "month", "lastYearActuals": 7200, "lastYearRatio": 5.0, "scenario": "节后调整期", "thisYearRatio": 6.0, "thisYearTarget": 8700 },
          { "id": "04", "label": "4月", "type": "month", "lastYearActuals": 9500, "lastYearRatio": 6.6, "scenario": "气温回暖+五一备货", "thisYearRatio": 8.0, "thisYearTarget": 11600 },
          { "id": "05", "label": "5月", "type": "month", "lastYearActuals": 7600, "lastYearRatio": 5.2, "scenario": "五一假期拉动", "thisYearRatio": 6.0, "thisYearTarget": 8700 },
          { "id": "Q2", "label": "Q2", "type": "quarter", "lastYearActuals": 24300, "lastYearRatio": 16.8, "scenario": "", "thisYearRatio": 20.0, "thisYearTarget": 29000 },
          { "id": "06", "label": "6月", "type": "month", "lastYearActuals": 14000, "lastYearRatio": 9.7, "scenario": "高温旺季开始", "thisYearRatio": 11.5, "thisYearTarget": 16676 },
          { "id": "07", "label": "7月", "type": "month", "lastYearActuals": 16500, "lastYearRatio": 11.4, "scenario": "最热月份顶峰", "thisYearRatio": 12.5, "thisYearTarget": 18126 },
          { "id": "08", "label": "8月", "type": "month", "lastYearActuals": 15000, "lastYearRatio": 10.3, "scenario": "高温延续+下旬回落", "thisYearRatio": 11.0, "thisYearTarget": 15951 },
          { "id": "Q3", "label": "Q3", "type": "quarter", "lastYearActuals": 45500, "lastYearRatio": 31.4, "scenario": "", "thisYearRatio": 35.0, "thisYearTarget": 50753 },
          { "id": "09", "label": "9月", "type": "month", "lastYearActuals": 9000, "lastYearRatio": 6.2, "scenario": "开学季+军训", "thisYearRatio": 7.0, "thisYearTarget": 10151 },
          { "id": "10", "label": "10月", "type": "month", "lastYearActuals": 9000, "lastYearRatio": 6.2, "scenario": "国庆长假+降温", "thisYearRatio": 7.0, "thisYearTarget": 10151 },
          { "id": "11", "label": "11月", "type": "month", "lastYearActuals": 6800, "lastYearRatio": 4.7, "scenario": "传统淡季+财年末", "thisYearRatio": 5.5, "thisYearTarget": 7976 },
          { "id": "Q4", "label": "Q4", "type": "quarter", "lastYearActuals": 24800, "lastYearRatio": 17.1, "scenario": "", "thisYearRatio": 19.5, "thisYearTarget": 28278 }
        ],
        "personnelBreakdown": [
          { "id": "east", "area": "东区", "lastYearManager": "张三", "lastYearActuals": 52000, "lastYearRatio": 35.6, "scenario": "城区核心市场，便利店和超市覆盖率高，夏季饮料销量突出", "thisYearRatio": 35, "thisYearTarget": 50751, "thisYearManager": "张三" },
          { "id": "west", "area": "西区", "lastYearManager": "李四", "lastYearActuals": 43500, "lastYearRatio": 29.8, "scenario": "城乡结合部，传统食杂店为主，春节和国庆销量集中", "thisYearRatio": 30, "thisYearTarget": 43503, "thisYearManager": "李四" },
          { "id": "south", "area": "南区", "lastYearManager": "王五", "lastYearActuals": 36200, "lastYearRatio": 24.8, "scenario": "新兴开发区，工厂和学校较多，团购潜力大", "thisYearRatio": 25, "thisYearTarget": 36252, "thisYearManager": "王五" },
          { "id": "self", "area": "经销商自营", "lastYearManager": "老板/专员", "lastYearActuals": 14200, "lastYearRatio": 9.8, "scenario": "企事业单位团购、大客户直营，节日福利订单为主", "thisYearRatio": 10, "thisYearTarget": 14503, "thisYearManager": "老板/专员" }
        ],
        "monthlyAreaTargets": {
          "12": { "east": 3806, "west": 3263, "south": 2719, "self": 1088 },
          "01": { "east": 5329, "west": 4568, "south": 3806, "self": 1523 },
          "02": { "east": 3806, "west": 3263, "south": 2719, "self": 1088 },
          "03": { "east": 3045, "west": 2610, "south": 2175, "self": 870 },
          "04": { "east": 4060, "west": 3480, "south": 2900, "self": 1160 },
          "05": { "east": 3045, "west": 2610, "south": 2175, "self": 870 },
          "06": { "east": 5836, "west": 5003, "south": 4169, "self": 1668 },
          "07": { "east": 6344, "west": 5438, "south": 4531, "self": 1813 },
          "08": { "east": 5583, "west": 4785, "south": 3988, "self": 1595 },
          "09": { "east": 3553, "west": 3045, "south": 2538, "self": 1015 },
          "10": { "east": 3553, "west": 3045, "south": 2538, "self": 1015 },
          "11": { "east": 2791, "west": 2393, "south": 1994, "self": 798 }
        }
      }
    },
    {
      "id": "obj_3", "title": "守住库存健康",
      "targetValue": "为提升资金使用效率、保障产品新鲜度并实现可持续增长，我司承诺在元气森林2027财年内，将所经销元气森林产品的平均库存周转天数优化至≤35天。",
      "strategies": [
        {
          "id": "s3_1", "text": "动态安全库存与补货预警：建立各品类安全库存模型，设置系统预警线，低于安全线及时补货，高于警戒线暂停进货。", "measure": "断货率<2%，滞销占比<5%", "tag": "供应链", "contribution": "", "actions": [
            { "id": "a3_1_1", "title": "安全库存模型建立", "text": "收集各品类过去12个月的销售数据、采购周期，计算各品类月度平均销量、标准差，设定安全库存系数（如1.5倍），制定安全库存计算公式。", "owners": ["数据分析"], "deadline": "2026年12月", "status": "pending" },
            { "id": "a3_1_2", "title": "安全库存参数设置", "text": "根据模型，为每个品类设置安全库存天数（如A类高周转品7天，B类15天，C类30天），并在进销存系统中设置预警线。", "owners": ["采购"], "deadline": "2027年1月", "status": "pending" }
          ]
        }
      ],
      "inventoryPlan": {
        "categorySettings": [
          { "categoryId": "cat1", "categoryName": "电解质水", "turnoverDays": 25, "ratio": 38, "reason": "核心大单品，高周转保鲜度" },
          { "categoryId": "cat2", "categoryName": "气泡水", "turnoverDays": 31, "ratio": 23, "reason": "多口味备货，维持安全水位" },
          { "categoryId": "cat3", "categoryName": "冰茶", "turnoverDays": 30, "ratio": 16, "reason": "季节性波动，均衡备货" },
          { "categoryId": "cat4", "categoryName": "维生素水", "turnoverDays": 30, "ratio": 10, "reason": "稳定动销，常规周转" },
          { "categoryId": "cat5", "categoryName": "好自在", "turnoverDays": 30, "ratio": 10, "reason": "新品培育期，保障陈列" },
          { "categoryId": "cat6", "categoryName": "其他", "turnoverDays": 45, "ratio": 3, "reason": "长尾产品，低频补货" }
        ],
        "monthlyPlan": [
          { "monthId": "2026-12", "scenario": "为1月春节备货，月末库存高位", "salesRatio": 10.5, "nextMonthSalesTarget": 15226, "categoryValues": {}, "total": 0 },
          { "monthId": "2027-01", "scenario": "春节销售高峰后，月末库存快速下降", "salesRatio": 7.5, "nextMonthSalesTarget": 10876, "categoryValues": {}, "total": 0 },
          { "monthId": "2027-02", "scenario": "节后淡季，月末库存维持低位", "salesRatio": 6.0, "nextMonthSalesTarget": 8700, "categoryValues": {}, "total": 0 },
          { "monthId": "2027-03", "scenario": "气温回暖，为4月销售备货，月末库存回升", "salesRatio": 8.0, "nextMonthSalesTarget": 11600, "categoryValues": {}, "total": 0 },
          { "monthId": "2027-04", "scenario": "五一销售前，但5月销售占比低，月末库存再次下降", "salesRatio": 6.0, "nextMonthSalesTarget": 8700, "categoryValues": {}, "total": 0 },
          { "monthId": "2027-05", "scenario": "为夏季旺季蓄力，月末库存大幅上升", "salesRatio": 11.5, "nextMonthSalesTarget": 16676, "categoryValues": {}, "total": 0 },
          { "monthId": "2027-06", "scenario": "夏季旺季启动，月末库存达到全年最高", "salesRatio": 12.5, "nextMonthSalesTarget": 18126, "categoryValues": {}, "total": 0 },
          { "monthId": "2027-07", "scenario": "最热旺季，月末库存仍高但略降", "salesRatio": 11.0, "nextMonthSalesTarget": 15951, "categoryValues": {}, "total": 0 },
          { "monthId": "2027-08", "scenario": "高温延续，下旬开始控库，月末库存明显下降", "salesRatio": 7.0, "nextMonthSalesTarget": 10151, "categoryValues": {}, "total": 0 },
          { "monthId": "2027-09", "scenario": "开学季，月末库存平稳", "salesRatio": 7.0, "nextMonthSalesTarget": 10151, "categoryValues": {}, "total": 0 },
          { "monthId": "2027-10", "scenario": "国庆小高峰后，月末库存下降", "salesRatio": 5.5, "nextMonthSalesTarget": 7976, "categoryValues": {}, "total": 0 },
          { "monthId": "2027-11", "scenario": "为12月及春节备货启动，月末库存略有回升", "salesRatio": 7.5, "nextMonthSalesTarget": 10876, "categoryValues": {}, "total": 0 }
        ]
      }
    },
    {
      "id": "obj_4", "title": "提升盈利能力",
      "targetValue": "为确保生意长期健康发展，品牌方与我司协力，在元气森林2027财年内，通过共推高毛利产品、共投精准营销与共管运营效率，将联合生意的年度经营利润率提升至7%。",
      "strategies": [
        {
          "id": "s4_1", "text": "产品结构优化与毛利提升：分析各SKU毛利贡献，主推高毛利产品，淘汰负毛利或低效产品。", "measure": "高毛利产品占比提升5%", "tag": "产品", "contribution": "", "actions": [
            { "id": "a4_1_1", "title": "完成产品毛利-返利四象限分析", "text": "财务与销售部门拉通数据，计算每个SKU的毛利率+返利收益，划分为明星、金牛、问题和瘦狗产品，明确主攻与淘汰对象。", "owners": ["财务"], "deadline": "2027年1月", "status": "pending" },
            { "id": "a4_1_2", "title": "制定并发布高收益产品主推手册", "text": "基于分析结果，确定年度主推产品清单，配套专用话术、陈列标准及销售激励方案，组织全员培训。", "owners": ["销售主管"], "deadline": "2027年2月", "status": "pending" }
          ]
        },
        {
          "id": "s4_2", "text": "厂家返利政策研究与最大化获取：吃透厂家返利政策，通过精准达成各项指标，拿满厂家返利。", "measure": "厂家返利获取率100%", "tag": "财务", "contribution": "", "actions": [
            { "id": "a4_2_1", "title": "解码返利政策并制定获取路线图", "text": "与厂家经理确认所有返利条款，将销量、品类、季度等返利目标分解到月，形成可视化追踪表。", "owners": ["财务"], "deadline": "2026年12月", "status": "pending" },
            { "id": "a4_2_2", "title": "建立返利达成月度预警机制", "text": "每月财务对照路线图核对进度，对可能无法达成的项目，提前一个月向销售与采购部门发出红色预警。", "owners": ["财务"], "deadline": "每月5日", "status": "pending" }
          ]
        }
      ],
      "profitabilityPlan": {
        "salesRevenue": 805.6,
        "rebateRevenue": 24.2,
        "cogs": 650,
        "targetProfitMargin": 7,
        "targetNetProfit": 58,
        "maxOperatingExpenses": 121.8,
        "expenses": [
          {
            "id": "personnel", "name": "人员费用",
            "items": [
              { "id": "sales_comm", "name": "销售提成", "lastYearRatio": 3.3, "lastYearActual": 25, "thisYearTarget": 21.5, "thisYearRatio": 2.6, "strategy": "与销量挂钩，多劳多得" },
              { "id": "mgmt_salary", "name": "管理人员工资", "lastYearRatio": 2.6, "lastYearActual": 20, "thisYearTarget": 17.2, "thisYearRatio": 2.1, "strategy": "按需投入，保障运营" },
              { "id": "driver_salary", "name": "司机/仓管/文员工资", "lastYearRatio": 2.0, "lastYearActual": 15, "thisYearTarget": 12.9, "thisYearRatio": 1.6, "strategy": "按需投入，保障运营" }
            ]
          },
          {
            "id": "warehouse", "name": "仓储车辆",
            "items": [
              { "id": "rent", "name": "仓库租金", "lastYearRatio": 1.6, "lastYearActual": 12, "thisYearTarget": 10.3, "thisYearRatio": 1.2, "strategy": "降本增效，严格控制预算" },
              { "id": "loading", "name": "装卸费", "lastYearRatio": 1.0, "lastYearActual": 8, "thisYearTarget": 6.9, "thisYearRatio": 0.8, "strategy": "降本增效，严格控制预算" },
              { "id": "fuel", "name": "油费/维修/保险/违章", "lastYearRatio": 1.3, "lastYearActual": 10, "thisYearTarget": 8.6, "thisYearRatio": 1.0, "strategy": "降本增效，严格控制预算" },
              { "id": "wh_ops", "name": "仓库运维保险/设备", "lastYearRatio": 0.5, "lastYearActual": 4, "thisYearTarget": 3.4, "thisYearRatio": 0.4, "strategy": "降本增效，严格控制预算" }
            ]
          },
          {
            "id": "marketing", "name": "营销费用",
            "items": [
              { "id": "display", "name": "陈列费", "lastYearRatio": 1.0, "lastYearActual": 8, "thisYearTarget": 6.9, "thisYearRatio": 0.8, "strategy": "聚焦核心网点，提升费效比" },
              { "id": "channel_promo", "name": "渠道促销费", "lastYearRatio": 1.6, "lastYearActual": 12, "thisYearTarget": 10.3, "thisYearRatio": 1.2, "strategy": "聚焦核心网点，提升费效比" },
              { "id": "terminal_promo", "name": "终端促销费", "lastYearRatio": 0.8, "lastYearActual": 6, "thisYearTarget": 5.2, "thisYearRatio": 0.6, "strategy": "精准投入，拉动终端动销" },
              { "id": "consumer_promo", "name": "消费者促销费", "lastYearRatio": 0.7, "lastYearActual": 5, "thisYearTarget": 4.3, "thisYearRatio": 0.5, "strategy": "精准投入，拉动终端动销" },
              { "id": "marketing_other", "name": "其他", "lastYearRatio": 0.2, "lastYearActual": 1.5, "thisYearTarget": 1.3, "thisYearRatio": 0.2, "strategy": "降本增效，严格控制预算" }
            ]
          },
          {
            "id": "admin", "name": "行政办公",
            "items": [
              { "id": "office_rent", "name": "办公室租金/水电", "lastYearRatio": 0.8, "lastYearActual": 6, "thisYearTarget": 5.2, "thisYearRatio": 0.6, "strategy": "降本增效，严格控制预算" },
              { "id": "supplies", "name": "办公耗材/通讯", "lastYearRatio": 0.5, "lastYearActual": 4, "thisYearTarget": 3.4, "thisYearRatio": 0.4, "strategy": "降本增效，严格控制预算" }
            ]
          },
          {
            "id": "finance", "name": "财务及其他",
            "items": [
              { "id": "interest", "name": "贷款利息", "lastYearRatio": 0.4, "lastYearActual": 3, "thisYearTarget": 2.6, "thisYearRatio": 0.3, "strategy": "降本增效，严格控制预算" },
              { "id": "tax", "name": "税金", "lastYearRatio": 0.2, "lastYearActual": 1.5, "thisYearTarget": 1.3, "thisYearRatio": 0.2, "strategy": "降本增效，严格控制预算" },
              { "id": "fine_only", "name": "罚款", "lastYearRatio": 0.05, "lastYearActual": 0.3, "thisYearTarget": 0.3, "thisYearRatio": 0, "strategy": "降本增效，严格控制预算" },
              { "id": "finance_other", "name": "其他", "lastYearRatio": 0.05, "lastYearActual": 0.2, "thisYearTarget": 0.2, "thisYearRatio": 0, "strategy": "降本增效，严格控制预算" }
            ]
          }
        ],
        "totalOperatingExpenses": 121.8
      }
    }
  ],
  "detailedBudgetPlan": {
    "warehouse": [
      { "id": "1", "type": "长租", "area": 1300, "brandRatio": 100, "brandArea": 1380, "monthlyRent": 20700, "yearlyRent": 248400, "brandYearlyRent": 248400, "remark": "100%用于元气品牌" }
    ],
    "vehicles": [
      { "id": "1", "model": "4.2米左右厢货车", "type": "自有", "count": 1, "dailyCapacity": 700, "yearlyCost": 64200, "brandRatio": 100, "brandYearlyCost": 64200, "remark": "固定配置" },
      { "id": "2", "model": "4.2米左右厢货车", "type": "租赁", "count": 1, "dailyCapacity": 700, "yearlyCost": 18000, "brandRatio": 100, "brandYearlyCost": 18000, "remark": "6-8月旺季租用60天" }
    ],
    "personnel": [
      { "id": "1", "role": "经销商自有 - 老板&职业经理", "count": 1, "monthlyBaseSalary": 8000, "yearlyBaseSalary": 9.6, "yearlySocialSecurity": 2.9, "yearlyFixedCost": 12.5, "yearlyBonus": 5.4, "yearlyTotalCost": 17.9, "brandRatio": 100, "brandYearlyCost": 17.9, "remark": "团队管理" },
      { "id": "2", "role": "经销商自有 - 专职业代", "count": 5, "monthlyBaseSalary": 5000, "yearlyBaseSalary": 30, "yearlySocialSecurity": 9, "yearlyFixedCost": 39, "yearlyBonus": 21.8, "yearlyTotalCost": 60.8, "brandRatio": 100, "brandYearlyCost": 60.8, "remark": "终端维护" },
      { "id": "3", "role": "经销商自有 - 司机", "count": 1, "monthlyBaseSalary": 5000, "yearlyBaseSalary": 6, "yearlySocialSecurity": 1.8, "yearlyFixedCost": 7.8, "yearlyBonus": 0, "yearlyTotalCost": 7.8, "brandRatio": 100, "brandYearlyCost": 7.8, "remark": "货物配送" },
      { "id": "4", "role": "经销商自有 - 库管", "count": 1, "monthlyBaseSalary": 4500, "yearlyBaseSalary": 5.4, "yearlySocialSecurity": 1.6, "yearlyFixedCost": 7, "yearlyBonus": 0, "yearlyTotalCost": 7, "brandRatio": 100, "brandYearlyCost": 7, "remark": "仓库管理" },
      { "id": "5", "role": "品牌方人员 - 厂家业代", "count": 2, "monthlyBaseSalary": 0, "yearlyBaseSalary": 0, "yearlySocialSecurity": 0, "yearlyFixedCost": 0, "yearlyBonus": 5.4, "yearlyTotalCost": 5.4, "brandRatio": 100, "brandYearlyCost": 5.4, "remark": "按片区销售额1%计提" }
    ],
    "marketing": [
      { "id": "1", "item": "陈列费", "distributorAmount": 6.9, "ratio": 24.6, "manufacturerRatio": 40, "manufacturerAmount": 4.6, "totalAmount": 11.5, "remark": "全年持续" },
      { "id": "2", "item": "渠道促销费", "distributorAmount": 10.3, "ratio": 36.8, "manufacturerRatio": 30, "manufacturerAmount": 4.4, "totalAmount": 14.7, "remark": "3-4月压水头,6-8月旺季" },
      { "id": "3", "item": "终端促销费", "distributorAmount": 5.2, "ratio": 18.6, "manufacturerRatio": 30, "manufacturerAmount": 2.2, "totalAmount": 7.4, "remark": "结合陈列活动及新品上市" },
      { "id": "4", "item": "消费者促销费", "distributorAmount": 4.3, "ratio": 15.4, "manufacturerRatio": 50, "manufacturerAmount": 4.3, "totalAmount": 8.6, "remark": "1月春节,6月旺季" },
      { "id": "5", "item": "其他", "distributorAmount": 1.3, "ratio": 4.6, "manufacturerRatio": 4.6, "manufacturerAmount": 0.1, "totalAmount": 1.3, "remark": "灵活安排" }
    ],
    "capital": [
      { "id": "1", "item": "厂家预付款", "amount": 1625000, "brandRatio": 100, "brandAmount": 1625000, "remark": "全年进货总额25%" },
      { "id": "2", "item": "仓库押金", "amount": 60000, "brandRatio": 100, "brandAmount": 60000, "remark": "押一付三" },
      { "id": "3", "item": "办公场所押金", "amount": 15000, "brandRatio": 100, "brandAmount": 15000, "remark": "押一付三" },
      { "id": "4", "item": "首月工资", "amount": 60000, "brandRatio": 100, "brandAmount": 60000, "remark": "含业务员、司机、仓管" },
      { "id": "5", "item": "首期车辆费用", "amount": 30000, "brandRatio": 100, "brandAmount": 30000, "remark": "租车押金或购车首付" },
      { "id": "6", "item": "冰柜采购成本", "amount": 63000, "brandRatio": 100, "brandAmount": 63000, "remark": "50台冰柜" },
      { "id": "7", "item": "办公设备", "amount": 20000, "brandRatio": 100, "brandAmount": 20000, "remark": "电脑、打印机等" },
      { "id": "8", "item": "备用金", "amount": 50000, "brandRatio": 100, "brandAmount": 50000, "remark": "应急资金" },
      { "id": "9", "item": "其他费用", "amount": 10000, "brandRatio": 100, "brandAmount": 10000, "remark": "办证、装修等杂费" }
    ]
  }
};

export default DEMO_DATA;
