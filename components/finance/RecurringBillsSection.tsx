// components/finance/RecurringBillsSection.tsx

import React, { useId, useMemo, useState } from "react";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import { describeRule } from "@/supabase/functions/_shared/recurrence";
import { billMonthStatus, forecastMonth, formatPln, nextMonthKey, type BillStatus } from "@/lib/finance";
import { getAppDate } from "@/lib/dateUtils";
import RecurringBillForm from "./RecurringBillForm";
import type { BudgetCategory } from "@/types/bills";
import type { FinanceProfile, RecurringBill, Transaction } from "@/types/finance";
import { AddButton, DeleteButton, EditButton } from "../ui/CommonButtons";

interface Props {
  bills: readonly RecurringBill[];
  monthKey: string;
  monthLabel: string;
  nextMonthLabel: string;
  transactions: readonly Transaction[];
  categories: readonly BudgetCategory[];
  profiles: readonly FinanceProfile[];
  profileId: string | null;
  onSave: (bill: Omit<RecurringBill, "id" | "user_id"> & { id?: string }) => Promise<unknown>;
  onRemove: (id: string) => void;
}

const STATUS: Record<BillStatus, { label: string; className: string }> = {
  paid: { label: "zapłacony", className: "bg-green-50 text-green-800 border-green-700/30 dark:bg-green-900/30 dark:text-green-200" },
  pending: { label: "do zapłaty", className: "bg-surface text-text-secondary border-line-strong" },
  overdue: { label: "zaległy", className: "bg-red-50 text-red-800 border-red-700/30 dark:bg-red-900/30 dark:text-red-200" },
  none: { label: "brak terminu", className: "bg-surface text-text-secondary border-line" },
};

const short = (d: string) => d.split("-").reverse().slice(0, 2).join(".");

export default function RecurringBillsSection(props: Readonly<Props>) {
  const { bills, monthKey, monthLabel, nextMonthLabel, transactions, categories, profiles, profileId, onSave, onRemove } = props;
  const id = useId();
  const [editing, setEditing] = useState<RecurringBill | "new" | null>(null);
  const today = getAppDate();
  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const rows = useMemo(
    () =>
      bills
        .map((bill) => ({ bill, ...billMonthStatus(bill, monthKey, transactions, today) }))
        .filter((r) => r.bill.active && (r.dueDates.length > 0 || r.status === "paid"))
        .sort((a, b) => (a.dueDates[0] ?? "99").localeCompare(b.dueDates[0] ?? "99")),
    [bills, monthKey, transactions, today]
  );
  const inactiveOrOther = bills.filter((b) => !rows.some((r) => r.bill.id === b.id));
  const forecast = useMemo(() => forecastMonth(bills, nextMonthKey(monthKey)), [bills, monthKey]);
  const monthTotal = rows.reduce((s, r) => s + r.dueDates.length * r.bill.amount, 0);

  return (
    <section aria-labelledby={`${id}-h`} className="">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={`${id}-h`} className="flex items-center gap-2 text-lg font-bold text-text">
          Płatności cykliczne 
        </h2>
        <AddButton
          onClick={() => setEditing("new")}
        />
      </div>

      {editing && (
        <div className="mb-4">
          <RecurringBillForm
            initial={editing === "new" ? null : editing}
            categories={categories}
            profiles={profiles}
            defaultProfileId={profileId}
            onSave={onSave}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">Brak rachunków z terminem w tym miesiącu.</p>
      ) : (
        <div className="flex flex-col overflow-x-auto gap-4">
              {rows.map(({ bill, status, paid }) => (
                  <div className="card rounded-card p-4 sm:p-5">
                    <div className="flex justify-between items-start mb-2 pb-2">
                      <div className="flex flex-col gap-1">
                      <p className="font-medium text-text">{bill.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-text-secondary">
                          {bill.recurrence && <Repeat className="h-3 w-3" aria-hidden="true" />}
                          {bill.recurrence ? describeRule(bill.recurrence, bill.start_date) : "jednorazowy"}
                        </span>
                        <span className="text-xs text-text-secondary text-center rounded-full border px-2 py-0.5 inline-block mt-1">
                          {bill.category_id && `${catName.get(bill.category_id) ?? ""}`}
                        </span>
                      </div>
                    </div>
                    
                      <span className="text-xl font-bold">
                        {(status === "paid" && paid !== bill.amount) ? formatPln(paid) : formatPln(bill.amount)}
                      </span>
                    </div>
                  {/* <td className="py-2 pr-3">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS[status].className}`}>
                      {STATUS[status].label}
                    </span>
                  </td> */}
                  <div className="flex flex-nowrap items-center gap-2 flex-1">
                    <EditButton onClick={() => setEditing(bill)} aria-label={`Edytuj ${bill.name}`} />
                    <DeleteButton onClick={() => onRemove(bill.id)} aria-label={`Usuń ${bill.name}`} />
                  </div>

                </div>
              ))}
            <div className="flex justify-between">
                <span className="pt-2 text-left font-medium text-text-secondary">Razem: </span>
                <span className="pt-2 pr-3 text-right font-semibold tabular-nums">{formatPln(monthTotal)}</span>
            </div>
        </div>
      )}

      <div className="mt-4 rounded-card border border-dashed border-line-strong p-3">
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-text">Prognoza rachunków – {nextMonthLabel}</span>
          <span className="text-lg font-semibold tabular-nums text-text">{formatPln(forecast.total)}</span>
        </p>
        {forecast.items.length > 0 && (
          <ul className="mt-1 text-sm text-text-secondary">
            {forecast.items.map((i) => (
              <li key={i.bill.id} className="flex justify-between gap-3">
                <span>{i.dates.map(short).join(", ")} · {i.bill.name}</span>
                <span className="tabular-nums">{formatPln(i.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {inactiveOrOther.length > 0 && (
        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-text-secondary">
            Pozostałe rachunki ({inactiveOrOther.length}) – bez terminu w tym miesiącu lub nieaktywne
          </summary>
          <ul className="divide-y divide-line">
            {inactiveOrOther.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-1">
                <span className={b.active ? "text-text" : "text-text-secondary line-through"}>{b.name}</span>
                <span className="flex items-center gap-1">
                  <span className="tabular-nums text-sm">{formatPln(b.amount)}</span>
                  <EditButton small onClick={() => setEditing(b)} aria-label={`Edytuj ${b.name}`} />
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
