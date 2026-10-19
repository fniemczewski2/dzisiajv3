// components/finance/TransactionsSection.tsx
//
// Wydatki i wpływy miesiąca – w tym samym układzie co „Płatności cykliczne”:
// nagłówek z przyciskiem „Dodaj”, podsumowanie, a niżej karta na każdą
// transakcję (opis i szczegóły po lewej, kwota po prawej, akcje pod spodem).
// Kategorię i powiązanie z płatnością zmienia się po „Edytuj”; sugestie
// automatyczne mają w karcie przyciski „Zatwierdź” i „Odrzuć”.

import React, { useId, useMemo, useState } from "react";
import { Check, Link2, Sparkles, X } from "lucide-react";
import { formatPln, summarizeMonth } from "@/lib/finance";
import TransactionForm from "./TransactionForm";
import CsvImport from "./CsvImport";
import { AddButton, DeleteButton, EditButton, FormButtons } from "../ui/CommonButtons";
import type { BudgetCategory } from "@/types/bills";
import type { FinanceProfile, NewTransaction, RecurringBill, Transaction } from "@/types/finance";

interface Props {
  monthLabel: string;
  monthFrom: string;
  transactions: readonly Transaction[];
  categories: readonly BudgetCategory[];
  categoryNames: ReadonlyMap<string, string>;
  bills: readonly RecurringBill[];
  profiles: readonly FinanceProfile[];
  profileId: string | null;
  onAdd: (tx: NewTransaction) => Promise<unknown>;
  onUpdate: (id: string, patch: Partial<Transaction>) => void;
  onLink: (id: string, billId: string | null) => void;
  onRemove: (id: string) => void;
  csv: Omit<React.ComponentProps<typeof CsvImport>, "categories" | "categoryNames" | "bills" | "profileId">;
  /** Zmiana wartości otwiera formularz (szybka akcja „Dodaj wydatek”). */
  addSignal?: number;
}

const short = (d: string) => d.split("-").reverse().slice(0, 2).join(".");

interface CardProps {
  t: Transaction;
  categories: readonly BudgetCategory[];
  categoryNames: ReadonlyMap<string, string>;
  bills: readonly RecurringBill[];
  billName: ReadonlyMap<string, string>;
  onUpdate: Props["onUpdate"];
  onLink: Props["onLink"];
  onRemove: Props["onRemove"];
}

interface EditorProps {
  t: Transaction;
  categories: readonly BudgetCategory[];
  categoryLabel: string | null;
  bills: readonly RecurringBill[];
  onSave: (patch: Partial<Transaction>, billId: string | null) => void;
  onCancel: () => void;
}

