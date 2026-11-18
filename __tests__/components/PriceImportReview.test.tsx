// __tests__/components/PriceImportReview.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PriceImportReview from "@/components/settings/PriceImportReview";
import type { ReviewRow, ReviewSession } from "@/lib/prices/importPlan";
import { nameKey } from "@/lib/prices/text";
import type { ProductPrice } from "@/types/prices";

const row = (overrides: Partial<ReviewRow>): ReviewRow => ({
  id: "r1",
  include: true,
  store: "lidl",
  rawName: "Mleko UHT",
  name: "Mleko",
  unit: "litr",
  price: 3,
  priceEdited: false,
  decision: "keep",
  flags: [],
  source: null,
  ...overrides,
});

const session = (rows: ReviewRow[], totalMismatch = false): ReviewSession => ({
  id: "s1",
  kind: "receipt",
  title: "Lidl, 2026-10-19: paragon",
  rows,
  notes: [],
  totalMismatch,
  fingerprint: "a".repeat(64),
});

const catalog: ProductPrice[] = [
  { id: "1", user_id: "u", name: "Mleko", name_key: nameKey("Mleko"), unit: "litr", avg_price: 3, occurrences: 4 },
];

const renderReview = (s: ReviewSession, onConfirm = vi.fn()) => {
  render(
    <PriceImportReview
      session={s}
      catalog={catalog}
      nameOptions={["Mleko"]}
      busy={false}
      onConfirm={onConfirm}
      onCancel={vi.fn()}
    />
  );
  return onConfirm;
};

describe("PriceImportReview", () => {
  it("zatwierdza kompletne wiersze i przekazuje skrót paragonu", async () => {
    const onConfirm = renderReview(session([row({})]));
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ name: "Mleko", price: 3 })], "a".repeat(64));
  });

  it("blokuje zapis, gdy wiersz nie ma jednostki, dopóki go nie uzupełnisz lub odznaczysz", async () => {
    renderReview(session([row({ unit: null, flags: ["Wybierz jednostkę."] })]));
    const save = screen.getByRole("button", { name: "Zapisz" });
    expect(save).toBeDisabled();
    await userEvent.click(screen.getByLabelText("Uwzględnij: Mleko UHT"));
    expect(screen.getByText(/Do zapisu: 0/)).toBeInTheDocument();
  });

  it("niezgodna suma paragonu wymaga osobnego potwierdzenia", async () => {
    renderReview(session([row({})], true));
    const save = screen.getByRole("button", { name: "Zapisz" });
    expect(save).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/Sprawdziłem pozycje/));
    expect(save).toBeEnabled();
  });

  it("zmiana ceny powyżej 20% pokazuje wybór decyzji z domyślnym „Nie aktualizuj”", () => {
    renderReview(session([row({ price: 6 })]));
    expect(screen.getByText(/różni się o 100% od średniej 3,00 zł/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Co zrobić z ceną/)).toHaveValue("keep");
  });

  it("zmiana jednostki przelicza cenę z danych paragonu, dopóki nie wpisano jej ręcznie", async () => {
    const source = { quantity: 1, weighed: false, netValue: 5.99, packSize: { amount: 0.5, unit: "kg" as const } };
    renderReview(session([row({ unit: null, price: 5.99, source, name: "Brokuły" })]));
    await userEvent.selectOptions(screen.getByLabelText("Jednostka: Mleko UHT"), "kg");
    expect(screen.getByLabelText("Cena za jednostkę: Mleko UHT")).toHaveValue(11.98);
  });
});
