import { defineConfig, type Plugin } from "vite";
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

export default defineConfig({
  plugins: [react(), browserBoundary()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: { "/api": { target: "http://127.0.0.1:8080" } },
  },
  build: { sourcemap: false },
});
