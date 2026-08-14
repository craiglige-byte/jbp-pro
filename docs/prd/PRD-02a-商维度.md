# PRD-02a：商维度

> JBP Pro — 联合生意规划助手 · 经营回顾子模块 1/3
>
> 对应组件：`components/BusinessReviewStep.tsx`（商维度卡片）
> 对应数据分区：`JBPData.operations`、`performance`、`trends`、`productCategories`、`marketStats`、`competitors`
> 对应 WizardStep：`'business_review'`

---

## 1. 模块概述

商维度是经营回顾的第一个子模块，聚焦经销商整体运营与经营数据的概览分析。包含 5 个子功能区域：运营资源投入、经营数据概览、经营趋势分析、经营品类分析、授权经营区域（市场潜力+竞品分析）。在页面上呈现为一个白底卡片，自上而下纵向排列，子模块间用灰色分割线隔开。

### 1.1 核心功能清单

| 序号 | 子模块 | 功能说明 |
|------|--------|---------|
| F01 | 运营资源投入 | 展示仓库面积、车辆数量、人员架构、资金准备（含元气品牌分摊行） |
| F02 | 经营数据概览 | 10 项核心 KPI 卡片仪表盘（Sell-In/Sell-Out/Coverage/Distribution/Coolers/Efficiency(vpo)/Profit/Margin/Investment/ROI） |
| F03 | 经营趋势分析 | 12 个月进销存趋势 ComposedChart 双轴图 |
| F04 | 经营品类分析 | 6 个品类 PieChart 饼图 + 品类数据表格 |
| F05 | 授权经营区域 | 高德地图授权多边形 + 市场统计卡片 + 竞品分析表 |

---

## 2. 子模块详细规格

### 2.1 运营资源投入 (F01)

**数据分区**：`JBPData.operations`

```typescript
interface Operations {
  warehouse: number;          // 仓库面积（平方米）
  vehicles: {                 // 车辆配置列表
    id: string;
    name: string;             // 车辆项名称
    count: number;
  }[];
  personnel: {                // 人员架构列表
    id: string;
    name: string;             // 人员角色名称
    count: number;
  }[];
  capital: {                  // 资金准备列表
    id: string;
    name: string;             // 资金项目名称
    amount: number;           // 金额（万元）
  }[];
}
```

**默认数据**：
- 仓库：1200 ㎡
- 车辆：元气车辆数量 × 25
- 人员：客户团队人数 × 8、业务人员 × 15、管理人员 × 3、文职人员 × 2、后勤人员 × 5
- 资金：资金投入 270 万（只显示总额，不展示细分项）

**UI 规格**：
- 4 个卡片式网格布局（2×2）
- 仓库：数值输入框 + ㎡ 单位 + 下方元气品牌分摊行
- 车辆：单一项「元气车辆数量」+ 数量输入；卡片标题「车辆数量」
- 人员：5 项列表（客户团队人数/业务人员/管理人员/文职人员/后勤人员），每行显示名称 + 人数输入
- 资金：单一项「资金投入」，只显示总额不展示细分项（常态库存资金/市场垫资/信贷保证金）；下方元气品牌分摊行

---

### 2.2 经营数据概览 (F02)

**数据分区**：`JBPData.performance`

```typescript
interface Performance {
  sellIn: number;      // Sell-In 进货额（万元），默认 1200
  sellOut: number;     // Sell-Out 销售额（万元），默认 1150
  coverage: number;    // 覆盖网点数，默认 3500
  distribution: number;// 铺货率（%），默认 85
  coolers: number;     // 冰柜数量，默认 450
  efficiency: number;  // vpo（元/店），默认 120
  profit: number;      // 净利润（万元），默认 180
  profitMargin: number;// 利润率（%），默认 15
  investment: number;  // 市场投入（万元），默认 85
  roi: number;         // 投资回报率（%），默认 212
}
```

**UI 规格**：
- 2×5 网格 KPI 卡片布局（10 张卡片）
- 卡片显示：指标名称 + 数值 + 单位
- **利润额卡片**：额外保留「详情」按钮（`Eye` 图标），点击弹出利润详情弹窗
- **其余 9 张卡片**：右上角不展示任何百分比标签或数字标签
- 卡片色彩按指标类型区分：收入类（蓝）、利润类（绿）、效率类（紫）、覆盖类（橙）
- 最后一张卡片名称：「vpo」，单位「元/店」（原「人年均销售额 万/人/年」）

---

### 2.3 经营趋势分析 (F03)

**数据分区**：`JBPData.trends`

```typescript
interface JBPTrend {
  month: string;       // 月份标签，如「12月」「1月」
  inventory: number;   // 月末库存（箱）
  days: number;        // 库存天数
  sellIn: number;      // 当月 Sell-In（万元）
  sellOut: number;     // 当月 Sell-Out（万元）
}
```

**UI 规格**：
- ComposedChart（Recharts）双轴图
- 左 Y 轴（柱状图）：Sell-In + Sell-Out 月销售额
- 右 Y 轴（折线图）：库存天数
- X 轴：12 个月
- 图表高度：≥300px
- 支持数据表格编辑模式切换
- **已移除**：利润率列（表格）+ 利润率曲线（图表）

