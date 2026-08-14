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
| F01 | 客户分级分析 | 双Tab（今年/新地图范围），6 级客户卡片（S/A/B/C/其他/空） + 客户明细 + 洞察标签，新地图范围带增长率标签 |
| F02 | 渠道表现分析 | 双Tab（今年/新地图范围），12 渠道对比表 + 贡献度饼图，新地图范围带增长率标签 |
| F03 | 团队业绩分析 | 双Tab（今年/新地图范围），团队业绩表（含岗位列），新地图范围带增长率标签 |

---

## 2. 子模块详细规格

### 2.1 客户分级分析 (F01)

**数据分区**：`JBPData.customerAnalysis`

```typescript
interface JBPCustomerAnalysis {
  segments: JBPCustomerSegment[];  // 6 个分级（S/A/B/C/other/empty）
  insights?: JBPCustomerInsight[]; // 洞察标签
}

interface JBPCustomerSegment {
  type: string;         // 'S' | 'A' | 'B' | 'C' | 'other' | 'empty'
  label: string;        // 已弃用显示，仅保留 Class S/A/B/C 标徽
  criteria: string;     // 已弃用显示
  count: number;        // 客户数
  salesShare: number;   // 销量贡献/销售额占比（%）
  profitShare: number;  // 利润占比（%）— 已弃用显示
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

**默认分级**（6 级，3 列×2 行卡片布局）：

| 等级 | 客户数 | 销量贡献 | 代表性客户 |
|------|--------|---------|-----------|
| S | 8 | 28% | 好邻居连锁超市、大学城商圈 |
| A | 37 | 37% | 好邻居超市、旺旺批发部、阳光便利 |
| B | 120 | 25% | 老张便利店、小李杂货铺 |
| C | 200 | 7% | 路边摊、报刊亭 |
| 其他 | 85 | 3% | 社区团购点 |
| 空 | 0 | 0% | 暂无客户 |

**卡片颜色**：S=rose, A=indigo, B=blue, C=slate, 其他=amber, 空=gray

**默认洞察**（3 条，无编辑按钮）：
- 核心稳固 (strength)：A 类客户合作稳定
- 潜力挖掘 (potential)：B 类中 15 家具备升级 A 类潜力
- 服务缺失 (risk)：C 类客户拜访频率过低，竞品渗透严重

**UI 规格**：
- 双 Tab 切换：「今年地图范围」/「新地图范围」
- 六级客户分层卡片（数量/销量贡献），3 列 × 2 行布局
- **已移除**：中文标题（战略客户/核心客户…），只保留 Class S/A/B/C 标徽
- **已移除**：criteria 描述（年销>30万…）
- **已移除**：利润贡献，只保留销量贡献
- 「新地图范围」Tab：每张卡片数量、销量贡献下方显示与今年数据的百分比对比（增长→红色，下降→绿色）
- 代表性客户明细表（名称/销售额），**无利润列**；标题从「XX客户 - 客户明细」→「Class X - 客户明细」
- 「新地图范围」Tab：销售额后方增加「对比」列，显示百分比差异（增长红/下降绿）
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
  profitMargin: number;// 毛利率（%）— 已弃用显示
  contribution: number;// 贡献度（%）
}
```

**默认渠道**：自贩机（320万）、现代（450万）、传统（210万）、餐饮（120万）、大娱乐（50万）、学校（80万）、运动（60万）、景区（70万）、交通（90万）、办公场所（110万）、医院（40万）、线上（150万）

**UI 规格**：
- 双 Tab 切换：「今年地图范围」/「新地图范围」
- 渠道对比表：名称/销售额/贡献度（**无利润率列**）
- 「新地图范围」Tab：销售额/贡献度后方加增长率标签（增长→红色，下降→绿色）
- 贡献度 PieChart（右侧）
- **已移除**：利润率列（表格）+ 利润率折线（图表）

---

### 2.3 团队业绩分析 (F03)

**数据分区**：`JBPData.teamAnalysis`

```typescript
interface JBPTeamAnalysis {
  id: string;
  name: string;        // 姓名
  role: string;        // ★ 岗位（新增字段，默认值：销售经理/业务主管/业务员）
  status: 'active' | 'resigned'; // 状态
  sales: number;       // 销售额（万元）
  growth: number;      // 增长率（%）
  profitMargin: number;// 毛利率（%）— 已弃用显示
  contribution: number;// 贡献度（%）
}
```

**默认团队**：

| 姓名 | 岗位 | 状态 | 销售额 |
|------|------|------|--------|
| 张经理 | 销售经理 | active | 350万 |
| 李主管 | 业务主管 | active | 280万 |
| 王业代 | 业务员 | active | 210万 |
| 赵业代 | 业务员 | active | 180万 |
| 孙业代 | 业务员 | active | 130万 |
| 钱业代 | 业务员 | resigned | 0 |

**UI 规格**：
- 双 Tab 切换：「今年地图范围」/「新地图范围」
- 团队业绩表：姓名/状态（活跃绿/离职灰）/**岗位**/销售额/贡献度，**无利润率列**
- 「新地图范围」Tab：销售额/贡献度后方增加「对比」列，显示百分比差异（增长→红色，下降→绿色）
- 在职/离职筛选

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

## 4. 数据迁移

- `types.ts`: `JBPTeamAnalysis` 新增 `role: string` 字段
- `App.tsx`: localStorage 恢复时强制更新客户分级/渠道/团队默认结构
- demoData.ts / constants.ts: 同步更新默认数据

---

## 5. 修改日志

| 日期 | 变更内容 | 版本 |
|------|---------|------|
| 2026-06-23 | 审计归档：三模块均为双Tab（今年/新地图范围），无增长率列，新地图范围带增长率标签（增长红下降绿），无编辑按钮 | 🔒 封版 |
| 2026-06-26 | 客户分级从 3 级(A/B/C)升级为 6 级(S/A/B/C/其他/空)，3 列×2 行卡片布局 | V1.1 |
| 2026-06-26 | 客户明细表移除增长率列 | V1.1 |
| 2026-06-30 | BugFix：「新地图范围」tab 中 Math.random() 导致数据抖动，改为确定性计算 | V1.2 |
| 2026-07-24 | 客户分级大改：(1)去掉中文标题（战略客户/核心客户…），只保留 Class S/A/B/C 标徽；(2)去掉 criteria 描述（年销>30万…）；(3)去掉利润贡献，只保留销量贡献；(4)客户明细标题→Class X 格式、移除利润列 | V1.3 |
| 2026-07-24 | 渠道表现分析：移除利润率列（表格）+ 利润率折线（图表） | V1.4 |
| 2026-07-24 | 团队业绩分析：移除利润率列；新增「岗位」列；`JBPTeamAnalysis` 类型新增 `role: string` 字段 | V1.5 |
