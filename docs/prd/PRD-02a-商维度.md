# PRD-02a：商维度

> JBP Pro — 联合生意规划助手 · 经营回顾子模块 1/3
>
> 对应组件：`components/BusinessReviewStep.tsx`（商维度卡片）
> 对应数据分区：`JBPData.operations`、`performance`、`trends`、`productCategories`
> 对应 WizardStep：`'business_review'`

---

## 1. 模块概述

商维度是经营回顾的第一个子模块，聚焦经销商整体运营与经营数据的概览分析。包含 4 个子功能区域：运营资源投入、经营数据概览、经营趋势分析、经营品类分析。在页面上呈现为一个白底卡片，自上而下纵向排列，子模块间用灰色分割线隔开。

### 1.1 核心功能清单

| 序号 | 子模块 | 功能说明 |
|------|--------|---------|
| F01 | 运营资源投入 | 展示仓库面积、车辆配置、人员架构、资金准备（只读，无编辑按钮） |
| F02 | 经营数据概览 | 8 项核心 KPI 卡片仪表盘（Sell-In/Sell-Out/Coverage/Distribution/Coolers/Efficiency/Profit/Margin/Investment/ROI） |
| F03 | 经营趋势分析 | 12 个月进销存趋势 ComposedChart 双轴图（只读，无编辑按钮） |
| F04 | 经营品类分析 | 6 个品类 PieChart 饼图 + 品类数据表格（无增长率列，无编辑按钮） |

---

## 2. 子模块详细规格

### 2.1 运营资源投入 (F01)

**数据分区**：`JBPData.operations`

```typescript
interface Operations {
  warehouse: number;          // 仓库面积（平方米）
  vehicles: {                 // 车辆配置列表
    id: string;
    name: string;             // 如「4.2米厢货」「金杯面包」「电动三轮」
    count: number;
  }[];
  personnel: {                // 人员架构列表
    id: string;
    name: string;             // 如「销售主管」「巡店业代」「配送司机」「财务/后勤」
    count: number;
  }[];
  capital: {                  // 资金准备列表
    id: string;
    name: string;             // 如「常态库存资金」「市场垫资」「信贷保证金」
    amount: number;           // 金额（万元）
  }[];
}
```

**默认数据示例**：
- 仓库：1200 ㎡
- 车辆：4.2米厢货×5、金杯面包×8、电动三轮×12
- 人员：销售主管×1、巡店业代×15、配送司机×8、财务/后勤×3
- 资金：常态库存资金 200 万、市场垫资 50 万、信贷保证金 20 万

**UI 规格**：
- 4 个卡片式网格布局（2×2）
- 仓库：数值输入框 + ㎡ 单位
- 车辆：列表，每行显示名称 + 数量输入
- 人员：列表，每行显示角色 + 人数输入
- 资金：列表，每行显示资金类型 + 金额输入（万元）

---

### 2.2 经营数据概览 (F02)

**数据分区**：`JBPData.performance`

```typescript
interface Performance {
  sellIn: number;      // Sell-In 进货额（万元），默认 1280
  sellOut: number;     // Sell-Out 销售额（万元），默认 1150
  coverage: number;    // 覆盖网点数，默认 892
  distribution: number;// 铺货率（%），默认 85
  coolers: number;     // 冰柜数量，默认 450
  efficiency: number;  // 人均产出（万元），默认 120
  profit: number;      // 净利润（万元），默认 180
  profitMargin: number;// 利润率（%），默认 14
  investment: number;  // 市场投入（万元），默认 85
  roi: number;         // 投资回报率（%），默认 212
}
```

**UI 规格**：
- 2×4 网格 KPI 卡片布局（8 张卡片）
- 卡片显示：指标名称 + 数值 + 单位
- **利润额卡片**：额外保留「详情」按钮（`Eye` 图标），点击弹出利润详情弹窗
- **其余 7 张卡片**（进货额/卖货额/运营总投入/网点覆盖数/铺市率/冰柜投放数/人年均销售额）：右上角不展示任何百分比标签或数字标签
- 卡片色彩按指标类型区分：收入类（蓝）、利润类（绿）、效率类（紫）、覆盖类（橙）

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
- 左 Y 轴（柱状图）：库存数量
- 右 Y 轴（折线图）：周转天数 + 进货达成率 + 卖货达成率 + 利润率
- X 轴：12 个月
- 图表高度：≥300px
- 支持数据表格编辑模式切换

**默认数据**：12 个月完整趋势（12月→11月跨财年），库存范围 9500~16500 箱，天数 22~48 天

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

**默认品类**：电解质水（蓝#3b82f6, 450万, +18%）、气泡水（绿#10b981, 320万, +12%）、冰茶（橙#f59e0b, 280万, +8%）、维生素水（紫#8b5cf6, 180万, +25%）、好自在水（灰#64748b, 120万, +35%）、其他（灰#9ca3af, 50万, +5%）

**UI 规格**：
- 左侧：PieChart 销售额占比饼图
- 右侧：BarChart 品类销售额对比柱状图（不展示增长率维度）
- 下方：品类列表表格（名称 / 销售额 / 利润率），不展示增长率列

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
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- 4 个子模块在一个白底卡片内纵向排列
- 子模块之间通过 `pt-6 border-t border-slate-100` 灰色分割线隔开
- 卡片使用 `space-y-8` 与其他模块卡片间隔

---

## 4. 图表组件选型

| 图表类型 | 使用的 Recharts 组件 |
|---------|---------------------|
| 趋势双轴图 | `ComposedChart` + `Bar` + `Line` |
| 品类饼图 | `PieChart` + `Pie` + `Cell` |
| 品类柱状图 | `BarChart` 或复用 `ComposedChart` |

---

## 5. 修改日志

| 日期 | 变更内容 | 版本 |
|------|---------|------|
| 2026-06-23 | 审计归档：F01 无编辑按钮，F02 利润额保留详情其余无标签，F03 只读无编辑，F04 无增长率列，灰线间距 32px/24px | 🔒 封版 |
