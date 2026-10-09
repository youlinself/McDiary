import type { CalendarData, NowInfo, NutritionFood, Order } from "./types";

interface ConfigStatus {
  configured: boolean;
  mcpUrl: string;
  usingEnvToken: boolean;
}

const TOKEN_KEY = "mcdiary_mcp_token";
const MCP_URL_KEY = "mcdiary_mcp_url";
const DEFAULT_MCP_URL = "https://mcp.mcd.cn";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const isDevelopment = import.meta.env.DEV;

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredMcpUrl(): string {
  return localStorage.getItem(MCP_URL_KEY) || DEFAULT_MCP_URL;
}

function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function setStoredMcpUrl(url: string | null) {
  if (url && url !== DEFAULT_MCP_URL) {
    localStorage.setItem(MCP_URL_KEY, url);
  } else {
    localStorage.removeItem(MCP_URL_KEY);
  }
}

function getEffectiveToken(): string | null {
  return getStoredToken();
}

function getEffectiveMcpUrl(): string {
  return getStoredMcpUrl();
}

function toNumber(value: unknown): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function parseToon(text: unknown): NutritionFood[] {
  if (typeof text !== "string" || !text.trim()) return [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const header = lines[0]?.match(/\[\d+\]\{([^}]*)\}/);
  if (!header) return [];
  const columns = header[1].split(",").map((c) => c.trim());
  const rows: NutritionFood[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    let parts = lines[i].split(",");
    if (parts.length > columns.length) {
      const extra = parts.length - columns.length;
      parts = [parts.slice(0, extra + 1).join(","), ...parts.slice(extra + 1)];
    }
    if (parts.length < columns.length) continue;
    const raw: Record<string, string> = {};
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

const cacheStore = new Map<string, { time: number; value: unknown }>();

async function cached<T>(key: string, ttlMs: number, producer: () => Promise<T>, force = false): Promise<T> {
  const now = Date.now();
  const hit = cacheStore.get(key);
  if (!force && hit && now - hit.time < ttlMs) return hit.value as T;
  const value = await producer();
  cacheStore.set(key, { time: now, value });
  return value;
}

function clearCache() {
  cacheStore.clear();
}

async function callMcpTool(toolName: string, token: string): Promise<unknown> {
  let url: string;
  if (isDevelopment) {
    url = "/api/mcp";
  } else if (API_BASE_URL) {
    url = `${API_BASE_URL}/api/mcp`;
  } else {
    url = getEffectiveMcpUrl();
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: {} },
    }),
  });

  if (!res.ok) {
    throw new Error(`MCP 请求失败: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  if (text.startsWith("event:")) {
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        return JSON.parse(line.slice(6));
      }
    }
  }

  return JSON.parse(text);
}

function createNotConfiguredError(): Error {
  const err = new Error("请先配置麦当劳 MCP Token") as Error & {
    code: string;
    notConfigured: boolean;
  };
  err.code = "MCP_TOKEN_NOT_CONFIGURED";
  err.notConfigured = true;
  return err;
}

export const api = {
  async orders(): Promise<Order[]> {
    const token = getEffectiveToken();
    if (!token) throw createNotConfiguredError();
    const data = await cached(
      "orders",
      5 * 60 * 1000,
      () => callMcpTool("order-list", token) as Promise<{ result?: { structuredContent?: { data?: { list?: Order[] } } } }>,
    );
    return data?.result?.structuredContent?.data?.list ?? [];
  },

  async calendar(): Promise<CalendarData> {
    const token = getEffectiveToken();
    if (!token) throw createNotConfiguredError();
    const data = await cached(
      "calendar",
      10 * 60 * 1000,
      () => callMcpTool("campaign-calendar", token) as Promise<{ result?: { structuredContent?: { data?: CalendarData } } }>,
    );
    return data?.result?.structuredContent?.data ?? { currentTime: "", dailyList: [] };
  },

  async nutrition(): Promise<NutritionFood[]> {
    const token = getEffectiveToken();
    if (!token) throw createNotConfiguredError();
    const data = await cached(
      "nutrition",
      6 * 60 * 60 * 1000,
      () => callMcpTool("list-nutrition-foods", token) as Promise<{ result?: { structuredContent?: { data?: unknown } } }>,
    );
    return parseToon(data?.result?.structuredContent?.data);
  },

  async now(): Promise<NowInfo> {
    const token = getEffectiveToken();
    if (!token) throw createNotConfiguredError();
    const data = (await callMcpTool("now-time-info", token)) as { result?: { structuredContent?: { data?: NowInfo } } };
    return data?.result?.structuredContent?.data ?? { date: "" };
  },

  async getConfig(): Promise<ConfigStatus> {
    const token = getEffectiveToken();
    return {
      configured: Boolean(token),
      mcpUrl: getEffectiveMcpUrl(),
      usingEnvToken: false,
    };
  },

  async saveConfig(token: string, mcpUrl?: string): Promise<{ configured: boolean; mcpUrl: string }> {
    if (!token || !token.trim()) {
      throw new Error("Token 不能为空");
    }
    setStoredToken(token.trim());
    if (mcpUrl && mcpUrl.trim()) {
      try {
        new URL(mcpUrl.trim());
        setStoredMcpUrl(mcpUrl.trim());
      } catch {
        throw new Error("MCP 地址格式不正确");
      }
    } else {
      setStoredMcpUrl(null);
    }
    clearCache();
    return { configured: true, mcpUrl: getEffectiveMcpUrl() };
  },

  async clearConfig(): Promise<{ configured: boolean }> {
    setStoredToken(null);
    setStoredMcpUrl(null);
    clearCache();
    return { configured: false };
  },

  async testConnection(): Promise<{ ok: boolean; data: unknown }> {
    const token = getEffectiveToken();
    if (!token) throw createNotConfiguredError();
    const data = await callMcpTool("now-time-info", token);
    return { ok: true, data };
  },
};
