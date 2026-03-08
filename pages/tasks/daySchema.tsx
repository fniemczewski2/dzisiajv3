"use client";

import React, { useMemo, useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { format } from "date-fns";
import { useDaySchemas } from "../../hooks/useDaySchemas";
import { Schema, ScheduleItem } from "../../types";
import { getAppDateTime } from "../../lib/dateUtils";
import DaySchemaForm from "../../components/daySchema/DaySchemaForm";
import LoadingState from "../../components/LoadingState";
import { AddButton, EditButton, DeleteButton } from "../../components/CommonButtons";

export default function DaySchemaPage() {
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text">Plan dnia</h2>
          {!showForm && <AddButton onClick={openNew} type="button" />}
        </div>

        {loading && <LoadingState />}

        {showForm && (
          <section className="mb-6">
            <DaySchemaForm
              initialSchema={editing}
              onCancel={closeForm}
              onSchemaSaved={() => {
                refresh();
                closeForm();
              }}
            />
          </section>
        )}

        <ul className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {schemas.map((schema) => (
            <li
                key={schema.id}
                className="flex justify-between items-center bg-card p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm"
            >
                <span className="font-bold text-text ml-1">{schema.name}</span>
                <div className="flex gap-1.5 shrink-0">
                  <EditButton onClick={() => openEdit(schema)} />
                  <DeleteButton onClick={async () => {
                        if (confirm(`Na pewno usunąć schemat "${schema.name}"?`)) {
                          await deleteSchema(schema.id || "");
                        }
                    }} 
                  />
                </div>
            </li>
            ))}
            {schemas.length === 0 && !loading && (
              <li className="col-span-full text-center py-8 text-textMuted font-medium bg-surface border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                Brak zapisanych schematów. Dodaj swój pierwszy!
              </li>
            )}
        </ul>

        <div className="mb-6 bg-card border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold text-text mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
            {activeSchema ? `Aktywny: ${activeSchema.name}` : "Brak przypisanego schematu na dziś"}
          </h3>

          {sortedEntries.length > 0 ? (
            <div className="relative border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-2">
              <CurrentTimeLine entries={sortedEntries} currentTime={currentTime} />

              {sortedEntries.map((entry) => (
                <div key={entry.time} className="relative mb-3 flex items-center space-x-4">
                  <span className="text-sm font-bold text-textMuted w-12 shrink-0">{entry.time}</span>
                  <span className="text-base font-medium text-text">{entry.label}</span>
                </div>
              ))}
            </div>
          ) : (
             <p className="text-textMuted text-sm font-medium py-2">Ten schemat nie ma jeszcze żadnych punktów w planie dnia.</p>
          )}
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
  const slotHeight = 36; // px (dostosowane do nowego mb-3)
  const index = entries.findIndex((entry) => entry.time >= currentTime);
  const offset = index >= 0 ? index * slotHeight : entries.length * slotHeight;

  return (
    <div className="absolute left-0 w-full z-10 transition-all duration-500 ease-in-out" style={{ top: offset + 8 }}>
      <div className="absolute -left-4 h-0.5 w-[calc(100%+1rem)] bg-red-500 dark:bg-red-400 opacity-80" />
      <div className="absolute -left-[21px] -top-1.5 w-3 h-3 bg-red-500 dark:bg-red-400 rounded-full shadow-sm" />
    </div>
  );
}
DaySchemaPage.auth = true;