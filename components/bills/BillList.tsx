"use client";
import React, { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Check, Edit2, Trash2, Save, X } from "lucide-react";
import { Bill } from "../../types";
import { useBills } from "../../hooks/useBills";

interface BillListProps {
  bills: Bill[];
  onBillsChange: () => void;
}

export default function BillList({ bills, onBillsChange }: BillListProps) {
  const { deleteBill, editBill } = useBills();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedBill, setEditedBill] = useState<Bill | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && amountRef.current) {
      amountRef.current.focus();
    }
  }, [editingId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten rachunek?")) return;
    await deleteBill(id);
    onBillsChange();
  };

  const handleEdit = (bill: Bill) => {
    setEditingId(bill.id);
    setEditedBill(bill);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedBill(null);
  };

  const handleSaveEdit = async () => {
    if (editedBill) {
      await editBill(editedBill);
      setEditingId(null);
      setEditedBill(null);
      onBillsChange();
    }
  };

  const handleMarkDone = async (bill: Bill) => {
    await editBill({ ...bill, done: true });
    onBillsChange();
  };

  return (
    <ul className="space-y-4 max-w-2xl mx-auto">
      {bills.map((b) => {
        const isEditing = editingId === b.id;

        if (isEditing && editedBill) {
          return (
            <li
              key={b.id}
              className="bg-gray-50 border-2 border-gray-300 rounded-xl shadow-lg p-4"
            >
              <div className="space-y-3">
                {/* Amount */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Kwota:
                  </label>
                  <input
                    ref={amountRef}
                    type="number"
                    step="0.01"
                    value={editedBill.amount}
                    onChange={(e) =>
                      setEditedBill({
                        ...editedBill,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Opis:
                  </label>
                  <textarea
                    value={editedBill.description || ""}
                    onChange={(e) =>
                      setEditedBill({
                        ...editedBill,
                        description: e.target.value,
                      })
                    }
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    rows={2}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Data:
                  </label>
                  <input
                    type="date"
                    value={editedBill.date}
                    onChange={(e) =>
                      setEditedBill({ ...editedBill, date: e.target.value })
                    }
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Include in Budget */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`budget-${b.id}`}
                    checked={editedBill.include_in_budget}
                    onChange={(e) =>
                      setEditedBill({
                        ...editedBill,
                        include_in_budget: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor={`budget-${b.id}`}
                    className="text-sm font-medium"
                  >
                    Planowany wydatek
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                  >
                    <span className="text-sm">Zapisz</span>
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    <span className="text-sm">Anuluj</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        }

        return (
          <li
            key={b.id}
            className="bg-card rounded-xl shadow-md p-4 flex flex-row items-center transition hover:shadow-lg hover:bg-gray-100"
          >
            <div className="flex flex-col flex-1 space-y-1 text-sm sm:text-base">
              <span
                className={`font-semibold text-lg ${
                  b.include_in_budget ? "text-red-600" : "text-green-600"
                }`}
              >
                {b.include_in_budget ? "-" : "+"}
                {b.amount.toFixed(2)} zł
              </span>
              {b.description && (
                <span className="text-gray-500">{b.description}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {format(parseISO(b.date), "dd.MM.yyyy")}
              </span>
            </div>

            <div className="flex flex-row flex-nowrap flex-1 space-x-4 justify-end text-sm">
              {b.include_in_budget && !b.done && (
                <button
                  onClick={() => handleMarkDone(b)}
                  title="Oznacz jako wykonane"
                  className="flex flex-col items-center text-green-600 hover:text-green-800 transition-colors"
                >
                  <Check className="w-5 h-5" />
                  <span className="text-xs mt-1">Zrobione</span>
                </button>
              )}
              <button
                onClick={() => handleEdit(b)}
                title="Edytuj rachunek"
                className="flex flex-col items-center text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Edit2 className="w-5 h-5" />
                <span className="text-xs mt-1">Edytuj</span>
              </button>
              <button
                onClick={() => handleDelete(b.id)}
                title="Usuń rachunek"
                className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                <span className="text-xs mt-1">Usuń</span>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}