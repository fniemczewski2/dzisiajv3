// __tests__/lib/reportExport.test.ts

import { describe, it, expect } from "vitest";
import {
  buildReportMarkdown,
  buildReportDocDefinition,
  reportFileName,
  reportParticipants,
  formatReportDate,
} from "@/lib/reportExport";
import type { Report } from "@/types/reports";

const report = {
  id: "1", user_id: "u", topic: "Zarząd Fundacji – październik", date: "2026-10-15",
  agenda: ["Budżet", "", "Sprawy różne"],
  participants: ["Anna", "Filip", "Jan", ""],
  tasks: [
    { zadanie: "Sprawozdanie dla NIW", data: "2026-10-31", osoba: "Anna" },
    { zadanie: "Polityka RODO | v2", data: "", osoba: "" },
    { zadanie: "  ", data: "", osoba: "" },
  ],
  notes: "Budżet przyjęty.\nKolejne posiedzenie online.",
  inserted_at: "", updated_at: "",
} as Report;

describe("eksport protokołu", () => {
  it("Markdown ma dotychczasową kolejność sekcji i pomija puste wpisy", () => {
    const md = buildReportMarkdown(report);
    const order = ["# Zarząd Fundacji", "## Agenda", "## Obecni", "## Ustalenia i zadania", "## Notatki"].map((h) => md.indexOf(h));
    expect(order.every((pos, i) => pos >= 0 && (i === 0 || pos > order[i - 1]))).toBe(true);
    expect(md).toContain("**Data spotkania:** 15.10.2026");
    expect(md).toContain("1. Budżet\n2. Sprawy różne");
    expect(md).toContain("- **Moderacja:** Anna\n- **Protokół:** Filip\n- Jan");
    expect(md).toContain("| 1 | Sprawozdanie dla NIW | 31.10.2026 | Anna |");
    expect(md).toContain("Polityka RODO \\| v2 | — | — |"); // znak | nie łamie tabeli
    expect(md).not.toContain("| 3 |"); // puste zadanie pominięte
    expect(md).toContain("Budżet przyjęty.  \nKolejne"); // twarde złamanie linii
  });

  it("puste sekcje mają czytelny opis", () => {
    const md = buildReportMarkdown({ ...report, agenda: [], participants: [], tasks: [], notes: "" });
    expect(md).toContain("_Brak punktów agendy._");
    expect(md).toContain("_Brak zadań._");
    expect(md).toContain("_Brak notatek._");
  });

  it("role: pierwsza osoba moderuje, druga protokołuje", () => {
    expect(reportParticipants(report).map((p) => p.role)).toEqual(["Moderacja", "Protokół", null]);
  });

  it("PDF: tabela zadań tylko z wpisanymi zadaniami, stopka z numerem strony", () => {
    const def = buildReportDocDefinition(report);
    const json = JSON.stringify(def.content);
    expect(json).toContain("Sprawozdanie dla NIW");
    expect(json).toContain("31.10.2026");
    expect(json).not.toContain("\"3\""); // brak trzeciego (pustego) wiersza zadania
    const footer = def.footer(2, 3) as { columns: Array<{ text: string }> };
    expect(footer.columns[1].text).toBe("2 / 3");
    expect(def.info.title).toBe("Protokół – Zarząd Fundacji – październik");
  });

  it("nazwa pliku bez polskich znaków", () => {
    expect(reportFileName(report, "pdf")).toBe("protokol-2026-10-15-zarzad-fundacji-pazdziernik.pdf");
    expect(reportFileName({ ...report, topic: "" }, "md")).toBe("protokol-2026-10-15-spotkanie.md");
    expect(formatReportDate("2026-01-05")).toBe("05.01.2026");
  });
});
