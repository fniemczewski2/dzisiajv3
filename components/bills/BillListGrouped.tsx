"use client";
import React, { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Check, Minus, Plus, Share, X } from "lucide-react";
import { Bill } from "../../types";
import { useBills } from "../../hooks/useBills";
import { DeleteButton, EditButton, SaveButton, CancelButton, ShareButton } from "../CommonButtons";

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

  const handleShare = (bill: Bill) => {
    const shareData = {
      title: "Rachunek",
      text: `Hej, oddaj mi proszę ${bill.amount.toFixed(2)} zł")}`,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      alert("Udostępnianie nie jest wspierane w tej przeglądarce.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {Object.entries(grouped).map(([month, monthBills]) => (
        <div key={month}>
          <h4 className="text-md font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1 px-1">
            {month.charAt(0).toUpperCase() + month.slice(1)}
          </h4>
          <ul className="space-y-4">
            {monthBills.map((b) => {
              const isEditing = editingId === b.id;

              if (isEditing && editedBill) {
                return (
                  <li
                    key={b.id}
                    className="bg-gray-50 border-2 border-gray-300 rounded-xl shadow-lg p-4"
                  >
                    <div className="space-y-2">
                      {/* Amount */}
                      <div>
                        <label className="block text-sm font-medium mb-2" htmlFor="amount">
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
                                ? "bg-green-500 text-white hover:bg-green-600" 
                                : "bg-red-500 text-white hover:bg-red-600"
                            }`}
                            title={editedBill.is_income ? "Przychód" : "Wydatek"}
                          >
                            {editedBill.is_income ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                          </button>
                          <input
                            id="amount"
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
                            className="flex-1 p-2 border rounded-lg"
                            required
                          />
                        </div>
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
                            setEditedBill({
                              ...editedBill,
                              date: e.target.value,
                            })
                          }
                          className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-2 pt-2">
                        <SaveButton onClick={handleSaveEdit} type="button" />
                        <CancelButton onCancel={handleCancelEdit} />
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
                    <span className={`font-semibold text-lg ${b.is_income ? "text-green-600" : "text-red-600"}`}>
                      {b.is_income ? "+" : "-"}{b.amount.toFixed(2)} zł
                    </span>
                    {b.description && (
                      <span className="text-gray-500 text-sm">
                        {b.description}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(b.date), "dd.MM.yyyy")}
                    </span>
                  </div>

                  <div className="flex flex-row flex-nowrap flex-1 justify-end space-x-2 sm:space-x-3 text-sm">
                    {!b.done && (
                      <button
                        onClick={() => handleMarkDone(b)}
                        title="Oznacz jako wykonane"
                        className="flex flex-col px-1.5 items-center text-green-600 hover:text-green-800 transition-colors"
                      >
                        <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-[9px] sm:text-[11px] mt-1">Zrobione</span>
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