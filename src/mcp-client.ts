const DEFAULT_MCP_URL = "https://mcp.mcd.cn";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

interface McpResponse {
  jsonrpc: string;
  id: number;
  result?: {
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: unknown;
  };
  error?: {
    code: number;
    message: string;
  };
}

export class McpClient {
  private url: string;
  private token: string | null = null;
  private requestId = 0;

  constructor(url: string = DEFAULT_MCP_URL) {
    this.url = url;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  setUrl(url: string) {
    this.url = url;
  }

  private async request(method: string, params?: unknown): Promise<McpResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(this.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++this.requestId,
        method,
        params,
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

  async initialize(): Promise<void> {
    const result = await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "mcdiary-web", version: "1.0.0" },
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    await this.request("notifications/initialized", {});
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const result = await this.request("tools/call", {
      name,
      arguments: args,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    if (result.result?.structuredContent) {
      return result.result.structuredContent;
    }

    const text = result.result?.content?.find((c) => c.type === "text")?.text;
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

    return result.result;
  }
}

export const mcpClient = new McpClient();
