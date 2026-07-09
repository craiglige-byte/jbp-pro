# PRD-02：经营回顾

> JBP Pro — 联合生意规划助手 · 模块 2/7
>
> 对应组件：`components/BusinessReviewStep.tsx`
> 对应数据分区：`JBPData.operations`、`performance`、`trends`、`productCategories`、`customerAnalysis`、`channelAnalysis`、`teamAnalysis`、`issues`、`opportunities`、`marketStats`、`competitors`
> 对应 WizardStep：`'business_review'`

---

## 1. 模块概述

经营回顾模块是 JBP 规划的第二步，负责对经销商上一财年的整体经营状况进行全面复盘。模块包含 10 个子功能区域，覆盖运营资源、数据概览、趋势分析、品类分析、授权区域、客户分级、渠道表现、团队业绩、待解决问题和待挖掘机会。该模块为后续目标设定提供数据基础和业务洞察。

### 1.1 核心功能清单

| 序号 | 子模块 | 功能说明 |
|------|--------|---------|
| F01 | 运营资源投入 | 展示/编辑仓库面积、车辆配置、人员架构、资金准备 |
| F02 | 经营数据概览 | 10 项核心 KPI 卡片仪表盘（Sell-In/Sell-Out/Coverage/Distribution/Coolers/Efficiency/Profit/Margin/Investment/ROI） |
| F03 | 经营趋势分析 | 12 个月进销存趋势 ComposedChart 双轴图 |
| F04 | 经营品类分析 | 6 个品类 PieChart 饼图 + BarChart 对比 |
| F05 | 授权经营区域 | 高德地图授权多边形 + 市场统计 + 竞品分析表 |
| F06 | 客户分级分析 | S/A/B/C/其他/空 六级客户分层卡片（3列×2行）+ 客户明细（名称/销售额/利润，无增长率）+ 洞察标签 |
| F07 | 渠道表现分析 | 12 渠道对比表 + 贡献度饼图 |
| F08 | 团队业绩分析 | 6 人团队业绩表 + 在职/离职筛选 |
| F09 | 待解决问题 | 问题卡片列表（标题+描述），与待挖掘机会合并在同一卡片 |
| F10 | 待挖掘机会 | 机会卡片列表（标题+描述+标签分类），合并在待解决问题与机会卡片 |
| F11 | 授权地图范围确认 | 地图预览 + 确认按钮，位于待挖掘机会下方 |

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
- 左 Y 轴（柱状图）：Sell-In + Sell-Out 月销售额
- 右 Y 轴（折线图）：库存天数
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
- 右侧：BarChart 品类销售额对比柱状图（不展 示增长率维度）
- 下方：品类列表表格（名称 / 销售额 / 利润率），不展示增长率列

---

### 2.5 授权经营区域 (F05)

**数据分区**：`JBPData.authorizedRegions`、`authorizationPolygons`、`marketStats`、`competitors`

```typescript
interface MarketStats {
  population: string;            // 区域人口，如「245 万」
  gdp: string;                   // 区域 GDP，如「¥380.2 亿」
  perCapitaConsumption: string;  // 人均消费，如「42.5 升/年」
}

interface Competitor {
  id: string;
  name: string;        // 竞品名，如「农夫山泉」
  abbr: string;        // 缩写，如「NF」
  target: string;      // 年度目标，如「¥420万」
  achievement: number; // 达成率（%），默认 92
  outlets: number;     // 覆盖网点数，默认 1200
}
```

**UI 规格**：
- 高德地图多边形授权区域展示（复用 InfoStep 地图逻辑）
- 市场统计三指标卡片（人口/GDP/人均消费）
- 竞品分析对比表（名称/目标/达成率/网点数）
- 默认竞品：农夫山泉（达成率 92%）、怡宝（85%）、康师傅（78%）

---

### 2.6 客户分级分析 (F06)

**数据分区**：`JBPData.customerAnalysis`

```typescript
interface JBPCustomerAnalysis {
  segments: JBPCustomerSegment[];  // 6 个分级（S/A/B/C/其他/空）
  insights?: JBPCustomerInsight[]; // 洞察标签
}

interface JBPCustomerSegment {
  type: string;         // 'S' | 'A' | 'B' | 'C' | 'other' | 'empty'
  label: string;        // 如「战略客户 (Class S)」
  criteria: string;     // 分级标准，如「年销>30万 或 利润>5万」
  count: number;        // 客户数
  salesShare: number;   // 销售额占比（%）
  profitShare: number;  // 利润占比（%）
  customers?: JBPCustomer[];  // 代表性客户列表（名称/销售额/利润，无增长率）
}

interface JBPCustomerInsight {
  id: string;
  type: string;         // 'strength' | 'potential' | 'risk'
  label: string;        // 如「核心稳固」
  description: string;  // 洞察描述
  customerList?: string;// 相关客户名列表
}
```

