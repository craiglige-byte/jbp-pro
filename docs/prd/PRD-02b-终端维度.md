# PRD-02b：终端维度

> JBP Pro — 联合生意规划助手 · 经营回顾子模块 2/3
>
> 对应组件：`components/BusinessReviewStep.tsx`（终端维度卡片）
> 对应数据分区：`JBPData.customerAnalysis`、`channelAnalysis`、`teamAnalysis`
> 对应 WizardStep：`'business_review'`

---

## 1. 模块概述

终端维度是经营回顾的第二个子模块，聚焦终端客户、渠道与团队维度的经营分析。包含 3 个子功能区域：客户分级分析、渠道表现分析、团队业绩分析。在页面上呈现为一个白底卡片，自上而下纵向排列，子模块间用灰色分割线隔开。

### 1.1 核心功能清单

| 序号 | 子模块 | 功能说明 |
|------|--------|---------|
| F01 | 客户分级分析 | 双Tab（今年/新地图范围），A/B/C 三级客户卡片 + 客户明细 + 洞察标签，新地图范围家数后带增长率标签 |
| F02 | 渠道表现分析 | 双Tab（今年/新地图范围），12 渠道对比表（无增长率列）+ 贡献度饼图，新地图范围销售额/利润率/贡献度后带增长率标签 |
| F03 | 团队业绩分析 | 双Tab（今年/新地图范围），6 人团队业绩表（无增长率列），新地图范围销售额/利润率/贡献度后带增长率标签 |

---

## 2. 子模块详细规格

### 2.1 客户分级分析 (F01)

**数据分区**：`JBPData.customerAnalysis`

```typescript
interface JBPCustomerAnalysis {
  segments: JBPCustomerSegment[];  // 3 个分级（A/B/C）
  insights?: JBPCustomerInsight[]; // 洞察标签
}

interface JBPCustomerSegment {
  type: string;         // 'A' | 'B' | 'C'
  label: string;        // 如「核心客户 (Class A)」
  criteria: string;     // 分级标准，如「年销>10万 或 利润>2万」
  count: number;        // 客户数
  salesShare: number;   // 销售额占比（%）
  profitShare: number;  // 利润占比（%）
  customers?: JBPCustomer[];  // 代表性客户列表
}

interface JBPCustomerInsight {
  id: string;
  type: string;         // 'strength' | 'potential' | 'risk'
  label: string;        // 如「核心稳固」
  description: string;  // 洞察描述
  customerList?: string;// 相关客户名列表
}
```

**默认分级**：

| 等级 | 客户数 | 销售额占比 | 利润占比 | 代表性客户 |
|------|--------|-----------|----------|-----------|
| A 核心 | 45 | 65% | 70% | 好邻居超市、旺旺批发部、阳光便利 |
| B 成长 | 120 | 25% | 20% | 老张便利店、小李杂货铺 |
| C 长尾 | 350 | 10% | 10% | 路边摊、报刊亭 |

**默认洞察**：
- 核心稳固 (strength)：A 类客户合作稳定
- 潜力挖掘 (potential)：B 类中 15 家具备升级 A 类潜力
- 服务缺失 (risk)：C 类客户拜访频率过低，竞品渗透严重

**UI 规格**：
- 双 Tab 切换：「今年地图范围」/「新地图范围」
- 三级客户分层卡片（数量/销售额占比/利润占比）
- 「新地图范围」Tab：每张卡片的家数下方展示与今年数据的增长率标签（增长→红色，下降→绿色）
- 点击卡片展开代表性客户明细表（名称/销售额/利润）
- 洞察标签列表（优势绿/潜力蓝/风险红）

---

### 2.2 渠道表现分析 (F02)

**数据分区**：`JBPData.channelAnalysis`

```typescript
interface JBPChannelAnalysis {
  id: string;
  name: string;        // 渠道名，如「自贩机」「现代」「传统」「餐饮」
  sales: number;       // 销售额（万元）
  growth: number;      // 同比增长率（%）
  profitMargin: number;// 毛利率（%）
  contribution: number;// 贡献度（%）
}
```

**默认渠道**：自贩机（320万, +15%, 贡献28%）、现代（450万, +25%, 贡献39%）、传统（210万, -5%, 贡献18%）、餐饮（120万, +8%）、大娱乐（50万, +35%）、学校（80万, +20%）、运动（60万, +18%）、景区（70万, +22%）、交通（90万, +12%）、办公场所（110万, +10%）、医院（40万, +15%）、线上（150万, +30%）

**UI 规格**：
- 双 Tab 切换：「今年地图范围」/「新地图范围」
- ComposedChart 对比图（Bar=销售额, Line=利润率）
- 渠道对比表：名称/销售额/利润率/贡献度（无增长率列）
- 「新地图范围」Tab：销售额/利润率/贡献度后方加增长率标签（增长→红色，下降→绿色）

---

### 2.3 团队业绩分析 (F03)

**数据分区**：`JBPData.teamAnalysis`

```typescript
interface JBPTeamAnalysis {
  id: string;
  name: string;        // 姓名
  status: 'active' | 'resigned'; // 状态
  sales: number;       // 销售额（万元）
  growth: number;      // 增长率（%）
  profitMargin: number;// 毛利率（%）
  contribution: number;// 贡献度（%）
}
```

**默认团队**：张经理（active, 350万, +20%）、李主管（active, 280万, +15%）、王业代（active, 210万, +10%）、赵业代（active, 180万, +5%）、孙业代（active, 130万, +2%）、钱业代（resigned, 0, 贡献2%）

**UI 规格**：
- 水平 BarChart（按销售额排序，活跃/离职颜色区分）
- 团队业绩表：姓名/状态（活跃绿/离职灰）/销售额/增长率/利润率/贡献度

---

## 3. 页面布局

```
┌── 🏪 终端维度 (bg-white rounded-2xl shadow-sm border) ──┐
│                                                           │
│  客户分级分析                                              │
│  ──────────── pt-6 border-t border-slate-100 ──────────   │
│  渠道表现分析                                              │
│  ──────────── pt-6 border-t border-slate-100 ──────────   │
│  团队业绩分析                                              │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 4. 修改日志

| 日期 | 变更内容 | 版本 |
|------|---------|------|
| 2026-06-23 | 审计归档：三模块均为双Tab（今年/新地图范围），无增长率列，新地图范围带增长率标签（增长红下降绿），无编辑按钮 | 🔒 封版 |
