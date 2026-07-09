# PRD-06：规划预算

> JBP Pro — 联合生意规划助手 · 模块 6/7
>
> 对应组件：`components/BudgetStep.tsx`
> 对应数据分区：`JBPData.detailedBudgetPlan`
> 对应 WizardStep：`'budget'`

---

## 1. 模块概述

规划预算（Budget）是 JBP 规划的第六步，将行动计划转化为具体的资源配置方案。模块包含 5 个子功能区域：仓库租赁、车辆配置、人员架构、费用规划和资金准备。如果盈利拆解中已填写费用规划数据，预算模块将自动同步并校验一致性。

### 1.1 核心功能清单

| 序号 | 子模块 | 说明 |
|------|--------|------|
| F01 | 仓库租赁 | 仓库类型/面积/月租金/品牌占比/年租金管理 |
| F02 | 车辆配置 | 车辆型号/数量/年费用/品牌占比管理 |
| F03 | 人员架构 | 岗位/人数/薪酬(月薪+社保+奖金)/品牌占比管理 |
| F04 | 费用规划 | 市场费用项目/经销商金额/厂家金额/占比管理 |
| F05 | 资金准备 | 资金项目/金额/品牌占比管理 |

---

## 2. 数据模型

### 2.1 详细预算计划

```typescript
interface JBPDetailedBudgetPlan {
  warehouse: JBPWarehouseBudget[];   // 仓库租赁列表
  vehicles: JBPVehicleBudget[];      // 车辆配置列表
  personnel: JBPPersonnelBudget[];   // 人员架构列表
  marketing: JBPMarketingBudget[];   // 费用规划列表
  capital: JBPCapitalBudget[];       // 资金准备列表
}
```

### 2.2 各子模块数据结构

```typescript
// 仓库租赁
interface JBPWarehouseBudget {
  id: string;
  type: string;            // 仓库类型，如「常温库」「冷库」
  area: number;            // 面积（㎡）
  brandRatio: number;      // 品牌占比（%）
  brandArea: number;       // 品牌承担面积（㎡）
  monthlyRent: number;     // 月租金（元/㎡）
  yearlyRent: number;      // 年租金（元）
  brandYearlyRent: number; // 品牌年租金（元）= yearlyRent × brandRatio
  remark: string;          // 备注
}

// 车辆配置
interface JBPVehicleBudget {
  id: string;
  model: string;           // 车辆型号，如「4.2米厢货」
  type: string;            // 车辆类型
  count: number;           // 数量
  yearlyCost: number;      // 单车年费用（元）
  brandRatio: number;      // 品牌占比（%）
  brandYearlyCost: number; // 品牌年费用（元）= yearlyCost × count × brandRatio
  remark: string;
}

// 人员架构
interface JBPPersonnelBudget {
  id: string;
  role: string;            // 岗位，如「销售主管」
  count: number;           // 人数
  monthlyBaseSalary: number;   // 月基本工资（元）
  yearlyBaseSalary: number;    // 年基本工资（元）= monthlyBaseSalary × 12
  yearlySocialSecurity: number;// 年社保（元）
  yearlyFixedCost: number;     // 年固定成本（元）
  yearlyBonus: number;         // 年终奖（元）
  yearlyTotalCost: number;     // 年总成本（元）
  brandRatio: number;          // 品牌占比（%）
  brandYearlyCost: number;     // 品牌年费用（元）
  remark: string;
}

// 费用规划（市场费用）
interface JBPMarketingBudget {
  id: string;
  item: string;            // 费用项目，如「陈列费」「促销费」
  distributorAmount: number;   // 经销商承担金额（元）
  totalAmount: number;         // 总金额（元）
  ratio: number;               // 经销商占比（%）
  manufacturerRatio: number;   // 厂家占比（%）
  manufacturerAmount: number;  // 厂家承担金额（元）
  remark: string;
}

// 资金准备
interface JBPCapitalBudget {
  id: string;
  item: string;            // 资金项目，如「流动资金」「保证金」
  amount: number;          // 金额（元）
  brandRatio: number;      // 品牌占比（%）
  brandAmount: number;     // 品牌金额（元）
  remark: string;
}
```

---

## 3. 界面规格

### 3.1 布局结构