**默认分级**（6 级，3 列卡片布局）：
| 等级 | 客户数 | 销售额占比 | 利润占比 | 代表性客户 |
|------|--------|-----------|----------|-----------|
| S 战略 | 8 | 28% | 35% | 好邻居连锁超市、大学城商圈 |
| A 核心 | 37 | 37% | 35% | 好邻居超市、旺旺批发部、阳光便利 |
| B 成长 | 120 | 25% | 20% | 老张便利店、小李杂货铺 |
| C 长尾 | 200 | 7% | 7% | 路边摊、报刊亭 |
| 其他 | 85 | 3% | 3% | 社区团购点 |
| 空 | 0 | 0% | 0% | 暂无客户 |

**卡片颜色**：S=rose, A=indigo, B=blue, C=slate, 其他=amber, 空=gray

**默认洞察**：
- 核心稳固 (strength)：A 类客户合作稳定
- 潜力挖掘 (potential)：B 类中 15 家具备升级 A 类潜力
- 服务缺失 (risk)：C 类客户拜访频率过低，竞品渗透严重

**UI 规格**：
- 双 Tab 切换：「今年地图范围」/「新地图范围」
- 六级客户分层卡片（数量/销售额占比/利润占比），3 列 × 2 行布局
- 卡片颜色按等级区分：S(rose)、A(indigo)、B(blue)、C(slate)、其他(amber)、空(gray)
- 「新地图范围」Tab：每张卡片的数量、销量贡献、利润贡献下方显示与今年数据的百分比对比（增长→红色，下降→绿色）
- 代表性客户明细表（名称/销售额/利润），**无增长率列**
- 「新地图范围」Tab：销售额、利润后方增加「对比」列，显示百分比差异（增长红/下降绿）
- 洞察标签列表（优势绿/潜力蓝/风险红）

---

### 2.7 渠道表现分析 (F07)

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
- 渠道对比表：名称/销售额/利润率/贡献度，无增长率列
- 「新地图范围」Tab：销售额、利润率、贡献度后方增加「对比」列，显示百分比差异（增长→红色，下降→绿色）
- 贡献度 PieChart（右侧）

---

### 2.8 团队业绩分析 (F08)

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
- 双 Tab 切换：「今年地图范围」/「新地图范围」
- 团队业绩表：姓名/状态（活跃绿/离职灰）/销售额/利润率/贡献度，无增长率列
- 「新地图范围」Tab：销售额、利润率、贡献度后方增加「对比」列，显示百分比差异（增长→红色，下降→绿色）

---

### 2.9 待解决问题 (F09)

**数据分区**：`JBPData.issues`

```typescript
interface JBPIssue {
  id: string;
  title: string;       // 问题标题
  description: string; // 问题描述
}
```

**UI 规格**：
- 问题卡片列表，每张卡片：标题（粗体）+ 描述 + 删除按钮
- 顶部「新增问题」按钮 → 弹出输入表单
- 空态：显示 placeholder 提示

---

### 2.10 待挖掘机会 (F10)

**数据分区**：`JBPData.opportunities`

```typescript
interface JBPOpportunity {
  id: string;
  title: string;       // 机会标题
  description: string; // 机会描述
  tag: string;         // 分类标签，如「渠道」「产品」「运营」
}
```

**UI 规格**：
- 机会卡片列表，每张卡片：标签（彩色 pill）+ 标题 + 描述 + 删除按钮
- 顶部「新增机会」按钮 → 弹出输入表单（含标签选择）
- 空态：显示 placeholder 提示

---

## 3. 容器布局

BusinessReviewStep 作为 10 个子模块的容器组件，使用以下布局策略：

```
┌─────────────────────────────────────────┐
│  经营回顾 标题                           │
│  [Tab: 运营资源] [Tab: 数据概览] [...]    │
├─────────────────────────────────────────┤
│                                         │
│  当前 Tab 的子模块内容                    │
│                                         │
├─────────────────────────────────────────┤
│  [导出 Excel]  [导入 Excel]              │
├─────────────────────────────────────────┤
│  [上一步]                  [下一步]       │
└─────────────────────────────────────────┘
```

---

## 4. Excel 导入导出 (F11)

### 4.1 导出规格

- 格式：`.xlsx`
- 内容：performance + operations + trends + productCategories + channelAnalysis + teamAnalysis
- 多个 Sheet 分别导出不同数据分区

### 4.2 导入规格

- 格式：`.xlsx` / `.csv`
- 支持部分字段导入（未导入字段保持现有值）
- 导入后提示成功/失败信息
- 数据校验：数值字段类型检查

---

## 5. 导航规则

