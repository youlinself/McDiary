import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/McDiary/' : '/',
  server: {
    port: 5173,
    proxy: {
      "/api/mcp": {
        target: "https://mcp.mcd.cn",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mcp/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Accept", "application/json, text/event-stream");
          });
        },
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
