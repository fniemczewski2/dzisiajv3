// __tests__/lib/obsidianTasks.test.ts

import { describe, it, expect } from "vitest";
import { parseTaskLine, readObsidianTasks, taskToLine, dayPlanMarkdown } from "@/lib/obsidianTasks";

const TODAY = "2026-11-19";

describe("parseTaskLine", () => {
  it("czyta tytuł, termin, priorytet i kategorię w formacie Tasks", () => {
    expect(parseTaskLine("- [ ] Wysłać sprawozdanie 📅 2026-11-25 ⏫ #Zapłon", TODAY)).toEqual({
      title: "Wysłać sprawozdanie",
      due_date: "2026-11-25",
      priority: 2,
      category: "Zapłon",
    });
  });

  it("bez terminu i priorytetu – dziś i priorytet 3", () => {
    expect(parseTaskLine("- [ ] Zadzwonić", TODAY)).toEqual({
      title: "Zadzwonić",
      due_date: TODAY,
      priority: 3,
      category: null,
    });
  });

  it("pomija ukończone, puste i zwykły tekst bez treści", () => {
    expect(parseTaskLine("- [x] Zrobione", TODAY)).toBeNull();
    expect(parseTaskLine("- [ ] 📅 2026-11-20", TODAY)).toBeNull();
    expect(parseTaskLine("", TODAY)).toBeNull();
  });

  it("usuwa pozostałe znaczniki Tasks i odrzuca nieprawidłową datę", () => {
    const d = parseTaskLine("- [ ] Raport ➕ 2026-11-01 ⏳ 2026-11-02 📅 2026-02-31 ⏬", TODAY);
    expect(d).toEqual({ title: "Raport", due_date: TODAY, priority: 5, category: null });
  });

  it("akceptuje linię bez pola wyboru", () => {
    expect(parseTaskLine("Kupić znaczki 🔺", TODAY)?.priority).toBe(1);
  });
});

describe("readObsidianTasks", () => {
  it("text i tasks", () => {
    expect(readObsidianTasks({ text: "- [ ] A\n- [x] B\n- [ ] C" }, TODAY)).toHaveLength(2);
    expect(readObsidianTasks({ tasks: ["- [ ] A"] }, TODAY)).toHaveLength(1);
  });

  it("błędy", () => {
    expect(readObsidianTasks({}, TODAY)).toEqual({ error: "Brak pola „text” albo „tasks”." });
    expect(readObsidianTasks({ text: "- [x] A" }, TODAY)).toEqual({ error: "Brak zadań do dodania." });
    const many = Array.from({ length: 31 }, (_, i) => `- [ ] Z${i}`).join("\n");
    expect(readObsidianTasks({ text: many }, TODAY)).toEqual({ error: "Za dużo zadań w jednym żądaniu." });
  });
});

describe("Markdown planu dnia", () => {
  it("taskToLine – odwrotność parseTaskLine", () => {
    const line = taskToLine({
      title: "Raport",
      due_date: "2026-11-20",
      priority: 2,
      status: "pending",
      category: "UWr",
    });
    expect(line).toBe("- [ ] Raport ⏫ 📅 2026-11-20 #UWr");
    expect(parseTaskLine(line, TODAY)).toEqual({
      title: "Raport",
      due_date: "2026-11-20",
      priority: 2,
      category: "UWr",
    });
  });

  it("dayPlanMarkdown sortuje wydarzenia i zadania", () => {
    const md = dayPlanMarkdown(
      TODAY,
      [
        { title: "Zarząd", start_time: "2026-11-19T18:00:00+00", end_time: "2026-11-19T19:00:00+00", place: null },
        { title: "Biuro", start_time: "2026-11-19T09:00:00+00", end_time: "2026-11-19T17:00:00+00", place: "Poznań" },
      ] as never,
      [
        { title: "B", due_date: TODAY, priority: 4, status: "pending", category: "" },
        { title: "A", due_date: TODAY, priority: 1, status: "done", category: "" },
      ] as never
    );
    expect(md).toContain("- 09:00–17:00 Biuro (Poznań)\n- 18:00–19:00 Zarząd");
    expect(md.indexOf("- [x] A")).toBeLessThan(md.indexOf("- [ ] B"));
  });
});
