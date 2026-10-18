// __tests__/lib/rss.test.ts

import { describe, it, expect } from "vitest";
import { parseFeed, stripHtml, checkPublicUrl } from "@/lib/server/rss";
import { RSS_SOURCES, resolveEnabledSources, normalizeCustomFeeds, defaultEnabledSources } from "@/config/rssSources";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>
<item><title>Zmiana tras &amp; objazdy</title><link>https://ztm.example/a</link>
<pubDate>Sat, 10 Oct 2026 08:00:00 +0200</pubDate><description><![CDATA[<p>Od <b>poniedziałku</b>&nbsp;tramwaje…</p>]]></description></item>
<item><title>Bez linku</title></item>
<item><title>Zły link</title><link>javascript:alert(1)</link></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>A</title>
<entry><title>Atom wpis</title><link rel="alternate" href="/post/1"/><updated>2026-10-09T10:00:00Z</updated><summary>Krótko</summary></entry>
</feed>`;

describe("parseFeed", () => {
  it("RSS 2.0: tytuł, link, data, oczyszczony opis; odrzuca złe linki", () => {
    const items = parseFeed(RSS, "https://ztm.example/rss");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Zmiana tras & objazdy");
    expect(items[0].published).toBe("2026-10-10T06:00:00.000Z");
    expect(items[0].summary).toBe("Od poniedziałku tramwaje…");
  });

  it("Atom: link względny rozwiązany względem kanału", () => {
    const [item] = parseFeed(ATOM, "https://blog.example/feed");
    expect(item.link).toBe("https://blog.example/post/1");
  });

  it("odrzuca stronę HTML i deklaracje encji", () => {
    expect(() => parseFeed("<html><body>RSS</body></html>", "https://x.example")).toThrow(/RSS ani Atom/);
    expect(() =>
      parseFeed('<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><rss/>', "https://x.example")
    ).toThrow(/encji/);
  });

  it("stripHtml dekoduje encje liczbowe", () => {
    expect(stripHtml("a&#8211;b &#x2014; <i>c</i>")).toBe("a–b — c");
  });
});

describe("kontrola adresów własnych kanałów", () => {
  it("blokuje adresy prywatne i nie-http", async () => {
    expect(await checkPublicUrl("http://127.0.0.1/feed")).toMatch(/Niedozwolony/);
    expect(await checkPublicUrl("http://192.168.1.10/feed")).toMatch(/Niedozwolony/);
    expect(await checkPublicUrl("http://[::1]/feed")).toMatch(/Niedozwolony/);
    expect(await checkPublicUrl("http://localhost/feed")).toMatch(/Niedozwolony/);
    expect(await checkPublicUrl("file:///etc/passwd")).toMatch(/http/);
    expect(await checkPublicUrl("https://x.example:8443/feed")).toMatch(/port/);
  });
});

describe("źródła", () => {
  it("unikalne id i adresy https", () => {
    expect(new Set(RSS_SOURCES.map((s) => s.id)).size).toBe(RSS_SOURCES.length);
    expect(RSS_SOURCES.every((s) => s.url.startsWith("https://"))).toBe(true);
  });
  it("wiadomości z Polski domyślnie wyłączone, reszta włączona", () => {
    const defaults = new Set(defaultEnabledSources());
    for (const s of RSS_SOURCES) expect(defaults.has(s.id)).toBe(s.group !== "Wiadomości z Polski");
  });
  it("zapis użytkownika: tylko znane id; brak zapisu = domyślne", () => {
    expect(resolveEnabledSources(["tvn24", "nieznane", "c_1"], ["c_1"])).toEqual(["tvn24", "c_1"]);
    expect(resolveEnabledSources(null)).toEqual(defaultEnabledSources());
    expect(
      normalizeCustomFeeds([
        { id: "c_1", name: "X", url: "ftp://x" },
        { id: "c_2", name: "Y", url: "https://y.example/feed" },
      ])
    ).toHaveLength(1);
  });
});
