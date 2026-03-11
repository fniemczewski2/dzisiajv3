"use client";
import React, { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Check, Minus, Plus } from "lucide-react";
import { Bill } from "../../types";
import { useBills } from "../../hooks/useBills";
import { DeleteButton, EditButton, SaveButton, CancelButton, ShareButton } from "../CommonButtons";
import NoResultsState from "../NoResultsState";

interface BillListProps {
  bills: Bill[];
  onBillsChange: () => void;
}

function groupByMonth(bills: Bill[]): Record<string, Bill[]> {
  return bills.reduce((acc, bill) => {
    const month = format(parseISO(bill.date), "LLLL yyyy", { locale: pl });
    if (!acc[month]) acc[month] = [];
    acc[month].push(bill);
    return acc;
  }, {} as Record<string, Bill[]>);
}

export default function BillListGrouped({ bills, onBillsChange }: BillListProps) {
  const { deleteBill, editBill } = useBills();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedBill, setEditedBill] = useState<Bill | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  
  const grouped = groupByMonth(bills);

  useEffect(() => {
    if (editingId && amountRef.current) {
      amountRef.current.focus();
    }
  }, [editingId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten wpis?")) return;
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

  const handleShare = (bill: Bill) => {
    const shareData = {
      title: "Rachunek",
      text: `Hej, oddaj mi proszę ${bill.amount.toFixed(2)} zł${bill.description ? ` za ${bill.description}` : ""}.`,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      alert("Udostępnianie nie jest wspierane w tej przeglądarce.");
    }
  };

  if (bills.length === 0) {
    return (
      <NoResultsState text="rachunków" />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {Object.entries(grouped).map(([month, monthBills]) => (
        <div key={month}>
          <h4 className="text-sm font-bold text-textSecondary uppercase tracking-wider mb-3 px-1 border-b border-gray-200 dark:border-gray-700 pb-2">
            {month}
          </h4>
          <ul className="space-y-3">
            {monthBills.map((b) => {
              const isEditing = editingId === b.id;

              if (isEditing && editedBill) {
                return (
                  <li key={b.id} className="bg-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-md p-4 transition-colors">
                    <div className="space-y-3">
                      {/* Amount */}
                      <div>
                        <label className="form-label" htmlFor="amount">
                          Kwota:
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            id="includeInBudget"
                            type="button"
                            onClick={() =>
                              setEditedBill({
                                ...editedBill,
                                is_income: !editedBill.is_income,
                              })
                            }
                            className={`p-2 rounded-lg transition-colors ${
                              editedBill.is_income 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                            }`}
                            title={editedBill.is_income ? "Przychód" : "Wydatek"}
                          >
                            {editedBill.is_income ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                          </button>
                          <input
                            id="amount"
                            ref={amountRef}
                            type="number"
                            step="0.01"
                            placeholder="Kwota"
                            value={editedBill.amount}
                            onChange={(e) =>
                              setEditedBill({
                                ...editedBill,
                                amount: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="input-field flex-1"
                            required
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="form-label">
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
                          className="input-field"
                          rows={2}
                        />
                      </div>

                      {/* Date */}
                      <div>
                        <label className="form-label">
                          Data:
                        </label>
                        <input
                          type="date"
                          value={editedBill.date}
                          onChange={(e) =>
                            setEditedBill({
                              ...editedBill,
                              date: e.target.value,
                            })
                          }
                          className="input-field w-full min-w-0 px-1 text-xs"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-3 pt-2">
                        <SaveButton onClick={handleSaveEdit} type="button" />
                        <CancelButton onCancel={handleCancelEdit} />
                      </div>
                    </div>
                  </li>
                );
              }

              // Normalny widok rachunku
              return (
                <li
                  key={b.id}
                  className="bg-card border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition hover:shadow-md"
                >
                  <div className="flex flex-col flex-1 space-y-1">
                    <span className={`font-bold text-lg tabular-nums ${b.is_income ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                      {b.is_income ? "+" : "-"}{b.amount.toFixed(2)} zł
                    </span>
                    {b.description && (
                      <span className="text-textSecondary text-sm">
                        {b.description}
                      </span>
                    )}
                    <span className="text-xs text-textSubtle font-medium">
                      {format(parseISO(b.date), "dd.MM.yyyy")}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t border-gray-100 dark:border-gray-800 sm:border-0">
                    {!b.done && !b.is_income && (
                      <button
                        onClick={() => handleMarkDone(b)}
                        title="Oznacz jako zapłacone"
                        className="flex flex-col px-2 py-1 items-center bg-surface hover:bg-surfaceHover text-green-600 dark:text-green-500 rounded-lg transition-colors"
                      >
                        <Check className="w-5 h-5" />
                        <span className="text-[10px] font-bold mt-1 uppercase">Opłać</span>
                      </button>
                    )}
                    <ShareButton onClick={() => handleShare(b)} />
                    <EditButton onClick={() => handleEdit(b)} />
                    <DeleteButton onClick={() => handleDelete(b.id)} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}