```
┌─────────────────────────────────────────────┐
│  规划预算 — 标题                             │
│  [🏭 仓库租赁] [🚛 车辆配置] [👥 人员架构]     │ ← Tab 导航
│  [📢 费用规划] [💰 资金准备]                   │
├─────────────────────────────────────────────┤
│                                             │
│  当前 Tab 的内容（以仓库租赁为例）：            │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ # | 类型 | 面积㎡ | 月租/㎡ | 品牌占比  │   │ ← 表头
│  ├──┼──────┼───────┼────────┼──────────┤   │
│  │ 1 | [...] | [...] | [...]  | [...]    │   │ ← 可编辑行
│  │ 2 | [...] | [...] | [...]  | [...]    │   │
│  ├──┼──────┼───────┼────────┼──────────┤   │
│  │   | 合计  | XXX㎡  |        | ¥XXX     │   │ ← 汇总行
│  └──────────────────────────────────────┘   │
│  [+ 添加行]                                  │
│                                             │
├─────────────────────────────────────────────┤
│  预算汇总：总费用 ¥XXX                         │
│  [上一步]              [下一步：预览计划]       │
└─────────────────────────────────────────────┘
```

### 3.2 各子模块表格列定义

**仓库租赁**：

| 列 | 字段 | 类型 | 可编辑 |
|---|------|------|--------|
| 序号 | — | 自动 | ❌ |
| 仓库类型 | type | text | ✅ |
| 面积(㎡) | area | number | ✅ |
| 品牌占比(%) | brandRatio | number | ✅ |
| 品牌面积(㎡) | brandArea | number(计算) | ❌ |
| 月租金(元/㎡) | monthlyRent | number | ✅ |
| 年租金(元) | yearlyRent | number(计算) | ❌ |
| 品牌年租金(元) | brandYearlyRent | number(计算) | ❌ |
| 备注 | remark | textarea(自适应) | ✅ |
| 操作 | — | 删除按钮 | — |

**车辆配置**：

| 列 | 字段 |
|---|------|
| 型号 | model |
| 类型 | type |
| 数量 | count |
| 单车年费(元) | yearlyCost |
| 品牌占比(%) | brandRatio |
| 品牌年费(元) | brandYearlyCost |
| 备注 | remark |

**人员架构**：

| 列 | 字段 |
|---|------|
| 岗位 | role |
| 人数 | count |
| 月基本工资 | monthlyBaseSalary |
| 年基本工资 | yearlyBaseSalary(计算) |
| 年社保 | yearlySocialSecurity |
| 年固定成本 | yearlyFixedCost(计算) |
| 年终奖 | yearlyBonus |
| 年总成本 | yearlyTotalCost(计算) |
| 品牌占比(%) | brandRatio |
| 品牌年费用 | brandYearlyCost(计算) |
| 备注 | remark |

**费用规划**：

| 列 | 字段 |
|---|------|
| 费用项目 | item |
| 经销商金额 | distributorAmount |
| 总金额 | totalAmount |
| 经销商占比(%) | ratio(计算) |
| 厂家占比(%) | manufacturerRatio |
| 厂家金额 | manufacturerAmount(计算) |
| 备注 | remark |

**资金准备**：

| 列 | 字段 |
|---|------|
| 资金项目 | item |
| 金额 | amount |
| 品牌占比(%) | brandRatio |
| 品牌金额 | brandAmount(计算) |
| 备注 | remark |

---

## 4. 自动联动

### 4.1 从盈利拆解同步费用数据

如果「提升盈利能力」目标的 `profitabilityPlan.expenses` 已填写，BudgetStep 初始化时自动同步到 `detailedBudgetPlan.marketing`。同步规则：

```
profitabilityPlan.expenses[category].items[]
  ├─ item.name          → marketing.item
  ├─ item.lastYearActual → marketing.lastYearActual（供参考）
  ├─ item.thisYearTarget → marketing.distributorAmount
  └─ item.strategy       → marketing.remark
```

### 4.2 品牌占比计算

所有子模块中，`brandRatio` 为通用字段，自动计算：
- `brandArea = area × brandRatio / 100`
- `brandYearlyRent = yearlyRent × brandRatio / 100`
- `brandYearlyCost = yearlyCost × count × brandRatio / 100`

### 4.3 预算校验与高亮

当从盈利拆解同步数据后，BudgetStep 可能检测到费用超出 `maxOperatingExpenses`，此时高亮相关字段（红框 `ring-2 ring-red-200`），提示用户调整。

---

## 5. 导航规则

- 进入条件：`isActionStepComplete()`
- 离开条件：校验通过（费用总额 ≤ maxOperatingExpenses）
- 上一步：`'actions'`
- 下一步：`'review'`

---

## 6. 输入校验规范（核心）

> ⚠️ **所有数字输入框**必须遵循以下统一校验规则。本规范覆盖 5 个子模块共 15 个可编辑数字字段。

### 6.1 通用校验规则

