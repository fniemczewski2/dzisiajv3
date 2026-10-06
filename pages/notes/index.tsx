// pages/notes/index.tsx

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Clapperboard } from "lucide-react";
import { useNotes } from "@/hooks/db/useNotes";
import NoteList from "@/components/notes/NoteList";
import { useRouter } from "next/router";
import { AddButton } from "@/components/ui/CommonButtons";
import { useQuickAction } from "@/hooks/useQuickAction";
import { SkeletonList } from "@/components/ui/Skeleton";
import Seo from "@/components/ui/SEO";
const NoteForm = dynamic(() => import("@/components/notes/NoteForm"), {
  ssr: false,
});

export default function NotesPage() {
  const { notes, fetching, fetchNotes } = useNotes();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  const openNew = () => setShowForm(true);

  useQuickAction({ onActionAdd: () => setShowForm(true) });

  return (
    <>
      <Seo
        title="Notatki"
        description="Szybkie notatki z prostym formatowaniem tekstu – zapisuj pomysły, informacje i listy w jednym miejscu."
        canonical="https://dzisiaj.fun/notes"
        keywords="notatki, second brain, baza wiedzy, zapiski, notatnik online"
      />
        <div className="flex justify-between items-center mb-6 gap-2">
          <div className="flex flex-row items-center gap-3 sm:gap-4">
            <h1 className="page-title">
              Notatki
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => router.push("/notes/movies")}
                type='button'
                title="Filmy i seriale"
                className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-800 rounded-xl text-text-secondary hover:text-text hover:bg-surface-hover transition-colors shadow-sm"
              >
                <Clapperboard className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
          
          {!showForm && <AddButton onClick={openNew}/>}
        </div>
        
        {showForm && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4">
            <NoteForm
              onChange={() => {
                void fetchNotes();
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {fetching ? (
          <SkeletonList count={6} variant="card" />
        ) : (
          <NoteList
            notes={notes}
            onNotesChange={fetchNotes}
          />
        )}
    </>
  );
}
