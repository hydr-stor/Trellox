import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { brand } from "./shared/brand";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "brand-metadata",
      transformIndexHtml: (html: string) =>
        html.replaceAll("%APP_TITLE%", `${brand.name} — ${brand.tagline}`),
    },
  ],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:8787" } },
  build: { outDir: "dist/client", chunkSizeWarningLimit: 600 },
});