| 规则编号 | 规则 | 说明 |
|---------|------|------|
| R01 | **非负** | 不允许输入负数（`-` 号被拦截），接受 `0` |
| R02 | **最多两位小数** | 超过两位小数时自动截断（截断，非四舍五入） |
| R03 | **仅数字 + 小数点** | 禁止输入字母、特殊符号、`e`、`E`、`+`、`-`、`,` 等任何非数字字符（除单个 `.`） |
| R04 | **空值处理** | 允许空字符串（placeholder 显示 `0`），空值不视为 `NaN`，提交时按 `0` 处理 |
| R05 | **输入即时反馈** | 每个输入框在 `onChange` 时即时校验和截断，不使用 `onBlur` 延迟校验 |

### 6.2 实现要求

#### 6.2.1 输入类型

废弃 HTML 原生 `type="number"`（各浏览器行为不一致，允许 `e`/`-`/`+`），改用 `type="text"` + `inputMode="decimal"`，通过 JS 逻辑统一管控。

```html
<input
  type="text"
  inputMode="decimal"
  value="{value || ''}"
  onChange="{handleDecimalInput}"
  placeholder="0"
/>
```

#### 6.2.2 校验处理函数规范

```
函数: handleDecimalInput(rawValue: string, maxDecimals: number = 2): string

处理步骤:
1. 移除所有非数字和非法字符 → 仅保留 [0-9.] 
2. 如果存在多个 "."，仅保留第一个
3. 如果有 "."，截断小数点后超过 maxDecimals 的字符
4. 返回处理后的字符串（不做 Number 转换，保持字符串态避免精度丢失）
5. 如果最终结果为空字符串 → 返回 ""（视为 0）

边界用例:
  "-123"     → "123"      // 负数拦截
  "12.345"   → "12.34"    // 超两位截断
  "abc12.3"  → "12.3"     // 字母拦截  
  "12.3.4"   → "12.34"    // 多余小数点 → 第二个 . 及之后视为小数部分
  "12e5"     → "125"      // e 拦截
  "+12.5"    → "12.5"     // + 号拦截
  "0"        → "0"        // 0 合法
  ""         → ""         // 空值合法
  "."        → "."        // 中间态合法（用户正在输入小数）
  ".5"       → ".5"       // 中间态合法 → 提交时 Number(".5") = 0.5
```

#### 6.2.3 百分数字段特殊规则

`brandRatio` 和 `manufacturerRatio`（品牌/厂家占比）额外约束：

| 规则 | 说明 |
|------|------|
| 范围 `[0, 100]` | 超过 100 时字段红色高亮 + 截断为 100 |
| 同样适用 R01-R05 | 非负、两位小数、纯数字 |

### 6.3 各子模块数字字段清单

#### 仓库租赁 (warehouse)

| 字段 | 显示名 | 类型 | 输入类型 | 校验 |
|------|--------|------|----------|------|
| `area` | 建议总面积(㎡) | number | `inputMode="decimal"` | R01-R05 |
| `brandRatio` | 元气仓库占比(%) | number | `inputMode="decimal"` | R01-R05 + 范围[0,100] |
| `monthlyRent` | 月租金(元/㎡) | number | `inputMode="decimal"` | R01-R05 |
| `brandArea` | 品牌面积(㎡) | 计算值 | 只读 | `area × brandRatio / 100` |
| `yearlyRent` | 年租金(元) | 计算值 | 只读 | `monthlyRent × 12` |
| `brandYearlyRent` | 品牌年租金(元) | 计算值 | 只读 | `yearlyRent × brandRatio / 100` |

#### 车辆配置 (vehicles)

| 字段 | 显示名 | 类型 | 输入类型 | 校验 |
|------|--------|------|----------|------|
| `count` | 数量 | number(整数) | `inputMode="numeric"` | R01-R05 + 整数截断 |
| `dailyCapacity` | 日均配送能力(件) | number | `inputMode="decimal"` | R01-R05 |
| `yearlyCost` | 年运营成本(元) | number | `inputMode="decimal"` | R01-R05 |
| `brandRatio` | 车辆元气占比(%) | number | `inputMode="decimal"` | R01-R05 + 范围[0,100] |
| `brandYearlyCost` | 品牌年费用(元) | 计算值 | 只读 | `yearlyCost × brandRatio / 100` |

#### 人员架构 (personnel)

