// pages/streaks.tsx
"use client";

import { useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { Target } from "lucide-react";
import StreakCard from "../components/streaks/StreakCard";
import StreakForm from "../components/streaks/StreakForm";
import LoadingState from "../components/LoadingState";
import { useStreaks } from "../hooks/useStreaks";
import { Streak } from "../types";
import { AddButton } from "../components/CommonButtons";
import { useAuth } from "../providers/AuthProvider";
import NoResultsState from "../components/NoResultsState";

export default function StreaksPage() {
  const { user } = useAuth();
  const userId = user?.id;

  const { streaks, loading, refetch, deleteStreak, updateStreak, getMilestoneMessage } = useStreaks();
  const [showForm, setShowForm] = useState(false);

  const handleEdit = async (updatedStreak: Streak) => {
    await updateStreak(updatedStreak.id, {
      name: updatedStreak.name,
      start_date: updatedStreak.start_date,
      icon: updatedStreak.icon,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Czy na pewno chcesz usunąć ten cel?")) {
      await deleteStreak(id);
    }
  };

  const handleFormChange = () => {
    refetch();
    setShowForm(false);
  };

  return (
    <>
      <Head>
        <title>Cele - Dzisiaj</title>
        <meta name="description" content="Twórz i zarządzaj celami." />
        <link rel="canonical" href="https://dzisiajv3.vercel.app/streaks" />
        <meta property="og:title" content="Cele - Dzisiaj" />
        <meta
          property="og:description"
          content="Twórz i zarządzaj celami."
        />
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex flex-nowrap justify-between gap-2">
            Cele&nbsp;
          </h2>

            {!showForm && <AddButton onClick={() => setShowForm(true)} type="button" />}
          </div>

        {showForm && (
            <StreakForm
              onChange={handleFormChange}
              onCancel={() => setShowForm(false)}
            />
        )}
        {(loading) && (<LoadingState />)}
        {streaks ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streaks.map((streak) => (
              <StreakCard
                key={streak.id}
                streak={streak}
                onDelete={handleDelete}
                onEdit={handleEdit}
                getMilestoneMessage={getMilestoneMessage} 
              />
            ))}
          </div>
        ) : (
          
          <NoResultsState text="celów"/>
        
        )}
    </Layout>
    </>
  );
}

StreaksPage.auth = true;
