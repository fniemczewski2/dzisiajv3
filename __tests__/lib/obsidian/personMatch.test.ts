// __tests__/lib/obsidian/personMatch.test.ts

import { describe, it, expect } from "vitest";
import { findPersonDuplicates, mergePersonChanges, personKey } from "@/lib/obsidian/personMatch";
import type { Person } from "@/types/people";

const person = (over: Partial<Person>): Person => ({
  id: "p1",
  user_id: "u",
  first_name: "Anna",
  last_name: "Nowak",
  relationship: "",
  priority: 2,
  phones: [],
  emails: [],
  notes: "",
  ...over,
});

describe("personKey / findPersonDuplicates", () => {
  it("ignoruje wielkość liter i odstępy, wymaga pełnej zgodności", () => {
    expect(personKey(" ANNA ", "nowak")).toBe("anna nowak");
    const people = [
      person({}),
      person({ id: "p2", first_name: "Anna", last_name: "Nowakowska" }),
      person({ id: "p3" }),
    ];
    expect(findPersonDuplicates({ first_name: "anna", last_name: "Nowak" }, people)).toEqual(["p1", "p3"]);
    expect(findPersonDuplicates({ first_name: "Anna", last_name: "" }, people)).toEqual([]);
    expect(findPersonDuplicates({ first_name: "", last_name: "" }, people)).toEqual([]);
  });
});

describe("mergePersonChanges", () => {
  it("uzupełnia puste pola, sumuje kontakty, dopisuje notatki", () => {
    const app = person({ phones: ["1"], notes: "Z aplikacji", birthday: "1990-01-01" });
    expect(
      mergePersonChanges(app, {
        relationship: "rodzina",
        birthday: "1991-02-02",
        phones: ["1", "2"],
        emails: [],
        notes: "Z vaultu",
      })
    ).toEqual({ relationship: "rodzina", phones: ["1", "2"], notes: "Z aplikacji\n\nZ vaultu" });
  });

  it("brak zmian, gdy plik nie wnosi nic nowego", () => {
    expect(mergePersonChanges(person({ notes: "Ciocia" }), { phones: [], emails: [], notes: "Ciocia" })).toEqual({});
  });
});
