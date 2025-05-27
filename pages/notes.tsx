// pages/notes.tsx
import React, { useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Backpack, Luggage, Loader2, PlusCircleIcon } from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { NoteForm } from "../components/NoteForm";
import { NoteList } from "../components/NoteList";
import { Note } from "../types";
import { useRouter } from "next/router";

export default function NotesPage() {
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const { notes, loading, fetchNotes } = useNotes(userEmail);
  const supabase = useSupabaseClient();
  const router = useRouter();

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
        <link rel="canonical" href="https://dzisiajv3.vercel.app/notes" />
        <meta property="og:title" content="Notatki – Dzisiaj v3" />
        <meta
          property="og:description"
          content="Twórz i zarządzaj notatkami."
        />
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex flex-nowrap justify-between">
            Notatki&nbsp;
            <div className="flex justify-between items-center">
              <button
                onClick={() => router.push("/notes/backpack")}
                title="Plecak"
                className="p-2 ml-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Backpack className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push("/notes/suitcase")}
                title="Walizka"
                className="p-2 ml-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Luggage className="w-5 h-5" />
              </button>
            </div>
          </h2>
          {!showForm && (
            <button
              onClick={openNew}
              className="px-4 py-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg"
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
