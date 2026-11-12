// pages/notes/index.tsx

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useNotes } from "@/hooks/db/useNotes";
import NoteList from "@/components/notes/NoteList";
import { AddButton, DownloadButton } from "@/components/ui/CommonButtons";
import { downloadAllNotesMarkdown } from "@/lib/notes/export";
import { useQuickAction } from "@/hooks/useQuickAction";
import { SkeletonList } from "@/components/ui/Skeleton";
import Seo from "@/components/ui/SEO";
const NoteForm = dynamic(() => import("@/components/notes/NoteForm"), {
  ssr: false,
});

export default function NotesPage() {
  const { notes, fetching, fetchNotes } = useNotes();
  const [showForm, setShowForm] = useState(false);

  const openNew = () => setShowForm(true);

  useQuickAction({ onActionAdd: () => setShowForm(true) });

  return (
    <>
      <Seo
        title="Notatki"
        description="Szybkie notatki z prostym formatowaniem tekstu, zapisuj pomysły, informacje i listy w jednym miejscu."
        canonical="https://www.dzisiaj.fun/notes"
      />
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex flex-row items-center gap-3 sm:gap-4">
          <h1 className="page-title">Notatki</h1>
        </div>

        {!showForm && (
          <div className="flex items-center gap-2">
            {notes.length > 0 && (
              <DownloadButton onClick={() => downloadAllNotesMarkdown(notes)} small fileFormat=".md" />
            )}
            <AddButton onClick={openNew} />
          </div>
        )}
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

      {fetching ? <SkeletonList count={6} variant="card" /> : <NoteList notes={notes} onNotesChange={fetchNotes} />}
    </>
  );
}
