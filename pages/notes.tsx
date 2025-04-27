// pages/notes.tsx

import { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabaseClient";
import { Note } from "../types";
import { Edit2, PlusCircleIcon, Trash2 } from "lucide-react";

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formularz: tytuł, tekst pozycji (oddzielone enterami), kolor
  const pastelColors = ["#f8f8f8", "#fefec6", "#dffedf", "#ccf7f7", "#fedfdf"];
  const [title, setTitle] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [bgColor, setBgColor] = useState(pastelColors[0]);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Fetch notes error:", error);
    } else if (data) {
      setNotes(data as Note[]);
    }
  }

  function openNewForm() {
    setEditingId(null);
    setTitle("");
    setItemsText("");
    setBgColor(pastelColors[0]);
    setShowForm(true);
  }

  function openEditForm(n: Note) {
    setEditingId(n.id);
    setTitle(n.title);
    setItemsText(n.items.join("\n"));
    setBgColor(n.bg_color);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Przygotuj tablicę pozycji
    const items = itemsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingId) {
      const { error } = await supabase
        .from("notes")
        .update({ title, items, bg_color: bgColor })
        .eq("id", editingId);
      if (error) console.error("Update note error:", error);
    } else {
      const { error } = await supabase
        .from("notes")
        .insert({ title, items, bg_color: bgColor });
      if (error) console.error("Insert note error:", error);
    }

    // Posprzątaj formularz
    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setItemsText("");
    setBgColor(pastelColors[0]);
    fetchNotes();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) console.error("Delete note error:", error);
    fetchNotes();
  }

  return (
    <>
      <Head>
        <title>Notes – Dzisiaj v3</title>
        <meta name="description" content="Twórz i zarządzaj notatkami." />
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Notatki</h2>
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

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 mb-6 bg-card p-4 rounded-xl shadow"
          >
            <label
              htmlFor="title-input"
              className="block text-sm font-medium text-gray-700"
            >
              Tytuł
            </label>
            <input
              id="title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tytuł notatki"
              className="w-full p-2 border rounded"
              required
            />
            <label
              htmlFor="content-input"
              className="block text-sm font-medium text-gray-700"
            >
              Kategoria
            </label>
            <textarea
              id="content-input"
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              placeholder="Każda linia to jedna pozycja listy"
              className="w-full p-2 border rounded h-24"
              required
            />

            <div className="flex gap-2">
              {pastelColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setBgColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition ${
                    bgColor === color
                      ? "border-secondary"
                      : "border-transparent hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded"
              >
                {editingId ? "Zapisz notatkę" : "Dodaj notatkę"}
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

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {notes.map((n) => (
            <li
              key={n.id}
              className="p-4 max-w-[400px] sm:max-w-[480px] rounded-xl shadow flex flex-col justify-between"
              style={{ backgroundColor: n.bg_color }}
            >
              <div>
                <h3 className="font-semibold mb-2">{n.title}</h3>
                <ul className="list-disc pl-5 mb-4">
                  {n.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => openEditForm(n)}
                  className="flex flex-col items-center text-primary hover:text-secondary transition-colors"
                  title="Edytuj"
                >
                  <Edit2 className="w-5 h-5" />
                  <span className="text-xs mt-1">Edytuj</span>
                </button>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors"
                  title="Usuń"
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
