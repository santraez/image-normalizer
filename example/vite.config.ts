import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "image-normalizer": path.resolve(__dirname, "../dist/index.js"),
    },
  },
  server: {
    port: 5173,
  },
});
