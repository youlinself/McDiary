import type { CalendarData, NowInfo, NutritionFood, Order } from "./types";

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface ConfigStatus {
  configured: boolean;
  mcpUrl: string;
  usingEnvToken: boolean;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const payload = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok) {
    if (res.status === 401 && payload?.code === "MCP_TOKEN_NOT_CONFIGURED") {
      const err = new Error(payload.error || "MCP Token 未配置") as Error & {
        code: string;
        notConfigured: boolean;
      };
      err.code = "MCP_TOKEN_NOT_CONFIGURED";
      err.notConfigured = true;
      throw err;
    }
    throw new Error(payload?.error || `请求 ${url} 失败（HTTP ${res.status}）`);
  }

  if (!payload?.ok) {
    throw new Error(payload?.error || `接口 ${url} 返回错误`);
  }
  return payload.data as T;
}

export const api = {
  orders: () => request<Order[]>("/api/orders"),
  calendar: () => request<CalendarData>("/api/calendar"),
  nutrition: () => request<NutritionFood[]>("/api/nutrition"),
  now: () => request<NowInfo>("/api/now"),
  getConfig: () => request<ConfigStatus>("/api/config"),
  saveConfig: (token: string, mcpUrl?: string) =>
    request<{ configured: boolean; mcpUrl: string }>("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, mcpUrl }),
    }),
  clearConfig: () =>
    request<{ configured: boolean }>("/api/config", { method: "DELETE" }),
  testConnection: () => request<{ ok: boolean; data: unknown }>("/api/now"),
};