**默认数据**：12 个月完整趋势（12月→11月跨财年），库存范围 9000~18000 箱，天数 25~52 天

---

### 2.4 经营品类分析 (F04)

**数据分区**：`JBPData.productCategories`

```typescript
interface JBPProductCategory {
  id: string;
  name: string;        // 品类名，如「电解质水」「气泡水」「冰茶」
  color: string;       // 展示色（十六进制）
  sales: number;       // 销售额（万元）
  growth: number;      // 同比增长率（%）
  profitMargin: number;// 毛利率（%）
}
```

**默认品类**：电解质水（蓝#3b82f6, 450万, +18%）、气泡水（绿#10b981, 320万, +12%）、冰茶（橙#f59e0b, 280万, +8%）、维生素水（紫#8b5cf6, 180万, +25%）、好自在（粉#ec4899, 120万, +35%）、其他（灰#64748b, 50万, +5%）

**UI 规格**：
- 左侧：PieChart 销售额占比饼图
- 右侧：BarChart 品类销售额对比柱状图（不展示增长率维度）
- 下方：品类列表表格（名称 / 销售额），**不展示利润率列**

---

### 2.5 授权经营区域 (F05)

**数据分区**：`JBPData.marketStats`、`competitors`

```typescript
interface MarketStats {
  population: string;                  // 区域人口，如「150万」
  gdp: string;                         // 区域 GDP，如「850亿」
  perCapitaConsumption: string;        // 人均饮用量，如「58元」
  regionalDistributionAmount: string;  // ★ 区域今年分销额（万元），默认「1000」
  distributionAmount: string;          // 今年分销金额，如「3.8 千万」
}
```

**UI 规格**：
- 市场统计卡片（5 项）：人口 / GDP / 人均饮用量 / **区域今年分销额** / 今年分销金额
- 「区域今年分销额」卡片：cyan 配色 + TrendingUp 图标，纯展示不入录入弹窗
- 竞品分析对比表（名称/品牌/业绩(万)/网点数(家)/业绩达成率）

---

## 3. 页面布局

```
┌── 🏢 商维度 (bg-white rounded-2xl shadow-sm border) ──┐
│                                                         │
│  运营资源投入                                            │
│  ──────────── pt-6 border-t border-slate-100 ────────   │
│  经营数据概览  +  经营趋势分析                            │
│  ──────────── pt-6 border-t border-slate-100 ────────   │
│  经营品类分析                                            │
│  ──────────── pt-6 border-t border-slate-100 ────────   │
│  授权经营区域（市场潜力 + 竞品分析）                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 图表组件选型

| 图表类型 | 使用的 Recharts 组件 |
|---------|---------------------|
| 趋势双轴图 | `ComposedChart` + `Bar` + `Line` |
| 品类饼图 | `PieChart` + `Pie` + `Cell` |
| 品类柱状图 | `BarChart` 或复用 `ComposedChart` |

---

## 5. 数据迁移

localStorage 恢复时强制覆盖 vehicles/personnel/capital 为最新结构，防止旧缓存覆盖新默认值。marketStats 旧数据自动补齐 `regionalDistributionAmount` 字段。

---

## 6. 修改日志

| 日期 | 变更内容 | 版本 |
|------|---------|------|
| 2026-06-23 | 审计归档：F01 无编辑按钮，F02 利润额保留详情其余无标签，F03 只读无编辑，F04 无增长率列 | 🔒 封版 |
| 2026-07-06 | 利润详情弹窗：所有输入框改为字符串存储 + filterDecimal 校验 | V1.7 |
| 2026-07-08 | 新增「授权经营区域」模块（品类分析和客户分级之间）：地图+情报面板+刷新+录入数据；市场指标单位外置、filterDecimal；竞品表品牌/业绩万/网点家/达成率%；「达成率」→「业绩达成率」 | V1.8 |
| 2026-07-20 | FY2027 财年更新：默认 period FY2025→FY2027；授权地图「本财年」→「下一财年」 | V1.9 |
| 2026-07-24 | 运营资源投入大改：(1)车辆卡片标题「车辆配置」→「车辆数量」，细项从 3 车型→「元气车辆数量」单项；(2)人员从 4 项→5 项（客户团队人数/业务人员/管理人员/文职人员/后勤人员）；(3)资金只显示总额，移除细分项展示；(4) localStorage 迁移强制覆盖；(5)「人年均销售额」→「vpo」，单位「万/人/年」→「元/店」 | V1.10 |
| 2026-07-24 | 移除利润率：(1)经营趋势分析移除利润率表格列+图表曲线；(2)经营品类分析移除利润率表格列 | V1.10 |
| 2026-07-27 | 运营资源投入：仓库面积/资金投入下方新增元气品牌分摊行 | V1.11 |
| 2026-07-31 | 授权经营区域市场潜力卡片新增「区域今年分销额」（万元），默认1000，cyan配色+TrendingUp图标，纯展示不入弹窗；`marketStats`类型新增`regionalDistributionAmount`字段 | V1.12 |
