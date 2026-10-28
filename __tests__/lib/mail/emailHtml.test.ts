// __tests__/lib/mail/emailHtml.test.ts

import { describe, it, expect } from "vitest";
import { prepareEmailHtml, remoteImageUrl } from "@/lib/mail/emailHtml";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

function body(html: string, opts: Parameters<typeof prepareEmailHtml>[1] = { showRemoteImages: false }) {
  const out = prepareEmailHtml(html, opts);
  const doc = new DOMParser().parseFromString(out.document, "text/html");
  return { doc, out };
}

describe("prepareEmailHtml – bezpieczeństwo", () => {
  it("usuwa skrypty, obsługę zdarzeń, ramki, formularze i SVG", () => {
    const { doc } = body(
      '<p onclick="alert(1)">x</p><script>alert(1)</script><iframe src="https://e.com"></iframe><form><input></form><svg><script>1</script></svg>'
    );
    expect(doc.querySelector("script:not(head script)")).toBeNull();
    expect(doc.querySelector("p")?.getAttribute("onclick")).toBeNull();
    expect(doc.querySelector("iframe, form, input, svg")).toBeNull();
  });

  it("link javascript: i względny tracą href; bezpieczny otwiera się w nowej karcie bez referrera", () => {
    const { doc } = body('<a href="javascript:alert(1)">a</a><a href="/x">b</a><a href="https://ok.pl/a">c</a>');
    const [a, b, c] = Array.from(doc.querySelectorAll("a"));
    expect(a.hasAttribute("href")).toBe(false);
    expect(b.hasAttribute("href")).toBe(false);
    expect(c.getAttribute("href")).toBe("https://ok.pl/a");
    expect(c.getAttribute("target")).toBe("_blank");
    expect(c.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("obraz data:image/svg+xml jest usuwany", () => {
    const { doc } = body('<img src="data:image/svg+xml;base64,PHN2Zz4=">');
    expect(doc.querySelector("img")).toBeNull();
  });
});

describe("prepareEmailHtml – obrazy", () => {
  it("cid: zastępowany adresem data: z mapy obrazów osadzonych; nieznany cid usuwany", () => {
    const { doc } = body('<img src="cid:logo@x"><img src="cid:brak">', {
      showRemoteImages: false,
      inlineImages: { "logo@x": PNG },
    });
    const imgs = doc.querySelectorAll("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute("src")).toBe(PNG);
  });

  it("zdalne obrazy są ukryte i liczone, dopóki użytkownik ich nie pokaże", () => {
    const { doc, out } = body('<img src="https://track.example/p.gif"><img src="http://cdn.example/a.png">');
    expect(out.blockedImages).toBe(2);
    for (const img of Array.from(doc.querySelectorAll("img"))) {
      expect(img.hasAttribute("src")).toBe(false);
    }
  });

  it("po zgodzie zdalne obrazy idą przez proxy aplikacji (CSP)", () => {
    const { doc, out } = body('<img src="https://cdn.example/a.png">', { showRemoteImages: true });
    expect(out.blockedImages).toBe(0);
    expect(doc.querySelector("img")?.getAttribute("src")).toBe(remoteImageUrl("https://cdn.example/a.png"));
    expect(remoteImageUrl("https://a.pl/x?y=1&z=2")).toBe("/api/mail/image?u=https%3A%2F%2Fa.pl%2Fx%3Fy%3D1%26z%3D2");
  });
});

describe("prepareEmailHtml – układ", () => {
  it("dokument ma CSS ograniczający szerokość obrazów i tabel oraz zawijanie długich ciągów", () => {
    const { out } = body("<table width='900'><tr><td>x</td></tr></table>");
    expect(out.document).toContain("img{max-width:100%!important");
    expect(out.document).toContain("table{max-width:100%!important}");
    expect(out.document).toContain("overflow-wrap:anywhere");
    expect(out.document).toContain('<base target="_blank">');
  });
});
