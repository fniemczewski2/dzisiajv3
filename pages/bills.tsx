// pages/bills.tsx

import { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabaseClient";
import { Bill } from "../types";
import { Edit2, PlusCircleIcon, Trash2 } from "lucide-react";

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    fetchBills();
  }, []);

  async function fetchBills() {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .order("date", { ascending: false });
    if (error) console.error("Fetch bills error:", error);
    else if (data) setBills(data as Bill[]);
  }

  function openNewForm() {
    setEditingId(null);
    setAmount(0);
    setDescription("");
    setDate("");
    setShowForm(true);
  }

  function openEditForm(b: Bill) {
    setEditingId(b.id);
    setAmount(b.amount);
    setDescription(b.description);
    setDate(b.date);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      await supabase
        .from("bills")
        .update({ amount, description, date })
        .eq("id", editingId);
    } else {
      await supabase.from("bills").insert({ amount, description, date });
    }
    // reset and hide
    setShowForm(false);
    setEditingId(null);
    setAmount(0);
    setDescription("");
    setDate("");
    fetchBills();
  }

  async function handleDelete(id: string) {
    await supabase.from("bills").delete().eq("id", id);
    fetchBills();
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pl-PL"); // "dd.mm.yyyy"

  return (
    <>
      <Head>
        <title>Bills – Dzisiaj v3</title>
        <meta
          name="description"
          content="Zarządzaj rachunkami: dodawaj, edytuj, usuwaj."
        />
      </Head>
      <Layout>
        {/* Header with Add button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Rachunki</h2>
          {!showForm && (
            <button
              onClick={openNewForm}
              className="px-4 py-2 flex wrap-nowrap bg-primary text-white rounded"
            >
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className=" w-4 h-4 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>

        {/* Collapsible form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 mb-6 bg-card p-4 rounded-xl shadow"
          >
            <label
              htmlFor="ammount-input"
              className="block text-sm font-medium text-gray-700"
            >
              Kategoria
            </label>
            <input
              id="ammount-input"
              type="number"
              step="0.01"
              placeholder="Kwota (PLN)"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              className="w-full p-2 border rounded"
              required
            />
            <label
              htmlFor="description-input"
              className="block text-sm font-medium text-gray-700"
            >
              Kategoria
            </label>
            <textarea
              id="description-input"
              placeholder="Opis"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700"
            >
              Kategoria
            </label>
            <input
              id="date"
              placeholder="dd.mm.rrrr"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded"
              >
                {editingId ? "Zapisz" : "Dodaj"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Anuluj
              </button>
            </div>
          </form>
        )}

        {/* List of bills */}
        <ul className="space-y-4">
          {bills.map((b) => (
            <li
              key={b.id}
              className="bg-card rounded-xl shadow p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{b.amount.toFixed(2)} PLN</p>
                <p className="text-sm text-gray-500">
                  {formatDate(b.date)} | {b.description}
                </p>
              </div>

              <div className="flex space-x-4">
                {/* Edit */}
                <button
                  onClick={() => openEditForm(b)}
                  className="flex flex-col items-center text-primary hover:text-secondary transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                  <span className="text-xs mt-1">Edytuj</span>
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(b.id)}
                  className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-xs mt-1">Usuń</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Layout>
    </>
  );
}
