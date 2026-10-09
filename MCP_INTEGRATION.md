# 麦当劳 MCP 集成说明 · McDiary

本文说明「麦麦日记」如何实际接入并使用麦当劳 MCP Server。

---

## 1. 接入概览

| 项目 | 内容 |
| --- | --- |
| MCP Server | `mcd-mcp`（serverInfo.version = `1.0.0`） |
| 接入地址 | `https://mcp.mcd.cn` |
| 传输协议 | Streamable HTTP |
| 鉴权方式 | 请求头 `Authorization: Bearer <MCP_TOKEN>` |
| 客户端 | Node.js 服务端，使用官方 `@modelcontextprotocol/sdk`（v1.32.1） |
| 限流 | 每 Token 每分钟最多 600 次请求，超限返回 `429` |

> **为什么由服务端接入？** 麦当劳 MCP 服务器未开放 CORS（预检请求返回 `403`，响应不含 `Access-Control-Allow-Origin`），浏览器无法直接调用。因此项目在服务端建立 MCP 连接，前端通过本地 REST 接口获取数据，同时保证 Token 不暴露给浏览器。

核心客户端代码位于 [server/index.mjs](../server/index.mjs)：

```js
const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
  requestInit: { headers: { Authorization: `Bearer ${MCP_TOKEN}` } },
});
const client = new Client({ name: "mcdiary", version: "1.0.0" });
await client.connect(transport);

const res = await client.callTool({ name, arguments: args });
// 优先取 res.structuredContent，缺失时回退解析 res.content[].text
```

---

## 2. 使用的 Tools

| Tool | 名称 | 入参 | 在本项目中的角色 |
| --- | --- | --- | --- |
| `order-list` | 查询历史订单 | 无 | **消费日历**数据源：订单时间、门店、金额、餐品及套餐子项 |
| `campaign-calendar` | 活动日历查询 | 无 | **日历活动标记**与当日活动详情（标题/亮点/配图/按钮文案） |
| `list-nutrition-foods` | 餐品营养信息列表 | 无 | **营养三环**数据源：能量、蛋白质、脂肪、碳水、钠、钙 |
| `now-time-info` | 当前时间信息查询 | 无 | 定位「今天」，为日历与三环提供准确时间锚点 |

---

## 3. 调用流程

```
前端加载
   │  GET /api/orders      GET /api/calendar      GET /api/nutrition      GET /api/now
   ▼
Node 代理（服务端）
   │  并发调用 4 个 MCP Tool
   ▼
麦当劳 MCP Server
   │
   ├─ order-list          → data.list[]            消费记录
   ├─ campaign-calendar   → data.dailyList[]        每日活动
   ├─ list-nutrition-foods→ data (TOON 字符串)      营养表
   └─ now-time-info       → data.date               今天
   ▼
数据加工（服务端）
   │  TOON 解析、字段归一化、短时缓存
   ▼
前端渲染
   └─ 日历格子 / 营养三环 / 当日详情
```

**REST 接口一览：**

| 接口 | 说明 | 缓存 |
| --- | --- | --- |
| `GET /api/orders` | 历史订单列表 | 5 分钟 |
| `GET /api/calendar` | 活动日历（dailyList） | 10 分钟 |
| `GET /api/nutrition` | 餐品营养列表（已解析为 JSON 数组） | 6 小时 |
| `GET /api/now` | 当前时间信息 | 不缓存 |

> 支持 `?refresh=1` 强制绕过缓存重新拉取，用于「刷新数据」按钮。

---

## 4. 关键数据处理

### 4.1 TOON 格式解析
`list-nutrition-foods` 为降低 Token 消耗，返回的是紧凑的 **TOON（Token-Oriented Object Notation）** 字符串而非 JSON：

```
[160]{productName,nutritionDescription,energyKj,energyKcal,protein,fat,carbohydrate,sodium,calcium}:
  猪柳麦满分,null,1288,308,16,16,24,781,213
  ...
```

服务端在 `parseToon()` 中解析表头列定义与数据行，并把数值字段转换为 `number`，对空值 `null` 做兜底，输出结构化数组供前端使用。

### 4.2 订单餐品 → 营养数据的匹配
订单里的商品名与营养表的产品名并不总是完全一致（例如套餐名、带规格的描述），因此采用分级匹配策略（见 `src/utils/nutrition.ts`）：

1. **归一化**：去除空格、括号、连接符并转小写
2. **精确匹配**：归一化后完全一致则直接命中
3. **包含匹配**：在「一方包含另一方」的候选中，选取长度差最小者，降低误匹配
4. 套餐商品优先展开其 `comboItemList` 子项后再逐项匹配

统计时以「已识别项 / 总项数」提示匹配覆盖率，未识别的餐品不影响其余计算。

### 4.3 消费与摄入聚合
- **日历聚合**：按订单 `createTime` 的日期分组，累加 `realTotalAmount` 得到当日消费金额
- **营养聚合**：对选中日期的订单逐项匹配营养，按 `quantity` 加权求和，得到能量/蛋白/脂肪/碳水/钠/钙合计，驱动三环渲染

---

## 5. 业务价值

| MCP 能力 | 转化为的用户价值 |
| --- | --- |
| 历史订单 | 把散落的订单变成可视化的消费日历，帮助用户回顾花费与频次、管理餐饮预算 |
| 活动日历 | 让用户第一时间感知当月营销活动，不错过优惠与联名 |
| 餐品营养信息 | 将「吃了多少」翻译成「摄入了什么」，支撑控卡、健身等健康场景 |
| 时间信息 | 保证「今天」的判定与活动/订单日期对齐，避免时区或本地时间偏差 |

三个工具的组合形成了「**消费记录 → 活动感知 → 营养洞察**」的闭环，是单个工具无法提供的整合体验。

---

## 6. 错误处理与限流

- MCP 连接惰性建立并做单例复用，连接失败时自动重置以便重试
- 接口异常统一返回 `{ ok: false, error }`，前端展示错误提示并提供「重试」
- 通过服务端短时缓存降低对 MCP 的调用频率，规避 600 次/分钟的限流
- 针对 `401`（Token 无效）与 `429`（限流）返回的异常，会在服务端日志中体现，便于排查
