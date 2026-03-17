"use client";
import React, { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Check, Minus, Plus } from "lucide-react";
import { Bill } from "../../types";
import { useBills } from "../../hooks/useBills";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
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
  const { user } = useAuth();
  const { deleteBill, editBill, markAsDone } = useBills();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedBill, setEditedBill] = useState<Bill | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const grouped = groupByMonth(bills);

  useEffect(() => {
    if (editingId && amountRef.current) amountRef.current.focus();
  }, [editingId]);

  const handleDelete = async (id: string) => {
    const ok = await toast.confirm("Czy na pewno chcesz usunąć ten wpis?");
    if (!ok) return;
    await withRetry(
      () => deleteBill(id),
      toast,
      { context: "BillListGrouped.deleteBill", userId: user?.id }
    );
    toast.success("Usunięto pomyślnie.");
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
    if (!editedBill) return;
    await withRetry(
      () => editBill(editedBill),
      toast,
      { context: "BillListGrouped.editBill", userId: user?.id }
    );
    toast.success("Zmieniono pomyślnie.");
    setEditingId(null);
    setEditedBill(null);
    onBillsChange();
  };

  const handleMarkDone = async (bill: Bill) => {
    await withRetry(
      () => markAsDone(bill.id),
      toast,
      { context: "BillListGrouped.markAsDone", userId: user?.id }
    );
    toast.success("Zmieniono pomyślnie.");
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
      toast.error("Udostępnianie nie jest wspierane w tej przeglądarce.");
    }
  };

  if (bills.length === 0) return <NoResultsState text="rachunków" />;

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
                  <li key={b.id} className="card rounded-xl shadow-md p-4 transition-colors">
                    <div className="space-y-3">
                      <div>
                        <label className="form-label" htmlFor="amount">Kwota:</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditedBill({ ...editedBill, is_income: !editedBill.is_income })}
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
                            onChange={(e) => setEditedBill({ ...editedBill, amount: parseFloat(e.target.value) || 0 })}
                            className="input-field flex-1"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Opis:</label>
                        <textarea
                          value={editedBill.description || ""}
                          onChange={(e) => setEditedBill({ ...editedBill, description: e.target.value })}
                          className="input-field"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="form-label">Data:</label>
                        <input
                          type="date"
                          value={editedBill.date}
                          onChange={(e) => setEditedBill({ ...editedBill, date: e.target.value })}
                          className="input-field w-full min-w-0 px-1 text-xs"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <SaveButton onClick={handleSaveEdit} type="button" />
                        <CancelButton onCancel={handleCancelEdit} />
                      </div>
                    </div>
                  </li>
                );
              }

              return (
                <li key={b.id} className="card rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition hover:shadow-md">
                  <div className="flex flex-col flex-1 space-y-1">
                    <span className={`font-bold text-lg tabular-nums ${b.is_income ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                      {b.is_income ? "+" : "-"}{b.amount.toFixed(2)} zł
                    </span>
                    {b.description && (
                      <span className="text-textSecondary text-sm">{b.description}</span>
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
                        className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors border border-green-200 dark:border-green-500/30"
                      >
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide">Opłać</span>
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