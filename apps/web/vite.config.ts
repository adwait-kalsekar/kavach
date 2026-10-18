import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";

function browserBoundary(): Plugin {
  return {
    name: "kavach-browser-boundary",
    generateBundle() {
      for (const id of this.getModuleIds()) {
        if (
          /\/apps\/api\/|\/packages\/domain\/|\/node_modules\/(?:@google-cloud|google-auth-library|firebase|firebase-admin)\//.test(
            id,
          )
        ) {
          this.error(`Server module entered the browser bundle: ${id}`);
        }
      }
    },
  };
}

function installConfig(server: Pick<ViteDevServer, "middlewares">) {
  server.middlewares.use((req, res, next) => {
    if (req.url !== "/runtime-config.js") return next();
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      `window.__KAVACH_CONFIG__ = ${JSON.stringify({ apiOrigin: process.env.API_ORIGIN || "http://localhost:8080" })};`,
    );
  });
}

export default defineConfig({
  plugins: [
    react(),
    browserBoundary(),
    {
      name: "local-api-config",
      configureServer(server) {
        installConfig(server);
      },
      configurePreviewServer(server) {
        installConfig(server);
      },
    },
  ],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: { sourcemap: false },
});
