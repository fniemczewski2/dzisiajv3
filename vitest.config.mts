// vitest.config.ts

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: true,
    exclude: ["node_modules", ".next", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**", "hooks/**", "components/**", "pages/api/**"],
      exclude: ["**/*.d.ts", "**/*.config.*"],
    },
  },
  // Vite resolves tsconfig `paths` (the "@/*" alias) natively via this
  // option now — the `vite-tsconfig-paths` plugin is unnecessary and its
  // unused import was flagged by Sonar (S1128).
  resolve: {
    tsconfigPaths: true,
  },
});
