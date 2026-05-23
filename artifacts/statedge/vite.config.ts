import { defineConfig } from "vite";
  import react from "@vitejs/plugin-react";
  import tailwindcss from "@tailwindcss/vite";
  import path from "path";

  const port = Number(process.env.PORT) || 3000;
  const basePath = process.env.BASE_PATH || "/";

  // On Vercel, output to repo root ./dist so Vercel finds it at outputDirectory:"dist"
  // On Replit/local, output to artifacts/statedge/dist as usual
  const outDir = "dist";

  export default defineConfig({
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
              m.default()
            ),
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              })
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner()
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            motion: ["framer-motion"],
            supabase: ["@supabase/supabase-js"],
          },
        },
      },
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  });
  
