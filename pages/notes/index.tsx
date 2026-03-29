"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Clapperboard, MapPin } from "lucide-react";
import { useNotes } from "../../hooks/useNotes";
import NoteList from "../../components/notes/NoteList";
import { useRouter } from "next/router";
import { AddButton } from "../../components/CommonButtons";
import { useQuickAction } from "../../hooks/useQuickAction";
import { useToast } from "../../providers/ToastProvider";
import Seo from "../../components/SEO"
const NoteForm = dynamic(() => import("../../components/notes/NoteForm"), {
  ssr: false,
});

export default function NotesPage() {
  const { notes, fetching, fetchNotes } = useNotes();
  const router = useRouter();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);

  const openNew = () => {
    setShowForm(true);
  };

  useQuickAction({
    onActionAdd: () => setShowForm(true),
  });

  useEffect(() => {
    let toastId: string | undefined;
    
    if (fetching && toast.loading) {
      toastId = toast.loading("Ładowanie notatek...");
    }

    return () => {
      if (toastId && toast.dismiss) {
        toast.dismiss(toastId);
      }
    };
  }, [fetching, toast]);

  return (
    <>
      <Seo
        title="Notatki - Dzisiaj v3"
        description="Twórz szybkie zapiski, gromadź ważne informacje i buduj swoją podręczną bazę wiedzy."
        canonical="https://dzisiajv3.vercel.app/notes"
        keywords="notatki, second brain, baza wiedzy, zapiski, notatnik online"
      />
        <div className="flex justify-between items-center mb-6 gap-2">
          <div className="flex flex-row items-center gap-3 sm:gap-4">
            <h2 className="text-2xl font-bold text-text">
              Notatki
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => router.push("/notes/movies")}
                title="Filmy"
                className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-800 rounded-xl text-textSecondary hover:text-text hover:bg-surfaceHover transition-colors shadow-sm"
              >
                <Clapperboard className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => router.push("/notes/places")}
                title="Miejsca"
                className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-800 rounded-xl text-textSecondary hover:text-text hover:bg-surfaceHover transition-colors shadow-sm"
              >
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
          
          {!showForm && <AddButton onClick={openNew}/>}
        </div>
        
        {showForm && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4">
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
    </>
  );
}
