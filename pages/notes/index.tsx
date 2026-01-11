// pages/notes.tsx
import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { useSession } from "@supabase/auth-helpers-react";
import { Backpack, Luggage } from "lucide-react";
import { useNotes } from "../../hooks/useNotes";
import NoteForm from "../../components/notes/NoteForm";
import NoteList from "../../components/notes/NoteList";
import { useRouter } from "next/router";
import LoadingState from "../../components/LoadingState";
import { AddButton } from "../../components/CommonButtons";

export default function NotesPage() {
  const session = useSession();
  const { notes, loading, fetchNotes } = useNotes();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  const openNew = () => {
    setShowForm(true);
  };

  return (
    <>
      <Head>
        <title>Notatki - Dzisiaj</title>
        <meta name="description" content="Twórz i zarządzaj notatkami." />
        <link rel="canonical" href="https://dzisiajv3.vercel.app/notes" />
        <meta property="og:title" content="Notatki - Dzisiaj" />
        <meta
          property="og:description"
          content="Twórz i zarządzaj notatkami."
        />
      </Head>
      <Layout>
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex flex-nowrap justify-between gap-2">
            Notatki&nbsp;
            <div className="flex justify-between items-center gap-2">
              <button
                onClick={() => router.push("/packing/backpack")}
                title="Plecak"
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Backpack className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push("/packing/suitcase")}
                title="Walizka"
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Luggage className="w-5 h-5" />
              </button>
            </div>
          </h2>
          
          {!showForm && <AddButton onClick={openNew} type="button" />}
        </div>
        {(!session || loading) && (
            <LoadingState />
        )}
        {showForm && (
          <div className="mb-6">
            <NoteForm
              onChange={() => {
                fetchNotes();
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <NoteList
          notes={notes}
          onNotesChange={fetchNotes}
        />
      </Layout>
    </>
  );
}
NotesPage.auth = true;
