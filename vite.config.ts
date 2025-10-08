import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(async ({ mode }) => {
  const isProd = mode === "production";

  const plugins: any[] = [react()];

  // Add Replit-only plugins in development, and only if available
  if (!isProd && process.env.REPL_ID) {
    try {
      const { default: runtimeErrorOverlay } = await import(
        "@replit/vite-plugin-runtime-error-modal"
      );
      plugins.push(runtimeErrorOverlay());

      const cartographer = await import(
        "@replit/vite-plugin-cartographer"
      ).then((m) => m.cartographer?.());
      const devBanner = await import(
        "@replit/vite-plugin-dev-banner"
      ).then((m) => m.devBanner?.());

      if (cartographer) plugins.push(cartographer);
      if (devBanner) plugins.push(devBanner);
    } catch {
      // Plugins not installed locally; ignore in non-Replit environments
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    optimizeDeps: {
      exclude: ['drizzle-orm'],
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      // Performance optimizations
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: isProd ? false : true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
            charts: ['recharts'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    server: {
      port: Number(process.env.PORT) || 3000,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        "/api": {
          target: process.env.VITE_API_URL || "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
        "/ws": {
          target: process.env.VITE_WS_URL || "ws://localhost:5050",
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
