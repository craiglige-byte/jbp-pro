# JBP Pro — 联合生意规划助手

> 专为城市经理与经销商打造的联合生意规划 (Joint Business Planning) 工具，通过预设的专家模板和 AI 智能建议，快速生成专业的目标、策略和行动规划方案。

## 线上地址

- **大版本（≥500万）**: https://craiglige-byte.github.io/jbp-pro/large
- **小版本（＜500万）**: https://craiglige-byte.github.io/jbp-pro/small
- **审批页面**: https://craiglige-byte.github.io/jbp-pro/JBP_审批_大版本.html

## 快速启动

**前置条件**: Node.js ≥18

```bash
# 1. 安装依赖
npm install

# 2. （可选）配置 Gemini API Key
# 编辑 .env 文件，替换 GEMINI_API_KEY 为真实 Key
# 不配置时 AI 功能不可用，其他功能正常

# 3. 启动开发服务器
npm run dev
# → http://localhost:5000/jbp-pro/

# 4. 构建
npm run build
# → dist/ 目录（同时自动同步到 docs/）
```

## 双版本

| 版本 | URL | 说明 |
|------|-----|------|
| ≥500万 (大版) | `/?version=large` | 完整 7 步流程，含策略、行动战术 |
| ＜500万 (小版) | `/?version=small` | 简化流程，无策略输入 |

## 技术栈

React 18 · TypeScript 5.8 · Vite 6 · Tailwind CSS 4 · Recharts 2.12 · Google Maps JS API

## 项目结构

```
jbp2027/
├── App.tsx                     # 主应用入口，版本检测
├── index.tsx                   # React 渲染入口
├── index.html                  # Vite HTML 模板
├── index.css                   # 全局样式 / Tailwind
├── constants.ts                # 常量 / 模板数据
├── types.ts                    # TypeScript 类型定义
├── demoData.ts                 # 演示参考案例
├── vite.config.ts              # Vite 构建配置
├── package.json                # 依赖与脚本
├── tsconfig.json               # TypeScript 配置
├── .env                        # 环境变量模板
├── HANDOFF.md                  # 完整交付说明（前后端必读）
│
├── components/                 # 7 步向导组件 + 4 个拆解面板
├── docs/prd/                   # 产品需求文档 (PRD-01 ~ PRD-08)
├── docs/                       # GitHub Pages 部署（JS/CSS + HTML 入口）
├── dist/                       # Vite 构建输出
├── public/                     # 静态资源
└── scripts/sync-docs.js        # 构建后自动同步 docs/
```

## 文档索引

- **[HANDOFF.md](./HANDOFF.md)** — 交付说明、变更日志、输入校验规范（**前后端必读**）
- **[PRD 文档](./docs/prd/README.md)** — 10 个模块 PRD 索引与依赖关系
- **[项目模块会话拆解](./10-项目模块会话拆解.md)** — 开发会话规划

## 7 步流程

| 步骤 | 组件 | PRD |
|------|------|-----|
| 1. 基本信息 | `InfoStep.tsx` | PRD-01 |
| 2. 经营回顾 | `BusinessReviewStep.tsx` | PRD-02 (+ 02a/02b) |
| 3. 设定目标 | `ObjectiveStep.tsx` | PRD-03 |
| 4. 拆解策略 | `StrategyStep.tsx` | PRD-04 |
| 5. 落实行动 | `ActionStep.tsx` | PRD-05 |
| 6. 规划预算 | `BudgetStep.tsx` | PRD-06 |
| 7. 预览计划 | `ReviewStep.tsx` | PRD-07 |
| — | 审批页面 | PRD-08 |

## 部署

GitHub Pages（从 `main` 分支 `docs/` 目录部署），`npm run build` 自动同步 `dist/` → `docs/`。
