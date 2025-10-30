"use client";

import React, { useMemo, useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { PlusCircleIcon, Loader2 } from "lucide-react";
import { useDaySchemas } from "../../hooks/useDaySchemas";
import DaySchemaForm from "../../components/daySchema/daySchemaForm";
import { Schema } from "../../types";

export default function DaySchemaPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email || "f.niemczewski2@gmail.com";
  const { schemas, loading, refresh } = useDaySchemas();
  const [editing, setEditing] = useState<Schema | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const now = new Date();
  const currentTime = format(now, "HH:mm");
  const currentDay = now.getDay(); // 0 = Sunday
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const activeSchema = schemas?.find((schema) => schema.days.includes(currentDay)) || null;

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

        {(!session || loading) && (
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
          </div>
        )}

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

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">
            {activeSchema ? `Aktywny schemat: ${activeSchema.name}` : "Brak przypisanego schematu na dziś"}
          </h3>
          <div className="relative border-l-2 border-gray-300 pl-4">
            {timeSlots.map((slot) => {
              const item = activeSchema?.items?.find((i) => i.time === slot);
              const isNow = slot === currentTime;

              return (
                <div key={slot} className="relative mb-2">
                  {isNow && (
                    <div className="absolute -left-4 top-1 h-0.5 w-[calc(100%+1rem)] bg-red-500 z-10" />
                  )}
                  <div className="flex items-center space-x-4">
                    <span className={`text-sm w-16 ${isNow ? "text-red-600 font-bold" : "text-gray-500"}`}>
                      {slot}
                    </span>
                    <span className={`text-base ${item ? "text-gray-800" : "text-gray-300 italic"}`}>
                      {item?.label || "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Layout>
    </>
  );
}

function generateTimeSlots(start = 7, end = 23, interval = 15): string[] {
  const slots: string[] = [];
  for (let h = start; h <= end; h++) {
    for (let m = 0; m < 60; m += interval) {
      const hour = h.toString().padStart(2, "0");
      const minute = m.toString().padStart(2, "0");
      slots.push(`${hour}:${minute}`);
    }
  }
  return slots;
}
