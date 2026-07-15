# JBP Pro 交付说明

## 版本信息

- **项目名称**: JBP Pro — 联合生意规划助手
- **交付日期**: 2026-06-30
- **最后更新**: 2026-07-15
- **PRD 版本**: PRD-01 V1.6 / PRD-02 V1.8 / PRD-03 V2.3 / PRD-04 V2.14 / PRD-06 V1.7 / PRD-07 V2.8 / PRD-08 V1.0
- **开发服务器端口**: 5000（可能因端口占用自动调整）

## 技术栈

| 技术 | 版本 |
|------|------|
| React | 18.2.0 |
| Vite | 6.4.1 |
| TypeScript | 5.8 |
| Tailwind CSS | 4.2.1 |
| Recharts | 2.12.7 |
| Google Maps JS API | 1.16.2 |
| Google GenAI | 1.38.0 |

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key（可选）

复制 `.env` 文件，将其中的 `GEMINI_API_KEY` 替换为真实的 Google Gemini API Key。
不配置 API Key 时，AI 相关功能不可用，其他功能正常。

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 访问应用

- **大版本 (≥500万)**: `http://localhost:5002/`
- **小版本 (＜500万)**: `http://localhost:5002/?version=small`

### 5. 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录下。

## 双版本

本项目支持两种业务规模，通过 URL 参数切换：

| 版本 | URL | PlanVersion | 说明 |
|------|-----|-------------|------|
| ≥500万 (大版) | `/` | `large` | 完整 7 步流程，含策略、行动战术 |
| ＜500万 (小版) | `/?version=small` | `small` | 简化流程，无策略输入，拆解完成即可下一步 |

独立 HTML 文件位于 `dist/`：
- `JBP_Pro_大版本_大于等于500万.html` — 大版本独立页面
- `JBP_Pro_小版本_小于500万.html` — 小版本独立页面（通过 `window.JBP_PLAN_VERSION="small"` 设置）

## 项目结构

```
jbp2027/
├── App.tsx                     # 主应用入口，版本检测
├── index.tsx                   # React 渲染入口
├── index.html                  # Vite HTML 模板
├── index.css                   # 全局样式 / Tailwind
├── constants.ts                # 常量 / 模板数据
├── types.ts                    # TypeScript 类型定义
├── demoData.ts                 # 演示参考案例（完整 7 步数据）
├── vite.config.ts              # Vite 构建配置
├── package.json                # 依赖与脚本
├── tsconfig.json               # TypeScript 配置
├── .env                        # 环境变量模板
├── README.md                   # 简要说明
├── HANDOFF.md                  # 本文件
│
├── components/
│   ├── InfoStep.tsx            # Step 1: 基本信息
│   ├── BusinessReviewStep.tsx  # Step 2: 经营回顾
│   ├── ObjectiveStep.tsx       # Step 3: 设定目标
│   ├── StrategyStep.tsx        # Step 4: 拆解策略
│   ├── ActionStep.tsx          # Step 5: 落实行动
│   ├── BudgetStep.tsx          # Step 6: 规划预算
│   ├── ReviewStep.tsx          # Step 7: 预览计划
│   ├── StepWizard.tsx          # 通用向导框架
│   ├── CalendarStep.tsx        # 日历组件
│   ├── PurchaseBreakdown.tsx   # 进货拆解
│   ├── PurchaseBreakdownWizard.tsx
│   ├── SalesBreakdown.tsx      # 销售拆解
│   ├── SalesBreakdownWizard.tsx
│   ├── InventoryBreakdown.tsx  # 库存拆解
│   ├── InventoryBreakdownWizard.tsx
│   ├── ProfitabilityBreakdown.tsx # 盈利拆解
│   └── ProfitabilityBreakdownWizard.tsx
│
├── docs/prd/                   # 产品需求文档
│   ├── README.md               # PRD 索引
│   ├── PRD-01-基本信息.md
│   ├── PRD-02-经营回顾.md
│   ├── PRD-02a-商维度.md
│   ├── PRD-02b-终端维度.md
│   ├── PRD-03-设定目标.md
│   ├── PRD-04-拆解策略.md      # V2.4
│   ├── PRD-05-落实行动.md
│   ├── PRD-06-规划预算.md      # V1.3
│   └── PRD-07-预览计划.md
│
├── dist/                       # 生产构建
│   ├── index.html
│   ├── JBP_Pro_大版本_大于等于500万.html
│   ├── JBP_Pro_小版本_小于500万.html
│   └── assets/
│
└── public/                     # 静态资源（已清理）
```

## 最近变更摘要 (2026-06-30)

### 全局框架
- **V1.1**: 新增演示参考案例 `demoData.ts`，首次打开自动加载完整示例
- **V1.1**: URL 路径版控 `/large` / `/small`，页面标题动态显示版本
- **V1.2**: 步骤条 + Header 置顶固定，长页面滚动不丢失导航

### 经营回顾 (PRD-02)
- **V1.6**: BugFix — 「新地图范围」tab 中 Math.random() 导致数据抖动，改为确定性计算

### 拆解策略 (PRD-04)
- **V2.1**: 库存拆解 — 销售占比(%)、目标周转(天)、下月销预估(箱) 输入限制非负两位小数
- **V2.2**: 盈利拆解 — 去年实际/今年目标/今年目标(万) 统一小数输入校验
- **V2.3**: 库存拆解 — 品类占比总和必须 = 100%，否则下一步禁用
- **V2.4**: 小版(＜500万) — 跳过策略校验，拆解完成即可下一步

