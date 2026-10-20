// __tests__/a11y/axeHelper.ts
//
// Wspólna kontrola axe-core (WCAG 2.x A/AA, bez kontrastu – ten sprawdza test tokenów).

import axe from "axe-core";

export async function a11yViolations(container: HTMLElement): Promise<string[]> {
  const result = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}
