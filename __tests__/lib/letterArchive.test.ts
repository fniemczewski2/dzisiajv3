// __tests__/lib/letterArchive.test.ts

import { describe, it, expect, vi, afterEach } from "vitest";
import { unzipSync, strToU8 } from "fflate";
import { archiveEntryPaths, archiveFileName, buildLetterArchive, downloadBlob, safeName } from "@/lib/letterArchive";

describe("safeName", () => {
  it("zamienia znaki niedozwolone w nazwach plików na _", () => {
    expect(safeName('a/b\\c:d*e?f"g<h>i|j')).toBe("a_b_c_d_e_f_g_h_i_j");
  });

  it("usuwa kropki i spacje na początku i końcu oraz ogranicza długość", () => {
    expect(safeName("  .plik.  ")).toBe("plik");
    expect(safeName("x".repeat(200), 50)).toHaveLength(50);
  });

  it("pusta nazwa daje zastępczą", () => {
    expect(safeName("   ")).toBe("plik");
  });
});

describe("archiveEntryPaths", () => {
  it("numeruje osobno pisma i odpowiedzi i wkłada je do właściwych podfolderów", () => {
    const paths = archiveEntryPaths([
      { kind: "letter", file_name: "wniosek.pdf" },
      { kind: "response", file_name: "odpowiedz.PDF" },
      { kind: "letter", file_name: "zalacznik.pdf" },
    ]);
    expect(paths).toEqual(["pismo/01_wniosek.pdf", "odpowiedz/01_odpowiedz.pdf", "pismo/02_zalacznik.pdf"]);
  });

  it("identyczne nazwy nie kolidują dzięki numerom", () => {
    const paths = archiveEntryPaths([
      { kind: "letter", file_name: "a.pdf" },
      { kind: "letter", file_name: "a.pdf" },
    ]);
    expect(new Set(paths).size).toBe(2);
  });
});

describe("buildLetterArchive", () => {
  it("tworzy jeden katalog o nazwie sygnatury z plikami w środku", () => {
    const zip = buildLetterArchive("….05.2026.U", [
      { path: "pismo/01_a.pdf", data: strToU8("PDF-A") },
      { path: "odpowiedz/01_b.pdf", data: strToU8("PDF-B") },
    ]);
    const entries = unzipSync(zip);
    const names = Object.keys(entries).sort();
    expect(names).toEqual(["….05.2026.U/odpowiedz/01_b.pdf", "….05.2026.U/pismo/01_a.pdf"]);
    expect(new TextDecoder().decode(entries["….05.2026.U/pismo/01_a.pdf"])).toBe("PDF-A");
    expect(new TextDecoder().decode(entries["….05.2026.U/odpowiedz/01_b.pdf"])).toBe("PDF-B");
  });

  it("bez plików zwraca poprawne, puste archiwum", () => {
    expect(Object.keys(unzipSync(buildLetterArchive("S", [])))).toEqual([]);
  });
});

describe("archiveFileName", () => {
  it("nazwa ZIP pochodzi z sygnatury i jest bezpieczna", () => {
    expect(archiveFileName("….05.2026.U/1")).toBe("….05.2026.U_1.zip");
  });
});

describe("downloadBlob", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("uruchamia pobieranie z podaną nazwą pliku", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadBlob(new Blob(["x"], { type: "application/zip" }), "sygnatura.zip");

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });
});
