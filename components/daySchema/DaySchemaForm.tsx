"use client";

import React, { useState, useEffect, SyntheticEvent } from "react";
import { PlusCircle } from "lucide-react";
import { useDaySchemas } from "../../hooks/useDaySchemas";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import LoadingState from "../LoadingState";
import { AddButton, SaveButton, CancelButton, DeleteButton, FormButtons } from "../CommonButtons";

export interface DaySchemaEntry {
  time: string;
  label: string;
}

export interface DaySchema {
  id?: string;
  name: string;
  days: number[];
  entries: DaySchemaEntry[];
}

interface DaySchemaFormProps {
  initialSchema?: DaySchema | null;
  onSchemaSaved: () => void;
  onCancel?: () => void;
}

const dayLabels = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

export default function DaySchemaForm({
  initialSchema = null,
  onSchemaSaved,
  onCancel,
}: DaySchemaFormProps) {
  const { addSchema, updateSchema } = useDaySchemas();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEdit = !!initialSchema?.id;

  const [schemaName, setSchemaName] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [entries, setEntries] = useState<DaySchemaEntry[]>([]);
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

  const handleEntryChange = (index: number, field: keyof DaySchemaEntry, value: string) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  const addEntry = () => setEntries([...entries, { time: "", label: "" }]);
  const removeEntry = (index: number) => setEntries(entries.filter((_, i) => i !== index));

  return (
    <form onSubmit={handleSubmit} className="form-card max-w-lg">
      <div>
        <label className="form-label">Nazwa schematu:</label>
        <input type="text" value={schemaName}
          onChange={(e) => setSchemaName(e.target.value)}
          className="input-field" required />
      </div>

      <div>
        <label className="form-label">Dni tygodnia:</label>
        <div className="flex flex-wrap gap-2">
          {dayLabels.map((label, i) => (
            <button key={i} type="button" onClick={() => toggleDay(i)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                days.includes(i)
                  ? "bg-primary border-primary text-white"
                  : "bg-surface border-gray-200 dark:border-gray-700 text-textSecondary hover:bg-surfaceHover"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label">Wpisy:</label>
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div key={i} className="flex w-full gap-2 items-center">
              <input type="time" value={entry.time}
                onChange={(e) => handleEntryChange(i, "time", e.target.value)}
                className="input-field w-[80px]" required />
              <input type="text" value={entry.label} placeholder="Etykieta"
                onChange={(e) => handleEntryChange(i, "label", e.target.value)}
                className="input-field w-full" required />
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
