import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  resolve: {
    alias: {
      "image-normalizer": path.resolve(root, "../dist/index.js"),
    },
  },
  server: {
    port: 5173,
  },
});
