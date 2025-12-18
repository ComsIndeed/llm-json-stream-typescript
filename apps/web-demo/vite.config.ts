import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/llm-json-stream-typescript/",
  build: {
    outDir: "../../docs",
    emptyOutDir: true,
  },
});
