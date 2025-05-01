"use client";
import React from "react";
import { format, parseISO } from "date-fns";
import { Edit2, Trash2 } from "lucide-react";
import { Bill } from "../types";

interface BillListProps {
  bills: Bill[];
  onEdit: (b: Bill) => void;
  onDelete: (id: string) => void;
}

export function BillList({ bills, onEdit, onDelete }: BillListProps) {
  return (
    <ul className="space-y-4 max-w-md mx-auto">
      {bills.map((b) => (
        <li
          key={b.id}
          className="bg-card rounded-xl shadow py-2 px-4 sm:py-4 my-2 sm:m-4 max-w-sm min-w-[300px] flex justify-between items-center"
        >
          <div>
            <p className="font-semibold">{b.amount.toFixed(2)} PLN</p>
            <p className="text-sm text-gray-500">
              {format(parseISO(b.date), "dd.MM.yyyy")} | {b.description}
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => onEdit(b)}
              className="flex flex-col items-center text-primary hover:text-secondary transition-colors"
            >
              <Edit2 className="w-5 h-5" />
              <span className="text-xs mt-1">Edytuj</span>
            </button>
            <button
              onClick={() => onDelete(b.id)}
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