/** Edycja transakcji: nazwa, kwota, data, kategoria i płatność cykliczna. */
function TransactionEditor({ t, categories, categoryLabel, bills, onSave, onCancel }: Readonly<EditorProps>) {
  const id = useId();
  const [description, setDescription] = useState(t.description);
  const [amount, setAmount] = useState(String(t.amount).replace(".", ","));
  const [date, setDate] = useState(t.date);
  const [categoryId, setCategoryId] = useState(t.category_id ?? "");
  const [billId, setBillId] = useState(t.recurring_bill_id ?? "");
  const value = Number.parseFloat(amount.replace(",", "."));
  const valid = Number.isFinite(value) && value >= 0;

  const submit = () => {
    if (!valid) return;
    onSave(
      {
        description: description.trim().slice(0, 300),
        amount: Math.round(value * 100) / 100,
        date,
        category_id: categoryId || null,
      },
      billId || null
    );
  };

  return (
    <div className="mb-3 grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-desc`} className="form-label">
          Nazwa:
        </label>
        <input
          id={`${id}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          className="input-field"
        />
      </div>
      <div>
        <label htmlFor={`${id}-amount`} className="form-label">
          Kwota (zł):
        </label>
        <input
          id={`${id}-amount`}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={!valid}
          aria-describedby={valid ? undefined : `${id}-amount-err`}
          className="input-field"
        />
        {!valid && (
          <p id={`${id}-amount-err`} className="mt-1 text-sm text-danger">
            Wpisz kwotę, np. 19,90.
          </p>
        )}
      </div>
      <div>
        <label htmlFor={`${id}-date`} className="form-label">
          Data:
        </label>
        <input
          id={`${id}-date`}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label htmlFor={`${id}-cat`} className="form-label">
          Kategoria:
        </label>
        <select
          id={`${id}-cat`}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input-field"
        >
          <option value="">Bez kategorii</option>
          {t.category_id && !categories.some((c) => c.id === t.category_id) && (
            <option value={t.category_id}>{categoryLabel}</option>
          )}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {!t.is_income && (
        <div>
          <label htmlFor={`${id}-bill`} className="form-label">
            Połącz z płatnością cykliczną:
          </label>
          <select id={`${id}-bill`} value={billId} onChange={(e) => setBillId(e.target.value)} className="input-field">
            <option value="">Brak powiązania</option>
            {bills.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <FormButtons onClickClose={onCancel} onClickSave={submit} disabled={!valid} />
    </div>
  );
}

function TransactionCard({
  t,
  categories,
  categoryNames,
  bills,
  billName,
  onUpdate,
  onLink,
  onRemove,
}: Readonly<CardProps>) {
  const [editing, setEditing] = useState(false);
  const category = t.category_id ? (categoryNames.get(t.category_id) ?? "Inna kategoria") : null;
  const linkedBill = t.recurring_bill_id ? (billName.get(t.recurring_bill_id) ?? "Płatność") : null;
  const suggested = t.link_status === "suggested" && Boolean(t.recurring_bill_id);
  const title = t.description || (t.is_income ? "Wpływ" : "Wydatek");

  return (
    <>
      {editing ? (
        <TransactionEditor
          t={t}
          categories={categories}
          categoryLabel={category}
          bills={bills}
          onSave={(patch, billId) => {
            onUpdate(t.id, patch);
            const confirmsSuggestion = Boolean(billId) && t.link_status === "suggested";
            if (!t.is_income && (billId !== t.recurring_bill_id || confirmsSuggestion)) onLink(t.id, billId);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <li className="card rounded-card p-4 sm:p-5">
          <div className="mb-2 flex items-start justify-between gap-3 pb-2">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-medium wrap-break-word text-text">{title}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-text-secondary tabular-nums">{short(t.date)}</span>
                {category && (
                  <span className="inline-block rounded-full border px-2 py-0.5 text-center text-xs text-text-secondary">
                    {category}
                  </span>
                )}
                {linkedBill && !suggested && (
                  <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                    <Link2 className="h-3 w-3" aria-hidden="true" /> {linkedBill}
                  </span>
                )}
              </div>
            </div>
            <span className={`shrink-0 text-xl font-bold tabular-nums ${t.is_income ? "text-success" : "text-text"}`}>
              {t.is_income ? "+" : "−"}
              {formatPln(t.amount)}
            </span>
          </div>

          {suggested && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm">
              <Sparkles className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-text">
                Sugestia: to płatność <strong className="font-semibold">{linkedBill}</strong>?
              </span>
              <button
                type="button"
                onClick={() => onLink(t.id, t.recurring_bill_id)}
                aria-label={`Zatwierdź: ${title} to ${linkedBill}`}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-medium text-success hover:bg-surface"
              >
                <Check className="h-4 w-4" aria-hidden="true" /> Tak
              </button>
              <button
                type="button"
                onClick={() => onLink(t.id, null)}
                aria-label={`Odrzuć sugestię dla ${title}`}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-text-secondary hover:bg-surface"
              >
                <X className="h-4 w-4" aria-hidden="true" /> Nie
              </button>
            </div>
          )}

          <div className="flex flex-1 flex-nowrap items-center gap-2">
            <EditButton onClick={() => setEditing((v) => !v)} ariaLabel={`Edytuj: ${title}`} />
            <DeleteButton onClick={() => onRemove(t.id)} ariaLabel={`Usuń: ${title}`} />
          </div>
        </li>
      )}
    </>
  );
}

export default function TransactionsSection(props: Readonly<Props>) {
  const {
    monthLabel,
    monthFrom,
    transactions,
    categories,
    categoryNames,
    bills,
    profiles,
    profileId,
    onAdd,
    onUpdate,
    onLink,
    onRemove,
    csv,
    addSignal = 0,
  } = props;
  const id = useId();
  const [adding, setAdding] = useState(false);
  // Każdy nowy sygnał „dodaj” z nagłówka strony otwiera formularz (w trakcie renderu, bez efektu).
  const [seenAddSignal, setSeenAddSignal] = useState(0);
  if (addSignal !== seenAddSignal) {
    setSeenAddSignal(addSignal);
    if (addSignal > 0) setAdding(true);
  }
  const summary = useMemo(() => summarizeMonth(transactions, categories), [transactions, categories]);
  const billName = useMemo(() => new Map(bills.map((b) => [b.id, b.name])), [bills]);
  const suggestions = transactions.filter((t) => t.link_status === "suggested").length;

  return (
    <section aria-labelledby={`${id}-h`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={`${id}-h`} className="flex items-center gap-2 text-lg font-bold text-text">
          Wydatki i wpływy
        </h2>
        <CsvImport {...csv} categories={categories} categoryNames={categoryNames} bills={bills} profileId={profileId} />
        <AddButton onClick={() => setAdding(true)} />
      </div>

      {adding && (
        <div className="mb-4">
          <TransactionForm
            categories={categories}
            bills={bills}
            profiles={profiles}
            defaultProfileId={profileId}
            onSave={onAdd}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {/* Podsumowanie miesiąca */}
      <div className="card mb-4 rounded-card p-4 sm:p-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Wpływy", value: summary.income, cls: "text-success " },
            { label: "Wydatki", value: summary.expenses, cls: "text-text" },
            { label: "Bilans", value: summary.balance, cls: summary.balance < 0 ? "text-danger " : "text-text" },
            { label: "w tym płatności cykliczne", value: summary.billsPaid, cls: "text-text-secondary" },
          ].map((s) => (
            <div key={s.label}>
              <dt className="text-xs text-text-secondary">{s.label}</dt>
              <dd className={`text-xl font-bold tabular-nums ${s.cls}`}>{formatPln(s.value)}</dd>
            </div>
          ))}
        </dl>

        {summary.byCategory.length > 0 && (
          <details className="mt-3">
            <summary className="min-h-11 cursor-pointer py-2 text-sm text-text-secondary">
              Wydatki według kategorii ({summary.byCategory.length})
            </summary>
            <ul className="mt-1 space-y-2">
              {summary.byCategory.map((row) => {
                const share = summary.expenses > 0 ? Math.round((row.expenses / summary.expenses) * 100) : 0;
                return (
                  <li key={row.categoryId ?? "none"} className="text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-text">{row.name}</span>
                      <span className="text-text tabular-nums">
                        {formatPln(row.expenses)} <span className="text-text-secondary">· {share}%</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-surface" aria-hidden="true">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </div>

      {suggestions > 0 && (
        <output className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sugestie powiązań do sprawdzenia: {suggestions}.
        </output>
      )}

      {transactions.length === 0 ? (
        <p className="text-sm text-text-secondary">Brak transakcji w tym miesiącu.</p>
      ) : (
        <ul className="flex flex-col gap-4" aria-label={`Transakcje – ${monthLabel} (od ${monthFrom})`}>
          {transactions.map((t) => (
            <TransactionCard
              key={t.id}
              t={t}
              categories={categories}
              categoryNames={categoryNames}
              bills={bills}
              billName={billName}
              onUpdate={onUpdate}
              onLink={onLink}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}

      {transactions.length > 0 && (
        <div className="mt-2 flex justify-between">
          <span className="pt-2 text-left font-medium text-text-secondary">Razem wydatki:</span>
          <span className="pt-2 pr-3 text-right font-semibold tabular-nums">{formatPln(summary.expenses)}</span>
        </div>
      )}
    </section>
  );
}
