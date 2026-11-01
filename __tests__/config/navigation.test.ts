// __tests__/config/navigation.test.ts
//
// Strażnik menu: każdy widok aplikacji jest w menu, grupy są spójne i w kolejności NAV_GROUPS.

import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  BOTTOM_BAR,
  NAV_GROUPS,
  NAVIGATION_BUTTONS,
  isPathEnabled,
  menuItemsFor,
  menuRowSizes,
} from "@/config/modules";

/** Widoki poza menu: strona główna, publiczne, ustawienia i przewodnik (z ustawień), widoki dynamiczne. */
const OUTSIDE_MENU = new Set(["/", "/start", "/demo", "/privacy", "/settings", "/guide"]);

function pageRoutes(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "api" ? [] : pageRoutes(full);
    if (!name.endsWith(".tsx") || name.startsWith("_") || name.includes("[")) return [];
    const route = `/${relative(join(process.cwd(), "pages"), full)
      .replaceAll("\\", "/")
      .replace(/\.tsx$/, "")}`;
    return [route.replace(/\/index$/, "") || "/"];
  });
}

describe("menu", () => {
  it("zawiera każdy widok aplikacji (poza publicznymi, ustawieniami i dynamicznymi)", () => {
    const inMenu = new Set(NAVIGATION_BUTTONS.map((b) => b.path));
    const missing = pageRoutes(join(process.cwd(), "pages")).filter((r) => !OUTSIDE_MENU.has(r) && !inMenu.has(r));
    expect(missing).toEqual([]);
  });

  it("nie ma duplikatów ścieżek", () => {
    const paths = NAVIGATION_BUTTONS.map((b) => b.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("pozycje każdej grupy stoją obok siebie, a grupy w kolejności NAV_GROUPS", () => {
    const order = NAVIGATION_BUTTONS.map((b) => b.group).filter((g, i, all) => i === 0 || all[i - 1] !== g);
    expect(order).toEqual([...NAV_GROUPS]);
  });

  it("zadania cykliczne są stałą częścią modułu Zadania (nie da się ich wyłączyć)", () => {
    expect(isPathEnabled("/tasks/recurring", ["/tasks/recurring", "/tasks/pomodoro"])).toBe(true);
  });
});

describe("menu a dolny pasek", () => {
  it.each(Object.keys(BOTTOM_BAR))("widok główny %s: menu nie powtarza pozycji z dolnego paska", (view) => {
    const covered = new Set(BOTTOM_BAR[view].map((i) => i.covers));
    expect(menuItemsFor(view).filter((i) => covered.has(i.path))).toEqual([]);
  });

  it.each(Object.keys(BOTTOM_BAR))("widok główny %s: każdy wiersz menu ma 4 albo 3 elementy", (view) => {
    for (const size of menuRowSizes(menuItemsFor(view).length)) expect([3, 4]).toContain(size);
  });

  it("skróty dolnego paska wskazują istniejące pozycje menu (lub stronę główną)", () => {
    const paths = new Set(NAVIGATION_BUTTONS.map((b) => b.path));
    for (const item of Object.values(BOTTOM_BAR).flat())
      expect(item.covers === "/" || paths.has(item.covers)).toBe(true);
  });
});

describe("menuRowSizes", () => {
  it.each([
    [24, [4, 4, 4, 4, 4, 4]],
    [23, [4, 4, 4, 4, 4, 3]],
    [22, [4, 4, 4, 4, 3, 3]],
    [7, [4, 3]],
    [5, [3, 2]],
    [0, []],
  ])("%i elementów → %j", (count, sizes) => {
    expect(menuRowSizes(count)).toEqual(sizes);
    expect(menuRowSizes(count).reduce((a, b) => a + b, 0)).toBe(count);
  });
});
