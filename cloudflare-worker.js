const DEFAULT_MCP_URL = "https://mcp.mcd.cn";

const TOOL_MAP = {
  "/api/orders": "order-list",
  "/api/calendar": "campaign-calendar",
  "/api/nutrition": "list-nutrition-foods",
  "/api/now": "now-time-info",
};

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const mcpUrl = env.MCP_URL || DEFAULT_MCP_URL;

    const toolName = TOOL_MAP[path];
    if (!toolName) {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "未授权" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const mcpResponse = await fetch(mcpUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: { name: toolName, arguments: {} },
        }),
      });

      const data = await mcpResponse.text();
      return new Response(data, {
        status: mcpResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "MCP 请求失败", details: err.message }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
