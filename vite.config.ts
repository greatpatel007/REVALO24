import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  /* CI sets VITE_BASE=/REVALO24/ for GitHub project Pages; local dev stays "/". */
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        /* Keep heavy map stacks and React out of the landing entry chunk. */
        manualChunks(id) {
          if (id.includes("node_modules/leaflet") || id.includes("leaflet.markercluster")) {
            return "leaflet";
          }
          if (id.includes("@googlemaps/markerclusterer")) {
            return "gmaps-cluster";
          }
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/scheduler") ||
            /node_modules\/react\//.test(id)
          ) {
            return "react-vendor";
          }
        },
      },
    },
  },
});
