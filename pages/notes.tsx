// pages/notes.tsx
import React, { useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon } from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { NoteForm } from "../components/NoteForm";
import { NoteList } from "../components/NoteList";
import { Note } from "../types";

export default function NotesPage() {
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const { notes, loading, fetchNotes } = useNotes(userEmail);
  const supabase = useSupabaseClient();

  const [editing, setEditing] = useState<Note | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
      </div>
    );
  }

  const openNew = () => {
    setEditing(undefined);
    setShowForm(true);
  };
  const openEdit = (n: Note) => {
    setEditing(n);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć notatkę?")) return;
    await supabase.from("notes").delete().eq("id", id);
    fetchNotes();
  };

  return (
    <>
      <Head>
        <title>Notatki – Dzisiaj v3</title>
        <meta name="description" content="Twórz i zarządzaj notatkami." />
        <link rel="canonical" href="https://yourdomain.com/notes" />
        <meta property="og:title" content="Notatki – Dzisiaj v3" />
        <meta
          property="og:description"
          content="Twórz i zarządzaj notatkami."
        />
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Notatki</h2>
          {!showForm && (
            <button
              onClick={openNew}
              className="px-4 py-2 flex items-center bg-primary text-white rounded-xl"
            >
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-6">
            <NoteForm
              userEmail={userEmail}
              onChange={() => {
                fetchNotes();
                setShowForm(false);
              }}
              initial={editing}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <NoteList
          notes={notes}
          onEdit={openEdit}
          onDelete={(id) => {
            handleDelete(id);
            fetchNotes();
          }}
        />
      </Layout>
    </>
  );
}
NotesPage.auth = true;
