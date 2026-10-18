// __tests__/lib/reportTemplate.test.ts

import { describe, it, expect } from "vitest";
import {
  detectFontKind,
  detectImageKind,
  normalizeReportTemplate,
  clampLogoWidth,
  hasCustomTemplate,
} from "@/lib/reportTemplate";
import { buildReportDocDefinition, resolveReportFonts, SAMPLE_REPORT, TEMPLATE_FONT_NAMES } from "@/lib/reportExport";

const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0]);

describe("rozpoznawanie plików", () => {
  it("czcionki po sygnaturze, nie po rozszerzeniu", () => {
    expect(detectFontKind(bytes(0x00, 0x01, 0x00, 0x00))).toBe("ttf");
    expect(detectFontKind(new TextEncoder().encode("OTTO...."))).toBe("otf");
    expect(detectFontKind(new TextEncoder().encode("wOF2...."))).toBeNull();
    expect(detectFontKind(bytes(0x89, 0x50))).toBeNull();
  });
  it("logo: PNG i JPG", () => {
    expect(detectImageKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(detectImageKind(bytes(0xff, 0xd8, 0xff))).toBe("jpeg");
    expect(detectImageKind(new TextEncoder().encode("<svg xmlns"))).toBeNull();
  });
});

describe("normalizeReportTemplate", () => {
  it("przyjmuje tylko pliki z folderu użytkownika i przycina szerokość logo", () => {
    const t = normalizeReportTemplate(
      {
        fonts: {
          title: { path: "u1/font-title.ttf", name: "Lora.ttf" },
          body: { path: "u2/font-body.ttf", name: "x" },
          nope: {},
        },
        logo: { path: "u1/logo.png", name: "logo.png", width: 9999 },
      },
      "u1"
    );
    expect(Object.keys(t.fonts ?? {})).toEqual(["title"]);
    expect(t.logo?.width).toBe(220);
    expect(clampLogoWidth("abc")).toBe(140);
    expect(hasCustomTemplate(t)).toBe(true);
    expect(hasCustomTemplate(normalizeReportTemplate(null))).toBe(false);
  });
});

describe("PDF z szablonem", () => {
  it("kaskada czcionek: nagłówki ← treść, tytuł ← nagłówki", () => {
    expect(resolveReportFonts({})).toEqual({ title: "Roboto", heading: "Roboto", body: "Roboto" });
    expect(resolveReportFonts({ body: true })).toEqual({
      title: TEMPLATE_FONT_NAMES.body,
      heading: TEMPLATE_FONT_NAMES.body,
      body: TEMPLATE_FONT_NAMES.body,
    });
    expect(resolveReportFonts({ title: true })).toEqual({
      title: TEMPLATE_FONT_NAMES.title,
      heading: "Roboto",
      body: "Roboto",
    });
  });

  it("logo w jednej linii z tytułem (dwie kolumny), bez nagłówka strony", () => {
    const def = buildReportDocDefinition(SAMPLE_REPORT, { logo: { dataUrl: "data:image/png;base64,AAA", width: 120 } });
    const first = def.content[0] as {
      columns: Array<{ image?: string; fit?: number[]; alignment?: string; stack?: unknown[] }>;
    };
    expect(first.columns).toHaveLength(2);
    expect(first.columns[0].stack).toHaveLength(2); // tytuł + data
    expect(first.columns[1]).toMatchObject({ image: "data:image/png;base64,AAA", fit: [120, 150], alignment: "right" });
    expect((def as { header?: unknown }).header).toBeUndefined();
    expect(def.pageMargins[1]).toBe(50);
    const noLogo = buildReportDocDefinition(SAMPLE_REPORT).content[0] as { columns?: unknown; stack?: unknown[] };
    expect(noLogo.columns).toBeUndefined();
    expect(noLogo.stack).toHaveLength(2);
  });

  it("style używają czcionek ról", () => {
    const def = buildReportDocDefinition(SAMPLE_REPORT, { fonts: { title: true, heading: true, body: true } });
    expect(def.styles.title.font).toBe(TEMPLATE_FONT_NAMES.title);
    expect(def.styles.sectionTitle.font).toBe(TEMPLATE_FONT_NAMES.heading);
    expect(def.defaultStyle.font).toBe(TEMPLATE_FONT_NAMES.body);
  });
});

import { normalizeTemplateSet, pickTemplate, templateAssetPaths, MAX_REPORT_TEMPLATES } from "@/lib/reportTemplate";

describe("zestaw szablonów (do 5)", () => {
  it("dawny pojedynczy szablon staje się „Szablonem podstawowym”", () => {
    const set = normalizeTemplateSet(
      { fonts: { body: { path: "u1/font-body.ttf", name: "Lora.ttf" } }, logo: null },
      "u1"
    );
    expect(set.templates).toHaveLength(1);
    expect(set.templates[0]).toMatchObject({ id: "default", name: "Szablon podstawowy" });
    expect(set.default_id).toBe("default");
  });

  it("pusty dawny zapis = brak szablonów", () => {
    expect(normalizeTemplateSet({ fonts: {}, logo: null }).templates).toEqual([]);
  });

  it("limit 5, unikalne id, domyślny musi istnieć", () => {
    const templates = Array.from({ length: 8 }, (_, i) => ({ id: `t${i % 6}`, name: `S${i}`, fonts: {}, logo: null }));
    const set = normalizeTemplateSet({ templates, default_id: "nie-ma" });
    expect(set.templates).toHaveLength(MAX_REPORT_TEMPLATES);
    expect(new Set(set.templates.map((t) => t.id)).size).toBe(MAX_REPORT_TEMPLATES);
    expect(set.default_id).toBe("t0");
  });

  it("protokół: wybrany szablon, a gdy usunięty – domyślny", () => {
    const set = normalizeTemplateSet({
      templates: [
        { id: "a", name: "Fundacja A" },
        { id: "b", name: "Fundacja B" },
      ],
      default_id: "b",
    });
    expect(pickTemplate(set, "a")?.name).toBe("Fundacja A");
    expect(pickTemplate(set, "usuniety")?.name).toBe("Fundacja B");
    expect(pickTemplate(set, null)?.name).toBe("Fundacja B");
    expect(pickTemplate({ templates: [], default_id: null }, "a")).toBeNull();
  });

  it("pliki do usunięcia razem z szablonem", () => {
    expect(
      templateAssetPaths({
        fonts: { title: { path: "u/t1/font-title.ttf", name: "x" } },
        logo: { path: "u/t1/logo.png", name: "l" },
      })
    ).toEqual(["u/t1/font-title.ttf", "u/t1/logo.png"]);
  });
});
