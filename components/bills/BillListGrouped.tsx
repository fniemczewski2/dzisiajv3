"use client";
import React from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Check, Edit2, Trash2 } from "lucide-react";
import { Bill } from "../../types";

interface BillListProps {
  bills: Bill[];
  onEdit: (b: Bill) => void;
  onDelete: (id: string) => void;
  onMarkDone?: (id: string) => void;
}

function groupByMonth(bills: Bill[]): Record<string, Bill[]> {
  return bills.reduce((acc, bill) => {
    const month = format(parseISO(bill.date), "LLLL yyyy", { locale: pl }); // np. lipiec 2025
    if (!acc[month]) acc[month] = [];
    acc[month].push(bill);
    return acc;
  }, {} as Record<string, Bill[]>);
}

export default function BillList({ bills, onEdit, onDelete, onMarkDone }: BillListProps) {
  const grouped = groupByMonth(bills);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {Object.entries(grouped).map(([month, monthBills]) => (
        <div key={month}>
          <h4 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1 px-1">
            {month.charAt(0).toUpperCase() + month.slice(1)}
          </h4>
          <ul className="space-y-3">
            {monthBills.map((b) => (
              <li
                key={b.id}
                className="bg-card rounded-xl shadow-md p-4 flex flex-row items-center transition hover:shadow-lg hover:bg-gray-100"
              >
                <div className="flex flex-col flex-1 space-y-1 text-sm sm:text-base">
                  <span className="font-semibold text-lg text-red-600">
                    -{b.amount.toFixed(2)} zł
                  </span>
                  {b.description && <span className="text-gray-500 text-sm">{b.description}</span>}
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(b.date), "dd.MM.yyyy")}
                  </span>
                </div>

                <div className="flex flex-row flex-nowrap flex-1 justify-end space-x-5 text-sm">
                  {onMarkDone && (
                    <button
                      onClick={() => onMarkDone(b.id)}
                      title="Oznacz jako wykonane"
                      className="flex flex-col items-center text-green-600 hover:text-green-800 transition-colors"
                    >
                      <Check className="w-5 h-5" />
                      <span className="text-xs mt-1">Zrobione</span>
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(b)}
                    title="Edytuj rachunek"
                    className="flex flex-col items-center text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                    <span className="text-xs mt-1">Edytuj</span>
                  </button>
                  <button
                    onClick={() => onDelete(b.id)}
                    title="Usuń rachunek"
                    className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-xs mt-1">Usuń</span>
                  </button>
                </div>
                
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
