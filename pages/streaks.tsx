"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import StreakCard from "../components/streaks/StreakCard";
import StreakForm from "../components/streaks/StreakForm";
import { useStreaks } from "../hooks/useStreaks";
import { Streak } from "../types";
import { AddButton } from "../components/CommonButtons";
import NoResultsState from "../components/NoResultsState";
import { useToast } from "../providers/ToastProvider";

export default function StreaksPage() {
  const { toast } = useToast();
  const { streaks, loading, fetching, refetch, deleteStreak, updateStreak, getMilestoneMessage } = useStreaks();
  const [showForm, setShowForm] = useState(false);

  const handleEdit = async (updatedStreak: Streak) => {
    try {
      await updateStreak(updatedStreak.id, {
        name: updatedStreak.name,
        start_date: updatedStreak.start_date,
        icon: updatedStreak.icon,
      });
      toast.success("Zmieniono pomyślnie.");
    } catch {
      toast.error("Wystąpił błąd podczas zapisywania.");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await toast.confirm("Czy na pewno chcesz usunąć ten cel?");
    if (!ok) return;
    try {
      await deleteStreak(id);
      toast.success("Usunięto pomyślnie.");
    } catch {
      toast.error("Wystąpił błąd podczas usuwania.");
    }
  };

  const handleFormChange = () => {
    refetch();
    setShowForm(false);
  };

    
    useEffect(() => {
        let toastId: string | undefined;
        
        if (fetching && toast.loading) {
          toastId = toast.loading("Ładowanie celów...");
        }
    
        return () => {
          if (toastId && toast.dismiss) {
            toast.dismiss(toastId);
          }
        };
    }, [fetching, toast]);

  return (
    <>
      <Head>
        <title>Cele - Dzisiaj</title>
        <meta name="description" content="Twórz i zarządzaj celami." />
        <link rel="canonical" href="https://dzisiajv3.vercel.app/streaks" />
        <meta property="og:title" content="Cele - Dzisiaj" />
        <meta property="og:description" content="Twórz i zarządzaj celami." />
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex flex-nowrap justify-between gap-2">
            Cele
          </h2>
          {!showForm && <AddButton onClick={() => setShowForm(true)} />}
        </div>

        {showForm && (
          <StreakForm
            onChange={handleFormChange}
            onCancel={() => setShowForm(false)}
          />
        )}
        {streaks ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streaks.map((streak) => (
              <StreakCard
                key={streak.id}
                streak={streak}
                onDelete={handleDelete}
                onEdit={handleEdit}
                getMilestoneMessage={getMilestoneMessage}
                loading={loading}
              />
            ))}
          </div>
        ) : (
          <NoResultsState text="celów" />
        )}
      </Layout>
    </>
  );
}

