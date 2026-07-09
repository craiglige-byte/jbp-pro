# PRD-01：基本信息

> JBP Pro — 联合生意规划助手 · 模块 1/7
>
> 对应组件：`components/InfoStep.tsx`
> 对应数据分区：`JBPData.distributorName`、`managerName`、`period`、`contractType`、`contractDetail`、`selectedRelatedCustomers`、`authorizedRegions`、`authorizationPolygons`
> 对应 WizardStep：`'info'`

---

## 1. 模块概述

基本信息模块是 JBP 规划的入口页，负责确立规划的合作主体、负责人、时间周期以及授权经营的地理范围。该模块提供高德地图集成的地图预览功能，让用户在地图上直观查看和确认授权区域边界。

### 1.1 核心功能清单

| 序号 | 功能 | 说明 |
|------|------|------|
| F01 | 经销商名称展示 | 固定显示经销商名称，只读 |
| F02 | 城市经理/负责人展示 | 固定显示负责人姓名，只读 |
| F03 | 规划周期展示 | 固定显示 "2027 全财年"，只读 |
| F04 | 授权区域地图预览 | 高德地图多边形区域预览，支持从 `ditu.md` 动态加载 WKT 数据 |
| F05 | 授权区域编辑跳转 | 「编辑」按钮跳转到 ObjectiveStep 中的地图编辑功能 |
| F06 | 参考案例入口 | 可折叠区域展示 JBP 规划示例，支持新窗口打开 HTML 报告 |
| F07 | 开始规划按钮 | 点击后进入下一步（经营回顾） |

---

## 2. 数据模型

### 2.1 写入字段

```typescript
// 以下字段在 InfoStep 中仅为展示（由 App.tsx INITIAL_DATA 初始化）
{
  distributorName: string;     // 经销商名称，如「[示例]小黄鸭商贸有限公司」
  managerName: string;         // 城市经理/负责人，如「张三」
  period: string;              // 规划周期，如「2027 FY」
  authorizationPolygons: any[];// 授权区域多边形数据（序列化 GeoJSON 坐标）
  authorizationConfirmed: boolean; // 是否已确认授权范围
}
```

### 2.2 依赖类型

```typescript
// 无需额外依赖，三个字段均为纯字符串，多边形为 GeoJSON coordinates 数组
```

---

## 3. 界面规格

### 3.1 布局结构

```
┌─────────────────────────────────────────┐
│          标题：开始您的联合生意规划 (JBP)      │
│          副标题：以下是合作伙伴的基本信息        │
├─────────────────────────────────────────┤
│  📦 经销商名称： [小黄鸭商贸有限公司]           │
│  👤 城市经理/负责人： [张三]                  │
│  📅 规划周期： [2027 全财年]                 │
├─────────────────────────────────────────┤
│  🗺️ 授权区域范围                            │
│  ┌─────────────────────────────────┐     │
│  │     高德地图 (280px 高)          │     │
│  │     多边形区域蓝色填充            │     │
│  │                         [编辑]   │     │
│  │  ─────────────────────────────── │     │
│  │  📍 已配置 N 个授权区域 / 点击编辑  │     │
│  └─────────────────────────────────┘     │
├─────────────────────────────────────────┤
│         [ 开始规划 ]  按钮                  │
├─────────────────────────────────────────┤
│  📄 参考案例 (可折叠)                       │
│  ┌─────────────────────────────────┐     │
│  │ 小黄鸭商贸有限公司 - 2027 FY       │     │
│  │ [在新窗口打开]  [关闭]             │     │
│  └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

### 3.2 地图组件规格

| 属性 | 值 |
|------|-----|
| 地图 SDK | 高德地图 JS API v2.0 |
| Key | `09706e6d3502770b99148345f3b1dc47` |
| 安全密钥 | `5dcb0e9a91f058b3e3d40d73200d5f89` |
| 容器高度 | 280px |
| 默认中心 | [118.5, 40.8] |
| 默认缩放 | 5 |
| 数据源 | `ditu.md`（WKT POLYGON 格式） |
| 多边形样式 | 描边 #3b82f6 / 填充透明度 0.12 |

### 3.3 响应式行为

- 桌面端（≥768px）：表单最大宽度 `max-w-2xl`，居中
- 移动端（<768px）：全宽，地图高度不变

---

## 4. 交互流程

### 4.1 主流程

```
用户进入页面
  ↓
