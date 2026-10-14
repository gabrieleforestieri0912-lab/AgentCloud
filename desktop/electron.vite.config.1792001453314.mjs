// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
var __electron_vite_injected_dirname = "C:\\Users\\Utente\\Documents\\Vertex\\AgentCloud\\desktop";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      rollupOptions: { input: { index: resolve(__electron_vite_injected_dirname, "src/main/index.ts") } }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      rollupOptions: { input: { index: resolve(__electron_vite_injected_dirname, "src/preload/index.ts") } }
    }
  },
  renderer: {
    root: "src/renderer",
    plugins: [react()],
    build: {
      outDir: "../../out/renderer",
      rollupOptions: { input: { index: resolve(__electron_vite_injected_dirname, "src/renderer/index.html") } }
    }
  }
});
export {
  electron_vite_config_default as default
};
