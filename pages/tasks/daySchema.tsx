// pages/tasks/daySchema.tsx

import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { useDaySchemas } from "@/hooks/db/useDaySchemas";
import { Schema, ScheduleItem } from "@/types/schemas";
import { getAppDateTime } from "@/lib/dateUtils";
import DaySchemaForm from "@/components/daySchema/DaySchemaForm";
import { defaultSchemaFor } from "@/lib/daySchemas";
import { AddButton, EditButton, DeleteButton } from "@/components/ui/CommonButtons";
import NoResultsState from "@/components/ui/NoResultsState";
import { SkeletonDaySchema } from "@/components/ui/Skeleton";
import Seo from "@/components/ui/SEO";

export default function DaySchemaPage() {
  const { schemas, loading, fetching, fetchSchemas, deleteSchema } = useDaySchemas();
  const [editing, setEditing] = useState<Schema | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const now = getAppDateTime();
  const currentTime = format(now, "HH:mm");
  const currentDay = (now.getDay() + 6) % 7;

  const activeSchema = defaultSchemaFor(schemas ?? [], currentDay);

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
      <Seo
        title="Schemat dnia"
        description="Ułóż stały plan dnia z godzinami, np. poranną i wieczorną rutynę, i korzystaj z niego w widoku dnia."
        canonical="https://dzisiaj.fun/tasks/daySchema"
        keywords="schemat dnia, rutyna, planowanie, nawyki, harmonogram dnia"
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="page-title">Plan dnia</h1>
        {!showForm && <AddButton onClick={openNew} />}
      </div>

      {showForm && (
        <section className="mb-6">
          <DaySchemaForm
            initialSchema={editing}
            onCancel={closeForm}
            onSchemaSaved={() => {
              void fetchSchemas();
              closeForm();
            }}
          />
        </section>
      )}

      {fetching ? (
        <SkeletonDaySchema rows={4} />
      ) : (
        <ul className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {schemas.map((schema) => (
            <li
              key={schema.id}
              className="card flex items-center justify-between rounded-card border border-line p-3 shadow-sm"
            >
              <span className="ml-1 flex flex-wrap items-center gap-2">
                <span className="font-bold text-text">{schema.name}</span>
                {schema.is_default && (
                  <span className="rounded-full border border-line px-2 py-0.5 text-sm text-text-secondary">
                    domyślny
                  </span>
                )}
              </span>
              <div className="flex shrink-0 gap-1.5">
                <EditButton onClick={() => openEdit(schema)} />
                <DeleteButton onClick={() => deleteSchema(schema.id || "")} />
              </div>
            </li>
          ))}
          {schemas.length === 0 && !loading && <NoResultsState text="schematów dnia" />}
        </ul>
      )}

      <div className="card mb-6 rounded-card p-5 shadow-sm">
        {sortedEntries.length > 0 ? (
          <div className="relative border-line py-2">
            <CurrentTimeLine entries={sortedEntries} currentTime={currentTime} />

            {sortedEntries.map((entry) => (
              <div key={entry.time} className="relative mb-3 flex items-center space-x-2">
                <span className="flex h-6 w-12 shrink-0 items-center text-sm font-bold text-text-muted">
                  {entry.time}
                </span>
                <span className="text-lg font-medium text-text">{entry.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-2 text-sm font-medium text-text-muted">
            Ten schemat nie ma jeszcze żadnych punktów w planie dnia.
          </p>
        )}
      </div>
    </>
  );
}

function CurrentTimeLine({ entries, currentTime }: { readonly entries: ScheduleItem[]; readonly currentTime: string }) {
  const slotHeight = 36;
  const index = entries.findIndex((entry) => entry.time >= currentTime);
  const offset = index >= 0 ? index * slotHeight : entries.length * slotHeight;

  return (
    <div className="absolute left-0 z-10 w-full transition-all duration-500 ease-in-out" style={{ top: offset + 8 }}>
      <div className="absolute -left-4 h-0.5 w-[calc(100%+1rem)] bg-danger-solid opacity-80" />
      <div className="absolute -top-1.5 -left-5.25 h-3 w-3 rounded-full bg-danger-solid shadow-sm" />
    </div>
  );
}
