import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "."),
  publicDir: false,
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3210",
      "/ws": {
        target: "ws://localhost:3210",
        ws: true,
      },
    },
  },
});
