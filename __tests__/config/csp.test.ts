// @vitest-environment node
// __tests__/config/csp.test.ts
//
// CSP produkcyjne: brak 'unsafe-inline' w script-src, a skrypt motywu
// (next-themes, z tymi samymi ustawieniami co w _app) jest dopuszczony skrótem.

import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "next-themes";
import { describe, expect, it, vi } from "vitest";
import { THEME_PROVIDER_PROPS } from "@/config/theme.mjs";

async function productionCsp(): Promise<string> {
  vi.stubEnv("NODE_ENV", "production");
  vi.resetModules();
  const config = (await import("../../next.config.mjs")).default;
  const routes = (await config.headers?.()) ?? [];
  vi.unstubAllEnvs();
  const csp = routes[0]?.headers.find((h) => h.key.startsWith("Content-Security-Policy"));
  if (!csp) throw new Error("Brak nagłówka CSP w next.config.mjs.");
  return csp.value;
}

describe("Content-Security-Policy", () => {
  it("nie zawiera 'unsafe-inline' ani 'unsafe-eval' w script-src", async () => {
    const scriptSrc = (await productionCsp()).split("; ").find((d) => d.startsWith("script-src")) ?? "";
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("dopuszcza dokładnie ten skrypt motywu, który renderuje _app", async () => {
    const html = renderToStaticMarkup(createElement(ThemeProvider, { ...THEME_PROVIDER_PROPS }, null));
    const script = html.slice(html.indexOf("<script>") + 8, html.indexOf("</script>"));
    const hash = createHash("sha256").update(script).digest("base64");
    expect(await productionCsp()).toContain(`'sha256-${hash}'`);
  });
});