### 规划预算 (PRD-06)
- **V1.1**: 5 子模块数字字段统一输入校验规范
- **V1.2**: 仓库租赁/人员架构 — 预算上限/预算对比列对齐修复
- **V1.3**: 四个模块预算上限新增来源说明文案
- **V1.4**: 车辆配置 — X 改 Trash2、允许删至 0 行

### BugFix
- 预览计划 JS 报错 `expandedActionId is not defined` 修复
- 经营回顾「新地图范围」Math.random() 数据抖动修复
- 库存拆解按钮文案修正

## 输入校验规范

所有数字输入字段统一使用以下规则：

1. `type="text"` + `inputMode="decimal"` 取代 `type="number"`
2. 正则过滤非数字/非小数点字符
3. 仅保留第一个小数点
4. 小数位截断至 2 位（不四舍五入）
5. 空值 / 仅小数点 → 转为 0

涉及文件：`InventoryBreakdownWizard.tsx`、`ProfitabilityBreakdownWizard.tsx`、`BudgetStep.tsx`

## 最近变更摘要 (2026-07-06)

### 🔧 BugFix：年份逻辑 + 类型修复
- **year 2027**: 5 文件 8 处新增 `period.includes('2027')`
- **dailyCapacity**: `JBPVehicleBudget` 类型补充 `dailyCapacity: number`，demoData 恢复值

### 📐 设定目标 (PRD-03 V2.2)
- 销售目标联动公式：`箱数 = floor(进货金额/42)`, `金额 = 箱数 × 56`（符合 PRD 100→2箱112元）

### 🔧 BugFix：年份逻辑 (原始)
- **5 文件 8 处**新增 `period.includes('2027')`：StrategyStep(5)、ReviewStep(1)、ObjectiveStep(1)、CalendarStep(1)
- 根因：period="2027 FY" 时月份生成回退到 2023 年，导致所有拆解表数据不匹配

### 📊 库存拆解 (PRD-04 V2.5-V2.11)
- Step2「下月销预估」→「销量预估」只读，同月匹配 salesPlan.thisYearTarget
- useEffect + 初始化强制刷新，弹窗/汇总表双联动
- 表头说明文案、品类占比行、单位标注（箱）、0 值显示修复

### 📦 进货/销售拆解 (PRD-04 V2.7-V2.8)
- 进货规划表：「今年计划」→「明年计划」，金额加「元」
- 销售规划表：各区+全司合计加「箱」，填充完整 monthlyAreaTargets 数据

### 💰 盈利拆解 (PRD-04 V2.12)
- Step1「今年实际」只读，全字段 filterDecimal

### 📋 规划预算 (PRD-06 V1.5-V1.6)
- 仓库/车辆预算上限+对比加「元」；人员/费用加「万」保留两位小数；资金加「元」

### 🗺️ 基本信息 (PRD-01 V1.5)
- 地图双按钮：刷新 + 查看详情/编辑

### 📝 经营回顾 (PRD-02 V1.7)
- 利润详情弹窗输入框：字符串存储 + filterDecimal

### ✅ 预览计划 (PRD-07 V2.1-V2.2)
- **V2.1**: 归档审批「发生变更」→「授权区域发生变更，请重新编辑。」
- **V2.2**: 弹窗标题→「年度计划归档提交」，每个经销商双版本分行展示（≥500万/＜500万），合并名称列，独立多选（Set），自动选中唯一正常版本，弹窗加宽 max-w-4xl，增加「未生成年度计划」状态

### 🎯 参考案例
- demoData.ts 替换为小黄鸭商贸 Coze 完整数据（4目标+5模块预算+12月趋势）
- 独立 HTML 开启 JBP_READONLY 只读预览模式
- dist/ 全量重建，旧文件清理

## 最近变更摘要 (2026-07-08)

### 全局 UI
- 步骤条+头部压缩（py-2/py-1.5，图标缩小），合并为 sticky 容器固定定位
- 规划预算所有必填字段表头加红色 *

### 基本信息 (PRD-01 V1.6)
- 「查看详情/编辑」→「查看/调整授权区域」

### 经营回顾 (PRD-02 V1.8)
- 新增「授权经营区域」模块（经营品类分析和客户分级分析之间），含地图+左侧情报面板+右上角录入数据/刷新/调整授权区域
- 录入数据面板：市场指标单位标签外置（万/亿/升·年），filterDecimal；竞品表增加品牌列、业绩单位万、网点数单位家、达成率0-100%
- 授权地图范围确认移到 Step3 顶部，校验也移到 Step3

### 设定目标 (PRD-03 V2.3)
- 销售目标公式修正：`箱=floor(进货金额/42)`, `元=箱×56`

### 拆解策略 (PRD-04 V2.14)
- JBPVehicleBudget 类型加回 dailyCapacity

### 规划预算 (PRD-06 V1.7)
- 所有必填字段表头加红色 *

### 预览计划 (PRD-07 V2.4)
- 归档弹窗简化：单行显示，仅两种状态（可提交/授权区域发生变更），去掉版本选择，5经销商
- 新增刷新按钮，文案优化

### 审批页面 (PRD-08 V1.0)
- 新增只读审批页面：60秒倒计时+通过/驳回按钮
- GitHub Pages 部署上线：https://craiglige-byte.github.io/jbp-pro/

### 基础设施
- 去掉了底部 footer
- 参考案例链接从 localhost:10000 改为 GitHub Pages 固定链接
- dist/ → docs/ 适配 GitHub Pages 部署
