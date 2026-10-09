import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

interface ConfigStatus {
  configured: boolean;
  mcpUrl: string;
  usingEnvToken: boolean;
}

interface ProfileProps {
  onConfigChange: () => void;
}

export function Profile({ onConfigChange }: ProfileProps) {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [token, setToken] = useState("");
  const [mcpUrl, setMcpUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.getConfig();
      setStatus(data);
      setMcpUrl(data.mcpUrl === "https://mcp.mcd.cn" ? "" : data.mcpUrl);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleSave = async () => {
    if (!token.trim()) {
      setMessage({ type: "error", text: "请输入 MCP Token" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.saveConfig(token.trim(), mcpUrl.trim() || undefined);
      setMessage({ type: "success", text: "配置已保存" });
      setToken("");
      await loadStatus();
      onConfigChange();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "保存失败",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.clearConfig();
      setMessage({ type: "success", text: "配置已清除" });
      await loadStatus();
      onConfigChange();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "清除失败",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      await api.testConnection();
      setMessage({ type: "success", text: "连接测试成功，Token 有效" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "连接测试失败";
      setMessage({ type: "error", text: msg });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="profile">
      <section className="panel">
        <h2 className="panel__title">MCP 配置</h2>
        <p className="profile__desc">
          配置你自己的麦当劳 MCP Token，用于查询订单、活动与营养数据。
           Token 仅保存在本地服务端，不会上传到任何第三方。
        </p>

        {status?.configured && (
          <div className="profile__status">
            <span className="profile__status-dot" />
            <span>
              已配置 Token
              {status.usingEnvToken && "（来自环境变量）"}
              {status.mcpUrl && ` · MCP 地址：${status.mcpUrl}`}
            </span>
          </div>
        )}

        <div className="profile__form">
          <label className="profile__label">
            <span>MCP Token</span>
            <input
              type="password"
              className="profile__input"
              placeholder="输入你的麦当劳 MCP Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </label>

          <label className="profile__label">
            <span>MCP 服务地址（可选）</span>
            <input
              type="text"
              className="profile__input"
              placeholder="https://mcp.mcd.cn"
              value={mcpUrl}
              onChange={(e) => setMcpUrl(e.target.value)}
              autoComplete="off"
            />
          </label>

          <div className="profile__actions">
            <button
              type="button"
              className="btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "保存中…" : "保存配置"}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleTest}
              disabled={testing || !status?.configured}
            >
              {testing ? "测试中…" : "测试连接"}
            </button>
            {status?.configured && !status.usingEnvToken && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleClear}
                disabled={saving}
              >
                清除配置
              </button>
            )}
          </div>

          {message && (
            <div className={`profile__msg profile__msg--${message.type}`}>
              {message.text}
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">使用说明</h2>
        <div className="profile__help">
          <h4>如何获取 MCP Token？</h4>
          <p>
            访问{" "}
            <a
              href="https://open.mcd.cn/mcp/doc"
              target="_blank"
              rel="noreferrer"
            >
              麦当劳 MCP 开放平台
            </a>{" "}
            申请开发者 Token。
          </p>

          <h4>Token 会保存在哪里？</h4>
          <p>
            Token 仅保存在本地服务端的 <code>config.json</code> 文件中，
            不会上传到任何服务器，也不会出现在浏览器代码里。
          </p>

          <h4>如何切换账号？</h4>
          <p>
            在上方表单中输入新的 Token 并保存，系统会自动使用新 Token 重新连接。
          </p>

          <h4>环境变量优先</h4>
          <p>
            如果服务端 <code>.env</code> 中配置了 <code>MCP_TOKEN</code>，
            会优先使用环境变量。在页面中配置的 Token 会覆盖环境变量。
          </p>
        </div>
      </section>
    </div>
  );
}
