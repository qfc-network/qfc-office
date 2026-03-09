import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "."),
  publicDir: false,
  base: "/3d/",
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:3210",
      "/ws": {
        target: "ws://localhost:3210",
        ws: true,
      },
    },
  },
});
