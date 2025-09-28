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
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
