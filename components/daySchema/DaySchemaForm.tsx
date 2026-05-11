"use client";

import React, { useState, useEffect, SyntheticEvent } from "react";
import { PlusCircle } from "lucide-react";
import { useDaySchemas } from "../../hooks/useDaySchemas";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { DeleteButton, FormButtons, NotifyButton } from "../CommonButtons";

import type { ScheduleItem, Schema } from "../../types";

interface DaySchemaFormProps {
  initialSchema?: Schema | null;
  onSchemaSaved: () => void;
  onCancel?: () => void;
}

const dayLabels = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

export default function DaySchemaForm({
  initialSchema = null,
  onSchemaSaved,
  onCancel,
}: Readonly<DaySchemaFormProps>) {
  const { addSchema, updateSchema } = useDaySchemas();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEdit = !!initialSchema?.id;

  const [schemaName, setSchemaName] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [entries, setEntries] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialSchema) {
      setSchemaName(initialSchema.name);
      setDays(initialSchema.days);
      setEntries(initialSchema.entries);
    }
  }, [initialSchema]);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!schemaName || days.length === 0 || entries.length === 0) {
      toast.error("Uzupełnij nazwę, dni i przynajmniej jeden wpis.");
      return;
    }

    setLoading(true);
    const payload = { name: schemaName.trim(), days, entries };

    await withRetry(
      () => isEdit && initialSchema?.id
        ? updateSchema(initialSchema.id, payload)
        : addSchema(payload as any),
      toast,
      { context: `DaySchemaForm.${isEdit ? "updateSchema" : "addSchema"}`, userId: user?.id }
    );
    toast.success(isEdit ? "Zmieniono pomyślnie." : "Dodano pomyślnie.");
    setLoading(false);
    onSchemaSaved();
    onCancel?.();
  };

  const toggleDay = (day: number) =>
    setDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);

  const handleEntryChange = <K extends keyof ScheduleItem>(
    index: number,
    field: K,
    value: ScheduleItem[K]
  ) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const addEntry = () => setEntries([...entries, { id: crypto.randomUUID(), time: "", label: "" }]);
  const removeEntry = (index: number) => setEntries(entries.filter((_, i) => i !== index));

  return (
    <form onSubmit={handleSubmit} className="form-card max-w-lg">
      <div>
        <label htmlFor="name" className="form-label">Nazwa schematu:</label>
        <input id="name" type="text" value={schemaName}
          onChange={(e) => setSchemaName(e.target.value)}
          className="input-field" required />
      </div>

      <div>
        <label htmlFor="weekdays" className="form-label">Dni tygodnia:</label>
        <div id="weekdays" className="flex flex-wrap gap-2">
          {dayLabels.map((label, i) => (
            <button key={label} type="button" onClick={() => toggleDay(i)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                days.includes(i)
                  ? "bg-secondary border-primary text-white"
                  : "bg-surface border-gray-200 dark:border-gray-700 text-textSecondary hover:bg-surfaceHover"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="form-label">Wpisy:</div>
        <div className="space-y-2">
          {entries.map((entry, i) => (
           
            <div key={entry.id} className="flex w-full gap-2 items-center">
              <label htmlFor={`time-${i}`} className="sr-only">Godzina</label>
              <input id={`time-${i}`} type="time" value={entry.time}
                onChange={(e) => handleEntryChange(i, "time", e.target.value)}
                className="input-field w-[80px]" required />
              
              <label htmlFor={`label-${i}`} className="sr-only">Etykieta</label>
              <input id={`label-${i}`} type="text" value={entry.label} placeholder="Etykieta"
                onChange={(e) => handleEntryChange(i, "label", e.target.value)}
                className="input-field w-full" required />
              
              <NotifyButton 
                onClick={() => handleEntryChange(i, "notify", !entry.notify)} 
                small 
                disabled={!!entry.notify} 
              />
              <DeleteButton onClick={() => removeEntry(i)} small />
            </div>
          ))}
        </div>
        <button type="button" onClick={addEntry}
          className="flex items-center text-sm font-medium text-primary hover:text-secondary transition-colors mt-3">
          <PlusCircle className="mr-1.5 w-4 h-4" /> Dodaj nowy wpis
        </button>
      </div>
      <FormButtons onClickClose={onCancel} loading={loading} />
    </form>
  );
}