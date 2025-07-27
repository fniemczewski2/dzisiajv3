"use client";
import React from "react";
import { format, parseISO } from "date-fns";
import { Check, Edit2, Trash2 } from "lucide-react";
import { Bill } from "../../types";

interface BillListProps {
  bills: Bill[];
  onEdit: (b: Bill) => void;
  onDelete: (id: string) => void;
  onMarkDone?: (id: string) => void; // nowa funkcja opcjonalna
}

export function BillList({ bills, onEdit, onDelete, onMarkDone }: BillListProps) {
  return (
    <ul className="space-y-4 max-w-2xl mx-auto">
      {bills.map((b) => (
        <li
          key={b.id}
          className="bg-card rounded-xl shadow-md p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center transition hover:shadow-lg"
        >
          <div className="flex flex-col space-y-1 text-sm sm:text-base">
            <span className={`font-semibold ${b.include_in_budget ? "text-red-600" : "text-green-600"}`}>
              {b.include_in_budget ? "-" : "+"}
              {b.amount.toFixed(2)} zł
            </span>
            {b.description && <span className="text-gray-500">{b.description}</span>}
            <span className="text-xs text-muted-foreground">
              {format(parseISO(b.date), "dd.MM.yyyy")}
            </span>
          </div>

          <div className="flex space-x-4 mt-3 justify-end sm:mt-0 sm:ml-4 text-sm">
            {b.include_in_budget && onMarkDone && (
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
  );
}
