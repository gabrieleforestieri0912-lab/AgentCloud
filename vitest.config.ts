import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // `import.meta.dirname` instead of `__dirname`: the config is loaded as
      // native ESM (`--configLoader runner`), which is what lets vitest start
      // on Windows machines where the project path crosses a junction/symlink
      // (e.g. C:\Users\X\Documenti -> Documents) that esbuild can't traverse.
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
