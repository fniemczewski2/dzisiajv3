// components/settings/ProductPricesSection.tsx
//
// Ceny produktów: import z CSV (nazwa, jednostka, cena) i z paragonów Lidl oraz Biedronki (zdjęcie lub PDF),
// weryfikacja przed zapisem i ręczna edycja katalogu. Tekst z paragonu jest rozpoznawany w przeglądarce; na serwer
// trafiają tylko zatwierdzone pozycje, średnie ceny i skrót paragonu (blokada ponownego importu).

import React, { useCallback, useId, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { MAX_RECEIPT_FILES, PRICE_CSV_MAX_BYTES, RECEIPT_FILE_MAX_BYTES } from "@/config/limits";
import { useProductPrices } from "@/hooks/db/useProductPrices";
import { useRecipes } from "@/hooks/db/useRecipes";
import { useToast } from "@/providers/ToastProvider";
import { parsePriceCsv } from "@/lib/prices/csv";
import { receiptFingerprint } from "@/lib/prices/fingerprint";
import {
  buildChanges,
  buildCsvRows,
  buildReceiptRows,
  type CatalogContext,
  type ReviewRow,
  type ReviewSession,
} from "@/lib/prices/importPlan";
import { suggestionNames } from "@/lib/prices/lookup";
import type { OcrProgress } from "@/lib/prices/ocr";
import { parseReceiptText } from "@/lib/prices/receiptParser";
import { STORE_LABELS } from "@/types/prices";
import PriceImportReview from "./PriceImportReview";
import ProductPriceCatalog from "./ProductPriceCatalog";

const BUTTON_CLASS =
  "font-semibold px-4 py-2 w-full bg-surface hover:bg-surface-hover text-text-secondary rounded-lg flex justify-center items-center gap-2 border border-line transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer";

const STAGE_LABELS: Record<OcrProgress["stage"], string> = {
  load: "Ładowanie silnika rozpoznawania tekstu",
  render: "Rysowanie stron PDF",
  recognize: "Rozpoznawanie tekstu",
};

let sessionCounter = 0;
const nextSessionId = () => `session-${(sessionCounter += 1)}`;

const isAllowedReceipt = (file: File) =>
  file.type.startsWith("image/") || file.type === "application/pdf" || /\.pdf$/i.test(file.name);

export default function ProductPricesSection() {
  const { toast } = useToast();
  const { prices, aliases, fetching, savePrice, removePrice, commitChanges } = useProductPrices();
  const { products: recipeProducts } = useRecipes();
  const csvInputId = useId();
  const receiptInputId = useId();
  const csvRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLInputElement>(null);

  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameOptions = useMemo(() => suggestionNames(prices, recipeProducts), [prices, recipeProducts]);
  const context: CatalogContext = useMemo(
    () => ({ catalog: prices, aliases, recipeProducts }),
    [prices, aliases, recipeProducts]
  );
  const current = sessions[0];

  const handleCsv = useCallback(
    async (file: File) => {
      if (file.size > PRICE_CSV_MAX_BYTES) {
        toast.error("Plik CSV jest za duży (limit 1 MB).");
        return;
      }
      const { rows, skipped, withoutUnit } = parsePriceCsv(await file.text());
      if (rows.length === 0) {
        toast.error("W pliku nie znaleziono produktów. Oczekiwane kolumny: nazwa, jednostka, cena.");
        return;
      }
      const notes = [`Wczytano ${rows.length} produktów z pliku ${file.name}.`];
      if (withoutUnit > 0) notes.push(`Produkty bez jednostki w pliku: ${withoutUnit} (wybierz jednostkę).`);
      if (skipped.length > 0) {
        notes.push(
          `Pominięte wiersze: ${skipped.length} (${skipped
            .slice(0, 3)
            .map((s) => `${s.line}: ${s.reason}`)
            .join("; ")}).`
        );
      }
      setSessions((prev) => [
        ...prev,
        {
          id: nextSessionId(),
          kind: "csv",
          title: `Import cen z CSV: ${file.name}`,
          rows: buildCsvRows(rows, context),
          notes,
          totalMismatch: false,
        },
      ]);
    },
    [context, toast]
  );

  const handleReceipts = useCallback(
    async (files: File[]) => {
      const valid = files.filter(isAllowedReceipt).slice(0, MAX_RECEIPT_FILES);
      if (files.length > MAX_RECEIPT_FILES) toast.info(`Wczytuję pierwsze ${MAX_RECEIPT_FILES} plików.`);
      const accepted = valid.filter((file) => file.size <= RECEIPT_FILE_MAX_BYTES);
      if (accepted.length < valid.length) toast.error("Pominięto pliki większe niż 10 MB.");
      if (accepted.length === 0) {
        toast.error("Wybierz zdjęcia lub pliki PDF paragonów.");
        return;
      }

      setBusy(true);
      try {
        const { recognizeReceipts } = await import("@/lib/prices/ocr");
        const results = await recognizeReceipts(accepted, (progress) => {
          const percent = progress.fraction === undefined ? "" : ` ${Math.round(progress.fraction * 100)}%`;
          setStatus(
            `${STAGE_LABELS[progress.stage]}: ${progress.fileName} (${progress.index}/${progress.total})${percent}`
          );
        });

        const created: ReviewSession[] = [];
        for (const { fileName, text } of results) {
          const receipt = parseReceiptText(text);
          if (!receipt || receipt.items.length === 0) {
            toast.error(`${fileName}: nie rozpoznano paragonu (obsługiwane sklepy: Lidl, Biedronka).`);
            continue;
          }
          created.push({
            id: nextSessionId(),
            kind: "receipt",
            title: `${STORE_LABELS[receipt.store]}${receipt.date ? `, ${receipt.date}` : ""}: ${fileName}`,
            rows: buildReceiptRows(receipt, context),
            notes: [
              `Odczytano ${receipt.items.length} pozycji; suma pozycji ${receipt.itemsSum.toFixed(2).replace(".", ",")} zł` +
                (receipt.total === null
                  ? ", nie odczytano sumy paragonu."
                  : `, suma paragonu ${receipt.total.toFixed(2).replace(".", ",")} zł.`),
            ],
            totalMismatch: receipt.totalMismatch,
            fingerprint: await receiptFingerprint(receipt),
          });
        }
        if (created.length > 0) setSessions((prev) => [...prev, ...created]);
      } catch (err) {
        toast.error("Nie udało się odczytać paragonu. Sprawdź połączenie i spróbuj ponownie.", { cause: err });
      } finally {
        setStatus(null);
        setBusy(false);
      }
    },
    [context, toast]
  );

  const confirm = async (session: ReviewSession, rows: ReviewRow[], fingerprint?: string) => {
    setBusy(true);
    try {
      const changes = buildChanges(rows, prices);
      const result = await commitChanges(changes, fingerprint);
      if (result === "saved") {
        toast.success(
          `Zapisano ceny: ${changes.upserts.length}${changes.skipped ? `, pominięto: ${changes.skipped}` : ""}.`
        );
      } else if (result === "duplicate") {
        toast.error("Ten paragon został już zaimportowany, więc nie zmieniam cen.");
      } else {
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card mb-4 p-4 transition-colors sm:p-6" id="ceny" aria-labelledby="ceny-heading">
      <div className="mb-2 flex items-center gap-3 text-text">
        <h3 id="ceny-heading" className="text-lg font-bold">
          Ceny produktów
        </h3>
      </div>
      <p className="mb-4 text-sm text-text-secondary">
        Ceny podpowiadane przy pozycjach list zakupów. Wczytaj paragon (zdjęcie lub PDF z Lidla albo Biedronki) albo
        plik CSV z kolumnami: nazwa, jednostka, cena. Tekst z paragonu jest rozpoznawany w Twojej przeglądarce;
        zapisujemy tylko pozycje i średnie ceny po rabatach, nie pliki.
      </p>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          ref={csvRef}
          id={csvInputId}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleCsv(file);
          }}
        />
        <button
          type="button"
          className={BUTTON_CLASS}
          disabled={busy || fetching}
          onClick={() => csvRef.current?.click()}
        >
          Importuj plik CSV
        </button>
        <input
          ref={receiptRef}
          id={receiptInputId}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length > 0) void handleReceipts(files);
          }}
        />
        <button
          type="button"
          className={BUTTON_CLASS}
          disabled={busy || fetching}
          onClick={() => receiptRef.current?.click()}
        >
          {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          Wczytaj paragony
        </button>
      </div>

      {status && (
        <output className="mb-3 block text-sm text-text-secondary" aria-live="polite">
          {status}
        </output>
      )}

      {current && (
        <>
          {sessions.length > 1 && (
            <p className="mb-2 text-xs text-text-secondary">Kolejne w kolejce: {sessions.length - 1}</p>
          )}
          <PriceImportReview
            key={current.id}
            session={current}
            catalog={prices}
            nameOptions={nameOptions}
            busy={busy}
            onConfirm={(rows, fingerprint) => void confirm(current, rows, fingerprint)}
            onCancel={() => setSessions((prev) => prev.filter((s) => s.id !== current.id))}
          />
        </>
      )}

      <ProductPriceCatalog prices={prices} nameOptions={nameOptions} onSave={savePrice} onRemove={removePrice} />
    </section>
  );
}
