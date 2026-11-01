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
    // „**/” – także zagnieżdżone node_modules (np. docs/mail-gateway po npm install) i projekty w docs/.
    exclude: ["**/node_modules/**", ".next/**", "e2e/**", "docs/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**", "hooks/**", "components/**", "pages/**", "providers/**", "config/**", "proxy.ts"],
      exclude: ["**/*.d.ts", "**/*.config.*"],
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
});
