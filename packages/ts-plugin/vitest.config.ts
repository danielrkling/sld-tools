import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      transformJsx: resolve(__dirname, "../transform/src/index.ts"),
      parseJsx: resolve(__dirname, "../parse/src/index.ts"),
    },
  },
});
