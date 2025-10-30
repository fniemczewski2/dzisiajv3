"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { PlusCircle, Trash2, Save, Loader2, PlusCircleIcon } from "lucide-react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useDaySchemas } from "../../hooks/useDaySchemas";

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
  userEmail: string;
  initialSchema?: DaySchema | null;
  onSchemaSaved: () => void;
  onCancel?: () => void;
}

const dayLabels = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

export default function DaySchemaForm({
  userEmail,
  initialSchema = null,
  onSchemaSaved,
  onCancel,
}: DaySchemaFormProps) {
  const { addSchema, updateSchema } = useDaySchemas();
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!schemaName || days.length === 0 || entries.length === 0) {
      alert("Uzupełnij nazwę, dni i przynajmniej jeden wpis.");
      return;
    }

    setLoading(true);

    const payload = {
      name: schemaName.trim(),
      days,
      entries,
      user_name: userEmail
    };

    if (isEdit && initialSchema?.id) {
      await updateSchema(initialSchema.id, payload);
    } else {
      await addSchema(payload);
    }

    setLoading(false);
    onSchemaSaved();
    if (onCancel) onCancel();
  };

  const toggleDay = (day: number) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleEntryChange = (index: number, field: keyof DaySchemaEntry, value: string) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  const addEntry = () => {
    setEntries([...entries, { time: "", label: "" }]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card p-4 rounded-xl shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nazwa schematu:</label>
        <input
          type="text"
          value={schemaName}
          onChange={(e) => setSchemaName(e.target.value)}
          className="mt-1 w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dni tygodnia:</label>
        <div className="flex gap-2">
          {dayLabels.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={`px-2 py-1 rounded border ${
                days.includes(i) ? "bg-blue-600 text-white" : "bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Wpisy:</label>
        {entries.map((entry, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="time"
              value={entry.time}
              onChange={(e) => handleEntryChange(i, "time", e.target.value)}
              className="p-2 border rounded w-[100px]"
              required
            />
            <input
              type="text"
              value={entry.label}
              onChange={(e) => handleEntryChange(i, "label", e.target.value)}
              className="flex-1 p-2 border rounded"
              required
            />
            <button
              type="button"
              onClick={() => removeEntry(i)}
              className="text-red-500 hover:text-red-700"
              title="Usuń wpis"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addEntry}
          className="flex items-center text-blue-600 hover:underline"
        >
          Dodaj
          <PlusCircle className="ml-2 w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-3 items-center">
        <button
          type="submit"
          className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-lg flex items-center gap-2"
        >
        {isEdit ? (
            <>
              Zapisz&nbsp;
              <Save className="w-5 h-5" />
            </>
          ) : (
            <>
              Dodaj&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </>
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg"
          >
            Anuluj
          </button>
        )}
        {loading && <Loader2 className="animate-spin w-6 h-6 text-gray-500" />}
      </div>
    </form>
  );
}
