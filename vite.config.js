import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { handleTmdb } from "./server/tmdbProxy.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const origin = env.VITE_SUPABASE_URL;
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "tmdb-dev-adapter",
        configureServer(server) {
          server.middlewares.use("/api/tmdb", (req, res) =>
            handleTmdb(req, res, env.TMDB_READ_ACCESS_TOKEN),
          );
        },
      },
      VitePWA({
        registerType: "prompt",
        includeAssets: ["icons/*.png", "icons/*.svg", "images/*.svg"],
        manifest: {
          name: "CineTrack — Your Cinema Shelf",
          short_name: "CineTrack",
          id: "/",
          start_url: "/",
          scope: "/",
          display: "standalone",
          lang: "en",
          description: "Discover. Contribute. Collect.",
          theme_color: "#0B1019",
          background_color: "#0B1019",
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
          cleanupOutdatedCaches: true,
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: origin
            ? [
                {
                  urlPattern: new RegExp(
                    "^" +
                      origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
                      "/storage/v1/object/public/movie-posters/",
                  ),
                  handler: "CacheFirst",
                  options: {
                    cacheName: "community-posters",
                    cacheableResponse: { statuses: [200] },
                    expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
                  },
                },
              ]
            : [],
        },
      }),
    ],
    test: {
      environment: "jsdom",
      setupFiles: ["./src/tests/setup.js"],
      exclude: ["e2e/**", "node_modules/**"],
    },
  };
});
