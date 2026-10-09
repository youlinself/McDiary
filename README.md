# 麦麦日记 · McDiary

> 用日历记录每一次麦当劳消费，用营养三环读懂今天的摄入。

**麦麦日记**是一款基于 **麦当劳 MCP（Model Context Protocol）** 构建的个人饮食记录应用。它把零散的麦当劳订单，重新组织成一本有温度的「饮食日记」：日历格子还原你每一次的麦麦时光，营养三环则把当天的摄入量翻译成一眼可读的环形图。

> 本项目为「麦当劳程序员创意开发大赛」参赛作品，由参赛者独立开发，非麦当劳官方产品。

---

## ✨ 核心功能

### 📅 消费日历
- 从麦当劳 MCP 拉取**历史订单**，按消费日期映射到日历格子上，格子里直接显示当天消费金额
- 从**活动日历**查询麦当劳当月营销活动，有活动的日期以绿点标记
- 支持月份切换、「回到今天」，点击任意日期即可查看当天的消费明细与活动详情

### 🍩 营养三环
- 依据**餐品营养信息**，把所选日期从麦当劳摄入的能量、蛋白质、脂肪绘制成同心三环（类似运动 App 的健康三环）
- 环外补充展示碳水、钠、钙等指标，并标注相对每日参考值的百分比
- 与日历**联动**：点击日历上的任意一天，三环实时切换为当天的摄入情况

### 🎨 视觉风格
- 暖色调、面包烘焙质感，参考麦当劳 App 的配色与圆角语言

---

## 🧩 使用的麦当劳 MCP 能力

| Tool | 名称 | 在本项目中的用途 |
| --- | --- | --- |
| `order-list` | 查询历史订单 | 消费日历的数据源（订单、门店、金额、餐品） |
| `campaign-calendar` | 活动日历查询 | 日历上的麦麦活动标记与活动详情 |
| `list-nutrition-foods` | 餐品营养信息列表 | 营养三环的数据源（能量/蛋白/脂肪/碳水/钠/钙） |
| `now-time-info` | 当前时间信息查询 | 定位「今天」，让日历与三环有准确的时间锚点 |

> 详细的调用流程与数据处理逻辑，见 [MCP_INTEGRATION.md](./MCP_INTEGRATION.md)。

---

## 🏗 架构

浏览器无法直接跨域访问麦当劳 MCP 服务器（服务器未开放 CORS），因此本项目采用「前端 + 极简 Node 代理」的架构：

```
┌──────────────────────┐   HTTP /api/*   ┌───────────────────────────┐
│  浏览器 (React SPA)   │ ──────────────► │  Node 代理 (Express)       │
│  日历 / 营养三环 UI   │ ◄────────────── │  MCP Client + 静态托管      │
└──────────────────────┘                 └───────────┬───────────────┘
                                                     │ MCP over Streamable HTTP
                                                     │ Authorization: Bearer <TOKEN>
                                                     ▼
                                        ┌───────────────────────────┐
                                        │  麦当劳 MCP Server         │
                                        │  https://mcp.mcd.cn        │
                                        └───────────────────────────┘
```

- **Token 只保存在服务端**（`.env`，已被 `.gitignore` 忽略），前端代码与仓库中不含任何真实凭证
- 服务端使用官方 `@modelcontextprotocol/sdk` 的 `StreamableHTTPClientTransport` 接入，并对结果做 TOON 解析、餐品-营养匹配与短时缓存

---

## 📁 目录结构

```
.
├── index.html                  # Vite 入口
├── package.json
├── vite.config.ts              # 开发期将 /api 代理到本地 Node 服务
├── tsconfig.json
├── mcp-config.example.json     # 脱敏 MCP 配置示例（占位符）
├── CONTEST_DECLARATION.md      # 参赛声明（内容不可改动）
├── MCP_INTEGRATION.md          # MCP 集成说明
├── README.md
├── server/
│   └── index.mjs               # Node 代理：MCP 客户端 + REST 接口 + 静态托管
└── src/
    ├── main.tsx
    ├── App.tsx                 # 数据编排与页面布局
    ├── api.ts                  # 前端接口封装
    ├── types.ts
    ├── index.css               # 暖色调烘焙风主题
    ├── components/
    │   ├── Header.tsx
    │   ├── CalendarBoard.tsx   # 消费日历
    │   ├── DayDetail.tsx       # 当日消费/活动/营养明细
    │   └── HealthRings.tsx     # 营养三环
    └── utils/
        ├── date.ts             # 日期与日历矩阵
        └── nutrition.ts        # 营养匹配与摄入量计算
```

---

## 🚀 快速开始

### 前置条件
- Node.js ≥ 20
- 麦当劳中国的 **MCP Token**（申请方式见 [麦当劳 MCP 文档](https://open.mcd.cn/mcp/doc)）

### 1. 配置环境变量
复制示例文件并填入你的真实 Token（`.env` 已被 `.gitignore` 忽略，不会进入仓库）：

```bash
cp .env.example .env
```

```dotenv
MCP_TOKEN=你的麦当劳MCP Token
# 可选
MCP_URL=https://mcp.mcd.cn
PORT=3000
```

### 2. 安装依赖

```bash
npm install
```

### 3. 开发模式（前端热更新 + 本地代理）

```bash
npm run dev
```

- 前端：http://localhost:5173
- 代理服务：http://localhost:3000

### 4. 生产模式（构建并由 Node 服务统一托管）

```bash
npm run build
npm start
```

打开 http://localhost:3000 即可使用。

### 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 同时启动 Vite 开发服务器与 Node 代理 |
| `npm run build` | 构建前端产物到 `dist/` |
| `npm start` | 启动 Node 服务（托管 `dist/` 并代理 MCP） |
| `npm run serve` | 构建后启动 |
| `npm run typecheck` | TypeScript 类型检查 |

---

## 🧑‍💻 使用示例

1. 打开应用后，日历会自动定位到**最近一次有消费记录的月份**（若当月无记录则回到今天），营养三环同步展示该日摄入
2. 日历格子里，`¥` 徽标表示当天有消费并显示金额，绿色圆点表示当天有麦麦活动
3. 点击任意日期：
   - 右侧「营养三环」切换为当天的摄入情况
   - 「当日详情」列出当天的订单（门店、金额、餐品）、活动信息与逐项营养拆解
4. 使用「‹ / ›」切换月份，「回到今天」快速回到当前日期

---

## 🎯 目标用户

- 想回顾自己麦当劳消费习惯、控制餐饮开支的**麦门爱好者**
- 在身材管理 / 控卡期，希望了解每次麦当劳摄入热量的**健身与健康人群**
- 想第一时间掌握麦当劳营销活动节奏的**优惠敏感型用户**

---

## 🔒 隐私与安全

- 真实 MCP Token 仅存于服务端 `.env`，**不入库、不下发到浏览器**
- 仓库内仅保留 [mcp-config.example.json](./mcp-config.example.json) 脱敏示例，使用 `YOUR_MCP_TOKEN` 占位符
- 应用不收集、不上传任何用户数据，所有请求均在本机服务与麦当劳 MCP 之间完成

---

## ⚠️ 免责声明

- 本项目为参赛作品，由参赛者独立开发，非麦当劳官方产品
- 项目输出仅供参考，不构成医疗、营养或其他专业建议
- 餐品信息、价格及供应状态以麦当劳官方渠道的实时结果为准
