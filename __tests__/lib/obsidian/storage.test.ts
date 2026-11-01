// __tests__/lib/obsidian/storage.test.ts

import { describe, it, expect, vi } from "vitest";
import { createGoogleDriveVault, createOneDriveVault, VaultStorageError } from "@/lib/obsidian/storage";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("OneDrive (folder aplikacji)", () => {
  const ROOT = { id: "root", name: "dzisiaj.fun", parentReference: { path: "/drive/root:/Aplikacje" } };

  it("lista: ścieżki względne, stronicowanie delta, pomija usunięte, foldery i pliki inne niż .md", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/special/approot")) return json(ROOT);
      if (url.endsWith("/special/approot/delta"))
        return json({
          value: [
            {
              id: "1",
              name: "Lista.md",
              file: {},
              parentReference: { path: "/drive/root:/Aplikacje/dzisiaj.fun/Notatki/Dom" },
            },
            { id: "2", name: "Notatki", folder: {}, parentReference: { path: "/drive/root:/Aplikacje/dzisiaj.fun" } },
            { id: "3", name: "obraz.png", file: {}, parentReference: { path: "/drive/root:/Aplikacje/dzisiaj.fun" } },
          ],
          "@odata.nextLink": "https://graph.microsoft.com/next",
        });
      return json({
        value: [
          {
            id: "4",
            name: "Zupa%20pomidorowa.md".replace("%20", " "),
            file: {},
            parentReference: { path: "/drive/root:/Aplikacje/dzisiaj.fun/Przepisy" },
          },
          {
            id: "5",
            name: "stary.md",
            file: {},
            deleted: {},
            parentReference: { path: "/drive/root:/Aplikacje/dzisiaj.fun" },
          },
        ],
      });
    });
    const files = await createOneDriveVault("T", fetchMock).list();
    expect(files).toEqual([
      { fileId: "1", path: "Notatki/Dom/Lista.md" },
      { fileId: "4", path: "Przepisy/Zupa pomidorowa.md" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("zapis nowego pliku po ścieżce (segmenty kodowane) i istniejącego po identyfikatorze", async () => {
    const fetchMock = vi.fn(async () => json({ id: "nowy" }));
    const vault = createOneDriveVault("T", fetchMock);
    expect(await vault.write("Notatki/Dom i ogród/Lista.md", "x", null)).toBe("nowy");
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toContain(
      "/special/approot:/Notatki/Dom%20i%20ogr%C3%B3d/Lista.md:/content"
    );
    await vault.write("ignorowana", "y", "abc");
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toContain("/items/abc/content");
    expect(init.method).toBe("PUT");
  });

  it("błąd HTTP: VaultStorageError z kodem", async () => {
    const vault = createOneDriveVault("T", async () => new Response("", { status: 403 }));
    await expect(vault.read("x")).rejects.toBeInstanceOf(VaultStorageError);
  });
});

describe("Google Drive", () => {
  it("lista rekurencyjna z folderu dzisiaj.fun", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const query = decodeURIComponent(new URL(url).searchParams.get("q") ?? "");
      if (query.startsWith("name = 'dzisiaj.fun'")) return json({ files: [{ id: "root" }] });
      if (query.includes("'root' in parents and trashed"))
        return json({ files: [{ id: "n", name: "Notatki", mimeType: "application/vnd.google-apps.folder" }] });
      if (query.includes("'n' in parents"))
        return json({
          files: [
            { id: "f1", name: "Lista.md", mimeType: "text/markdown" },
            { id: "x", name: "a.pdf", mimeType: "application/pdf" },
          ],
        });
      return json({ files: [] });
    });
    expect(await createGoogleDriveVault("T", fetchMock).list()).toEqual([{ fileId: "f1", path: "Notatki/Lista.md" }]);
  });

  it("zapis nowego pliku tworzy brakujące foldery; istniejący plik aktualizowany po identyfikatorze", async () => {
    const created: string[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url.endsWith("/drive/v3/files")) {
        const name = (JSON.parse(init.body as string) as { name: string }).name;
        created.push(name);
        return json({ id: `id-${name}` });
      }
      if (init?.method === "POST") return json({ id: "plik" });
      if (init?.method === "PATCH") return json({ id: "abc" });
      return json({ files: [] });
    });
    const vault = createGoogleDriveVault("T", fetchMock);
    expect(await vault.write("Notatki/Dom/Lista.md", "treść", null)).toBe("plik");
    expect(created).toEqual(["dzisiaj.fun", "Notatki", "Dom"]);
    expect(await vault.write("x", "y", "abc")).toBe("abc");
    const patch = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit | undefined)?.method === "PATCH"
    ) as unknown as [string];
    expect(patch[0]).toContain("/upload/drive/v3/files/abc?uploadType=media");
  });
});