查看三个基本信息（只读展示）
  ↓
查看授权区域地图预览
  ├─ 地图自动加载 WKT 多边形 → 渲染蓝色填充区域
  ├─ 无已保存数据 → 从 /ditu.md 动态加载默认范围
  └─ 有已保存数据 → 从 data.authorizationPolygons 回显
  ↓
（可选）点击「编辑」→ 跳转到目标设定页的地图编辑模式
  ↓
（可选）展开「参考案例」→ 新窗口打开示例 HTML 报告
  ↓
点击「开始规划」→ 导航到 business_review 步骤
```

### 4.2 导航规则

- 进入条件：始终可进入（步骤 1）
- 离开条件：`data.distributorName !== '' && data.managerName !== ''`（在 `canNavigate` 中判定）
- 下一步：`business_review`（经营回顾）

---

## 5. 技术实现要点

### 5.1 WKT 解析

```typescript
// ditu.md 中的 WKT 格式
// POLYGON ((lng1 lat1, lng2 lat2, ...))

const parseWKT = (wktText: string): number[][] | null => {
  const match = wktText.match(/POLYGON \(\((.*)\)\)/i);
  if (match) {
    return match[1].split(',').map(point => {
      const [lng, lat] = point.trim().split(' ').map(Number);
      return [lng, lat];
    });
  }
  return null;
};
```

### 5.2 地图初始化顺序

1. 检查 `window.AMap` 是否已加载
2. 如已加载：直接 `new AMap.Map()`
3. 如未加载：动态创建 `<script>` 标签加载 SDK → 回调中初始化
4. 渲染多边形：优先从 `authorizationPolygons`，其次加载 `/ditu.md`

### 5.3 视野自适应

```typescript
// 手动计算所有 polygon 的 min/max 坐标
let minLng = Infinity, maxLng = -Infinity;
let minLat = Infinity, maxLat = -Infinity;
// 遍历所有多边形路径点...
// 根据跨度计算 zoom：>2→6, >0.5→9, >0.1→10, 其他→11
map.setCenter([centerLng, centerLat]);
map.setZoom(zoom);
```

---

## 6. 边界与异常

| 场景 | 处理方式 |
|------|---------|
| `ditu.md` 加载失败 | `console.warn`，地图显示空白（无多边形） |
| 地图 SDK 加载超时 | `script.onerror` → `console.error` |
| 组件卸载时地图未加载完 | `isMounted` 标志位防止 setState on unmounted |
| 无授权多边形数据 | 底部文字显示「点击编辑配置授权区域」 |
| `authorizationPolygons` 数据格式异常 | 兼容两种格式：`{coordinates: [[[...]]]}` 和 `[[lng,lat],...]` |

---

## 7. 修改日志

| 日期 | 变更内容 | 版本 |
|------|---------|------|
| 2026-06-22 | 初始 PRD 文档创建 | V1.0 |
| 2026-06-30 | 新增演示参考案例：`demoData.ts` 含完整 7 步数据，无 localStorage 时自动加载；新增 URL 路径版控 `/large` / `/small`（兼容旧 `?version=`）；页面标题动态显示版本（≥500万/＜500万） | V1.1 |
| 2026-06-30 | 步骤条置顶：Header `sticky top-0 z-30` + StepWizard `sticky top-0 md:top-14 z-20`，长页面滚动时步骤条始终可见 | V1.2 |
| 2026-06-30 | 新增只读预览模式：`window.JBP_READONLY` / `?demo=1` 触发，锁定 `DEMO_DATA`，隐藏 header/步骤条/操作按钮，纯展示预览计划 | V1.3 |
| 2026-06-30 | 基本信息→参考案例「在新窗口打开」按钮：根据 `planVersion` 自动打开对应只读预览 HTML（≥500万/＜500万），数据锁死不受用户修改影响 | V1.4 |
| 2026-07-03 | 授权区域范围地图新增「刷新」按钮（`refreshKey` 驱动重载），原「编辑」→「查看详情/编辑」 | V1.5 |
| 2026-07-08 | 「查看详情/编辑」→「查看/调整授权区域」 | V1.6 |
