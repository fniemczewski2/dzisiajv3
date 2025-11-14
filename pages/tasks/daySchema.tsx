"use client";

import React, { useMemo, useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { format } from "date-fns";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { PlusCircleIcon, Loader2, Edit2, Trash2 } from "lucide-react";
import { useDaySchemas } from "../../hooks/useDaySchemas";
import DaySchemaForm from "../../components/daySchema/daySchemaForm";
import { Schema, ScheduleItem } from "../../types";
import { getAppDateTime } from "../../lib/dateUtils";

export default function DaySchemaPage() {
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const { schemas, loading, refresh, deleteSchema } = useDaySchemas();
  const [editing, setEditing] = useState<Schema | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const now = getAppDateTime();
  const currentTime = format(now, "HH:mm");
  const currentDay = now.getDay(); // 0 = Sunday

  const activeSchema = schemas?.find((schema) => schema.days.includes(currentDay)) || null;

  const sortedEntries: ScheduleItem[] = useMemo(() => {
    if (!activeSchema?.entries) return [];
    return [...activeSchema.entries].sort((a, b) => a.time.localeCompare(b.time));
  }, [activeSchema]);

  const openNew = () => {
    setEditing(undefined);
    setShowForm(true);
  };

  const openEdit = (schema: Schema) => {
    setEditing(schema);
    setShowForm(true);
  };

  const closeForm = () => {
    setEditing(undefined);
    setShowForm(false);
  };

  return (
    <>
      <Head>
        <title>Plan dnia – Dzisiaj</title>
        <meta name="description" content="Zarządzaj swoimi codziennymi schematami." />
        <link rel="canonical" href="https://dzisiajv3.vercel.app/notes/daySchema" />
        <meta property="og:title" content="Plan dnia – Dzisiaj" />
        <meta property="og:description" content="Zarządzaj swoimi codziennymi schematami." />
      </Head>

      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Plan dnia</h2>
          {!showForm && (
            <button
              onClick={openNew}
              className="px-3 py-1.5 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
            >
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {showForm && (
          <section className="mb-6">
            <DaySchemaForm
              userEmail={userEmail}
              initialSchema={editing}
              onCancel={closeForm}
              onSchemaSaved={() => {
                refresh();
                closeForm();
              }}
            />
          </section>
        )}

        <ul className="mb-4 flex sm:flex-row flex-wrap flex-col gap-2">
            {schemas.map((schema) => (
            <li
                key={schema.id}
                className="flex flex-1 justify-between items-center bg-gray-50 px-3 py-2 rounded-xl border"
            >
                <span>{schema.name}</span>
                <div className="flex gap-2 flex-row">
                <button
                onClick={() => openEdit(schema)}
                className="flex flex-col px-1.5 items-center justify-center rounded-lg text-primary hover:text-secondary transition-colors"
                >
                
                <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[9px] sm:text-[11px]">Edytuj</span>
                </button>
                <button
                    onClick={async () => {
                        if (confirm(`Na pewno usunąć schemat "${schema.name}"?`)) {
                      await deleteSchema(schema.id || "");
                        }
                    }}
                    className="flex flex-col px-1.5 items-center justify-center rounded-lg text-red-600 hover:text-red-800 transition-colors"
                    >
                    <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[9px] sm:text-[11px]">Usuń</span>
                </button>
                </div>
            </li>
            ))}
        </ul>



        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">
            {activeSchema ? `Schemat: ${activeSchema.name}` : "Brak przypisanego schematu na dziś"}
          </h3>

          <div className="relative border-l-2 border-gray-300 pl-4">
            <CurrentTimeLine entries={sortedEntries} currentTime={currentTime} />

            {sortedEntries.map((entry) => (
              <div key={entry.time} className="relative mb-2 flex items-center space-x-4">
                <span className="text-sm w-16 text-gray-500">{entry.time}</span>
                <span className="text-base text-gray-800">{entry.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    </>
  );
}

function CurrentTimeLine({
  entries,
  currentTime,
}: {
  entries: ScheduleItem[];
  currentTime: string;
}) {
  const slotHeight = 32; // px
  const index = entries.findIndex((entry) => entry.time >= currentTime);
  const offset = index >= 0 ? index * slotHeight : entries.length * slotHeight;

  return (
    <div className="absolute left-0 w-full z-10" style={{ top: offset }}>
      <div className="absolute -left-4 h-0.5 w-[calc(100%+1rem)] bg-red-500" />
    </div>
  );
}
