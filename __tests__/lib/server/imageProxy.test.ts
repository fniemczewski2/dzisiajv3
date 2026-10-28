// __tests__/lib/server/imageProxy.test.ts

import { describe, it, expect, vi } from "vitest";
import { fetchRemoteImage, isPublicAddress, parseImageUrl } from "@/lib/server/imageProxy";

const PUBLIC = async () => ["93.184.216.34"];

describe("isPublicAddress", () => {
  it.each([
    ["8.8.8.8", true],
    ["2001:4860:4860::8888", true],
    ["10.1.2.3", false],
    ["172.16.0.1", false],
    ["192.168.1.1", false],
    ["127.0.0.1", false],
    ["169.254.169.254", false],
    ["100.64.0.1", false],
    ["0.0.0.0", false],
    ["::1", false],
    ["fd00::1", false],
    ["fe80::1", false],
    ["::ffff:127.0.0.1", false],
    ["nie-ip", false],
  ])("%s → %s", (address, expected) => {
    expect(isPublicAddress(address)).toBe(expected);
  });
});

describe("parseImageUrl", () => {
  it("przyjmuje http(s) na domyślnych portach", () => {
    expect(parseImageUrl("https://cdn.example/a.png")?.hostname).toBe("cdn.example");
  });
  it.each([
    "ftp://a.pl/x.png",
    "file:///etc/passwd",
    "https://a.pl:8080/x.png",
    "https://user:pass@a.pl/x.png",
    "http://localhost/x.png",
    "http://127.0.0.1/x.png",
    "http://[::1]/x.png",
    "http://metadata.internal/x",
    "nie adres",
    "",
  ])("odrzuca %s", (raw) => {
    expect(parseImageUrl(raw)).toBeNull();
  });
});

function img(type = "image/png", bytes = 4, extra: Record<string, string> = {}) {
  return new Response(new Uint8Array(bytes), { status: 200, headers: { "content-type": type, ...extra } });
}

describe("fetchRemoteImage", () => {
  it("zwraca obraz z publicznego hosta", async () => {
    const res = await fetchRemoteImage(new URL("https://cdn.example/a.png"), {
      fetchImpl: vi.fn(async () => img()),
      resolve: PUBLIC,
    });
    expect(res).toMatchObject({ ok: true, contentType: "image/png" });
  });

  it("host rozwiązywany na adres prywatny jest blokowany (DNS)", async () => {
    const fetchImpl = vi.fn();
    const res = await fetchRemoteImage(new URL("https://evil.example/a.png"), {
      fetchImpl,
      resolve: async () => ["10.0.0.5"],
    });
    expect(res).toMatchObject({ ok: false, status: 403 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("przekierowanie na adres wewnętrzny jest blokowane", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } })
    );
    const res = await fetchRemoteImage(new URL("https://cdn.example/a.png"), { fetchImpl, resolve: PUBLIC });
    expect(res).toMatchObject({ ok: false, status: 403 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("SVG i inne typy spoza listy są odrzucane", async () => {
    const res = await fetchRemoteImage(new URL("https://cdn.example/a.svg"), {
      fetchImpl: async () => img("image/svg+xml"),
      resolve: PUBLIC,
    });
    expect(res).toMatchObject({ ok: false, status: 415 });
  });

  it("obraz ponad limit jest odrzucany (nagłówek i faktyczny rozmiar)", async () => {
    const declared = await fetchRemoteImage(new URL("https://cdn.example/a.png"), {
      fetchImpl: async () => img("image/png", 4, { "content-length": String(6 * 1024 * 1024) }),
      resolve: PUBLIC,
    });
    expect(declared).toMatchObject({ ok: false, status: 413 });
    const actual = await fetchRemoteImage(new URL("https://cdn.example/a.png"), {
      fetchImpl: async () => img("image/png", 5 * 1024 * 1024 + 1),
      resolve: PUBLIC,
    });
    expect(actual).toMatchObject({ ok: false, status: 413 });
  });
});