| 字段 | 显示名 | 类型 | 输入类型 | 校验 |
|------|--------|------|----------|------|
| `count` | 人数 | number(整数) | `inputMode="numeric"` | R01-R05 + 整数截断 |
| `monthlyBaseSalary` | 月基本工资(元) | number | `inputMode="decimal"` | R01-R05 |
| `yearlySocialSecurity` | 年社保(元) | number | `inputMode="decimal"` | R01-R05 |
| `yearlyBonus` | 年提成(元) | number | `inputMode="decimal"` | R01-R05 |
| `brandRatio` | 品牌占比(%) | number | `inputMode="decimal"` | R01-R05 + 范围[0,100] |
| `yearlyBaseSalary` | 年基本工资(万) | 计算值 | 只读 | `monthlyBaseSalary × 12 × count / 10000` |
| `yearlyFixedCost` | 年固定成本(万) | 计算值 | 只读 | `yearlyBaseSalary + yearlySocialSecurity` |
| `yearlyTotalCost` | 年总成本(万) | 计算值 | 只读 | `yearlyFixedCost + yearlyBonus` |
| `brandYearlyCost` | 品牌年费用(万) | 计算值 | 只读 | `yearlyTotalCost × brandRatio / 100` |

#### 费用规划 (marketing)

| 字段 | 显示名 | 类型 | 输入类型 | 校验 |
|------|--------|------|----------|------|
| `distributorAmount` | 经销商承担(万元) | number | `inputMode="decimal"` | R01-R05 |
| `manufacturerRatio` | 厂家承担(%) | number | `inputMode="decimal"` | R01-R05 + 范围[0,100] |
| `ratio` | 经销商占比(%) | 计算值 | 只读 | `distributorAmount / 所有行总经销商金额 × 100` |
| `manufacturerAmount` | 厂家金额(万元) | 计算值 | 只读 | `distributorAmount / (1 - manufacturerRatio/100) - distributorAmount` |
| `totalAmount` | 总金额(万元) | 计算值 | 只读 | `distributorAmount + manufacturerAmount` |

#### 资金准备 (capital)

| 字段 | 显示名 | 类型 | 输入类型 | 校验 |
|------|--------|------|----------|------|
| `amount` | 金额(元) | number | `inputMode="decimal"` | R01-R05 |
| `brandRatio` | 品牌占比(%) | number | `inputMode="decimal"` | R01-R05 + 范围[0,100] |
| `brandAmount` | 元气品牌分摊(元) | 计算值 | 只读 | `amount × brandRatio / 100` |

---

## 7. 边界与异常

| 场景 | 处理方式 |
|------|---------|
| 无盈利拆解数据 | 使用默认空模板（5 行费用占位） |
| 品牌占比超过 100% | 字段红色高亮 + 数值截断为 100 |
| 费用总额超限 | 对应 section 橙色边框 + 具体超标字段红色 |
| 删除最后一行 | 保留至少一行空行 |
| 备注内容过长 | textarea 自适应高度 |
| 输入负数 | `.onChange` 处理函数直接移除 `-` 号，静默拦截 |
| 输入超过两位小数 | 自动截断，不弹出 toast |
| 输入字母/符号/e/E/+ | 自动移除非法字符，不弹出 toast |
| 粘贴非法内容 | 走与手动输入相同的 `onChange` 校验路径 |

---

## 8. 修改日志

| 日期 | 变更内容 | 版本 |
|------|---------|------|
| 2026-06-22 | 初始 PRD 文档创建 | V1.0 |
| 2026-06-30 | 新增 §6 输入校验规范：5 子模块 15 数字字段统一 R01-R05 规则，`type="text"` 取代 `type="number"`，含伪代码和边界用例 | V1.1 |
| 2026-06-30 | 仓库租赁：预算上限/预算对比列从第 8 列修正为第 7 列，对齐「元气分摊年租金(元)」；人员架构：同规则对齐「元气分摊成本(万)」第 10 列 | V1.2 |
| 2026-06-30 | 四个模块预算上限数字右侧新增来源说明：仓库租赁→「取自【拆解策略】-仓库租金」、车辆配置→「邮费/维修/保险/违章」、人员架构→「人员费用」、费用规划→「营销费用」 | V1.3 |
| 2026-06-30 | 车辆配置：删除按钮从 X 改为 Trash2 垃圾桶组件与其他模块统一；允许删至 0 行（部分客户无车），删除 `length > 1` 限制 | V1.4 |
| 2026-07-03 | 仓库租赁/车辆配置：预算上限及预算对比数字后加「元」单位 | V1.5 |
| 2026-07-03 | 人员架构/费用规划：预算上限及预算对比改为保留两位小数（`.toFixed(2)`），数字后加「万」单位；资金准备：启动资金合计两列加「元」单位 | V1.6 |
| 2026-07-08 | 所有必填字段（除备注外）表头加红色 * 标记 | V1.7 |
