// __tests__/components/ProductPriceCatalog.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductPriceCatalog from "@/components/settings/ProductPriceCatalog";
import { nameKey } from "@/lib/prices/text";
import type { ProductPrice } from "@/types/prices";

const prices: ProductPrice[] = [
  { id: "1", user_id: "u", name: "Mleko", name_key: nameKey("Mleko"), unit: "litr", avg_price: 3.5, occurrences: 4 },
  { id: "2", user_id: "u", name: "Chleb", name_key: nameKey("Chleb"), unit: "szt.", avg_price: 4.99, occurrences: 2 },
];

const renderCatalog = () =>
  render(
    <ProductPriceCatalog
      prices={prices}
      nameOptions={[]}
      onSave={vi.fn(async () => true)}
      onRemove={vi.fn(async () => true)}
    />
  );

describe("ProductPriceCatalog", () => {
  it("jest domyślnie zwinięty i pokazuje liczbę produktów w nagłówku", () => {
    renderCatalog();
    const details = screen.getByText("Katalog cen produktów (2)").closest("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
  });

  it("rozwija się po kliknięciu nagłówka i pokazuje listę z cenami za jednostkę", async () => {
    renderCatalog();
    await userEvent.click(screen.getByText("Katalog cen produktów (2)"));
    expect(screen.getByText("Katalog cen produktów (2)").closest("details")).toHaveAttribute("open");
    expect(screen.getByText("3,50 zł / litr")).toBeVisible();
  });
});