- 进入条件：`data.distributorName !== '' && data.managerName !== ''`
- 离开条件（下一步校验，按优先级）：
  1. **授权地图范围确认**：必须点击「确认范围」按钮（`authorizationConfirmed === true`），否则提示「请先确认授权地图范围」
  2. 待解决问题：至少添加 1 条
  3. 待挖掘机会：至少添加 1 条
- 上一步：`'info'`
- 下一步：`'objectives'`

---

## 6. 技术实现要点

### 6.1 图表组件选型

| 图表类型 | 使用的 Recharts 组件 |
|---------|---------------------|
| 趋势双轴图 | `ComposedChart` + `Bar` + `Line` |
| 品类饼图 | `PieChart` + `Pie` + `Cell` |
| 品类柱状图 | `BarChart` 或复用 `ComposedChart` |
| 渠道贡献饼图 | `PieChart` + `Pie` |

### 6.2 数据流

```
BusinessReviewStep
  ├─ data.operations     → 运营资源投入面板
  ├─ data.performance    → 经营数据概览面板
  ├─ data.trends         → 经营趋势分析面板
  ├─ data.productCategories → 经营品类分析面板
  ├─ data.authorizedRegions + marketStats + competitors → 授权区域面板
  ├─ data.customerAnalysis → 客户分级分析面板
  ├─ data.channelAnalysis  → 渠道表现分析面板
  ├─ data.teamAnalysis     → 团队业绩分析面板
  ├─ data.issues           → 待解决问题面板
  └─ data.opportunities    → 待挖掘机会面板
```

### 6.3 导入依赖

- `lucide-react`：MapIcon, TrendingUp, AlertCircle, ShoppingBag, ArrowUpRight, Loader2, RefreshCw, Lightbulb, Target, Edit2, Check, X, FileJson, Upload, FileSpreadsheet, CheckCircle2, Globe, BarChart3, Users, Zap, Plus, Trash2, Save, Wallet, CupSoda, 等
- `recharts`：ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart
- `xlsx`：Excel 导入导出

---

## 7. 边界与异常

| 场景 | 处理方式 |
|------|---------|
| trends 数组为空 | 图表区显示空态占位 |
| productCategories 为空 | 饼图和柱状图均显示空态 |
| customerAnalysis 为 undefined | 客户分级区显示「暂无数据」 |
| 渠道数据全为 0 | 表格显示 0，饼图显示灰色占位 |
| 团队人员全部 resign | 贡献度重新归一化 |
| Excel 导入格式不正确 | 弹窗提示错误信息，不覆盖现有数据 |
| Excel 导入部分字段缺失 | 仅更新存在的字段，其余保留 |

---

## 8. 修改日志

| 日期 | 变更内容 | 版本 |
|------|---------|------|
| 2026-06-26 | 客户分级从3级(A/B/C)升级为6级(S/A/B/C/其他/空)，3列×2行卡片布局 | v2 |
| 2026-06-26 | 客户明细表移除增长率列 | v2 |
| 2026-06-26 | 下一步校验新增授权地图范围确认检查 | v2 |
|------|---------|------|
| 2026-06-22 | 初始 PRD 文档创建，含 10 个子模块完整规格 | V1.0 |
| 2026-06-22 | F02 经营数据概览：移除除利润额外 7 张 KPI 卡片右上角的标签/百分比数字，保留利润额「详情」按钮交互 | V1.1 |
| 2026-06-30 | 经营数据概览添加利润额输入框 | V1.5 |
| 2026-06-30 | BugFix — 「新地图范围」tab 中 Math.random() 导致数据抖动，改为确定性计算 | V1.6 |
| 2026-07-06 | 利润详情弹窗：所有输入框改为字符串存储 + `filterDecimal`，支持非负两位小数、可输入 0 和小数点、拦截非数字符号 | V1.7 |
| 2026-07-08 | 新增「授权经营区域」模块（品类分析和客户分级之间）：地图+情报面板+刷新+调整授权区域+录入数据；市场指标单位外置、filterDecimal；竞品表增加品牌列/业绩万/网点家/达成率%；底部地图确认移至Step3 | V1.8 |
| 2026-06-22 | F04 经营品类分析：移除品类列表表格中的「增长率」列 | V1.2 |
| 2026-06-22 | F06/F07/F08：增加「今年地图范围」/「新地图范围」双 Tab；移除增长率列；新地图范围增加百分比差异标签；渠道和团队模块对比合并为行内标签 | V1.3 |
| 2026-06-22 | V1.5 授权地图范围确认移至经营回顾末尾 | ✅ 封版 |
| 2026-06-30 | BugFix: 「新地图范围」tab 中 Math.random() 导致点击卡片时数据变化，改为确定性公式（index * 系数），三处同修（客户分级/渠道分析/团队分析） | V1.6 |
