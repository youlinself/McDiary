import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");

const DEFAULT_MCP_URL = process.env.MCP_URL || "https://mcp.mcd.cn";
const PORT = Number(process.env.PORT || 3000);

// ---------- 用户配置管理（内存 + 文件持久化）----------
const CONFIG_FILE = path.join(ROOT_DIR, "config.json");

let userConfig = {
  token: null,
  mcpUrl: null,
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      userConfig.token = raw.token || null;
      userConfig.mcpUrl = raw.mcpUrl || null;
      if (userConfig.token || userConfig.mcpUrl) {
        console.log("[麦麦日记] 已加载用户配置文件 config.json");
      }
    }
  } catch {
    /* ignore */
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(userConfig, null, 2), "utf-8");
  } catch (err) {
    console.error("[麦麦日记] 保存配置失败:", err);
  }
}

function clearConfig() {
  userConfig.token = null;
  userConfig.mcpUrl = null;
  try {
    if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
  } catch {
    /* ignore */
  }
}

loadConfig();

// ---------- 麦当劳 MCP 客户端（Streamable HTTP，支持动态 Token）----------
let currentToken = null;
let clientPromise = null;

class NotConfiguredError extends Error {
  constructor() {
    super("MCP_TOKEN_NOT_CONFIGURED");
    this.code = "MCP_TOKEN_NOT_CONFIGURED";
  }
}

function getEffectiveToken() {
  return userConfig.token || process.env.MCP_TOKEN || null;
}

function getEffectiveMcpUrl() {
  return userConfig.mcpUrl || DEFAULT_MCP_URL;
}

async function createClient(token) {
  const transport = new StreamableHTTPClientTransport(new URL(getEffectiveMcpUrl()), {
    requestInit: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
  const client = new Client({ name: "mcdiary", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

function getClient() {
  const token = getEffectiveToken();
  if (!token) {
    return Promise.reject(new NotConfiguredError());
  }
  if (token !== currentToken) {
    currentToken = token;
    clientPromise = null;
    cacheStore.clear();
  }
  if (!clientPromise) {
    clientPromise = createClient(token).catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

async function callTool(name, args = {}) {
  const client = await getClient();
  const res = await client.callTool({ name, arguments: args });
  if (res && res.structuredContent) return res.structuredContent;
  const text = Array.isArray(res?.content)
    ? res.content.find((c) => c.type === "text")?.text
    : undefined;
  if (typeof text === "string") {
    const start = text.indexOf("{");
    if (start >= 0) {
      try {
        return JSON.parse(text.slice(start));
      } catch {
        /* ignore */
      }
    }
  }
  throw new Error(`工具 ${name} 的返回无法解析`);
}

// ---------- TOON 解析（餐品营养信息为紧凑 TOON 格式）----------
function toNumber(value) {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function parseToon(text) {
  if (typeof text !== "string" || !text.trim()) return [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const header = lines[0]?.match(/\[\d+\]\{([^}]*)\}/);
  if (!header) return [];
  const columns = header[1].split(",").map((c) => c.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    let parts = lines[i].split(",");
    if (parts.length > columns.length) {
      const extra = parts.length - columns.length;
      parts = [parts.slice(0, extra + 1).join(","), ...parts.slice(extra + 1)];
    }
    if (parts.length < columns.length) continue;
    const raw = {};
    columns.forEach((col, idx) => {
      raw[col] = parts[idx];
    });
    rows.push({
      productName: raw.productName,
      nutritionDescription:
        raw.nutritionDescription === "null" ? "" : raw.nutritionDescription,
      energyKj: toNumber(raw.energyKj),
      energyKcal: toNumber(raw.energyKcal),
      protein: toNumber(raw.protein),
      fat: toNumber(raw.fat),
      carbohydrate: toNumber(raw.carbohydrate),
      sodium: toNumber(raw.sodium),
      calcium: toNumber(raw.calcium),
    });
  }
  return rows;
}

// ---------- 极简内存缓存（降低 MCP 调用频率）----------
const cacheStore = new Map();

async function cached(key, ttlMs, producer, force = false) {
  const now = Date.now();
  const hit = cacheStore.get(key);
  if (!force && hit && now - hit.time < ttlMs) return hit.value;
  const value = await producer();
  cacheStore.set(key, { time: now, value });
  return value;
}

// ---------- HTTP 服务 ----------
const app = express();
app.disable("x-powered-by");
app.use(express.json());

const wrap = (handler) => (req, res) => {
  Promise.resolve(handler(req, res)).catch((err) => {
    if (err?.code === "MCP_TOKEN_NOT_CONFIGURED") {
      res.status(401).json({
        ok: false,
        error: "请先配置麦当劳 MCP Token",
        code: "MCP_TOKEN_NOT_CONFIGURED",
      });
      return;
    }
    console.error(`[麦麦日记] ${req.method} ${req.path} 出错:`, err);
    res.status(502).json({ ok: false, error: String(err?.message || err) });
  });
};

const force = (req) => req.query.refresh === "1";

app.get(
  "/api/health",
  wrap(async (_req, res) => {
    res.json({
      ok: true,
      data: {
        status: "ok",
        mcpUrl: getEffectiveMcpUrl(),
        configured: Boolean(getEffectiveToken()),
      },
    });
  }),
);

app.get(
  "/api/config",
  wrap(async (_req, res) => {
    res.json({
      ok: true,
      data: {
        configured: Boolean(getEffectiveToken()),
        mcpUrl: getEffectiveMcpUrl(),
        usingEnvToken: Boolean(!userConfig.token && process.env.MCP_TOKEN),
      },
    });
  }),
);

app.post(
  "/api/config",
  wrap(async (req, res) => {
    const { token, mcpUrl } = req.body ?? {};
    if (!token || typeof token !== "string" || !token.trim()) {
      res.status(400).json({ ok: false, error: "Token 不能为空" });
      return;
    }
    userConfig.token = token.trim();
    if (mcpUrl && typeof mcpUrl === "string" && mcpUrl.trim()) {
      try {
        new URL(mcpUrl.trim());
        userConfig.mcpUrl = mcpUrl.trim();
      } catch {
        res.status(400).json({ ok: false, error: "MCP 地址格式不正确" });
        return;
      }
    } else {
      userConfig.mcpUrl = null;
    }
    saveConfig();
    currentToken = null;
    clientPromise = null;
    cacheStore.clear();
    res.json({ ok: true, data: { configured: true, mcpUrl: getEffectiveMcpUrl() } });
  }),
);

app.delete(
  "/api/config",
  wrap(async (_req, res) => {
    clearConfig();
    currentToken = null;
    clientPromise = null;
    cacheStore.clear();
    res.json({ ok: true, data: { configured: false } });
  }),
);

app.get(
  "/api/orders",
  wrap(async (req, res) => {
    const data = await cached(
      "orders",
      5 * 60 * 1000,
      () => callTool("order-list"),
      force(req),
    );
    res.json({ ok: true, data: data?.data?.list ?? [] });
  }),
);

app.get(
  "/api/calendar",
  wrap(async (req, res) => {
    const data = await cached(
      "calendar",
      10 * 60 * 1000,
      () => callTool("campaign-calendar"),
      force(req),
    );
    res.json({ ok: true, data: data?.data ?? { dailyList: [] } });
  }),
);

app.get(
  "/api/nutrition",
  wrap(async (req, res) => {
    const data = await cached(
      "nutrition",
      6 * 60 * 60 * 1000,
      () => callTool("list-nutrition-foods"),
      force(req),
    );
    res.json({ ok: true, data: parseToon(data?.data) });
  }),
);

app.get(
  "/api/now",
  wrap(async (_req, res) => {
    const data = await callTool("now-time-info");
    res.json({ ok: true, data: data?.data ?? {} });
  }),
);

// 托管前端构建产物（生产模式）
const distDir = path.join(ROOT_DIR, "dist");
app.use(express.static(distDir));
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[麦麦日记] 服务已启动: http://localhost:${PORT}`);
  console.log(`[麦麦日记] MCP 地址: ${getEffectiveMcpUrl()}`);
  if (getEffectiveToken()) {
    console.log("[麦麦日记] MCP Token 已配置");
  } else {
    console.log("[麦麦日记] 未配置 MCP Token，请在「我的」页面中配置");
  }
});
