// components/daySchema/DaySchemaForm.tsx

import React, { useState, useEffect, SyntheticEvent } from "react";
import { useDaySchemas } from "@/hooks/db/useDaySchemas";
import { AddButton, DeleteButton, FormButtons, NotifyButton } from "../ui/CommonButtons";
import type { ScheduleItem, Schema } from "@/types/schemas";

interface DaySchemaFormProps {
  initialSchema?: Schema | null;
  onSchemaSaved: () => void;
  onCancel?: () => void;
}

const dayLabels = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

export default function DaySchemaForm({ initialSchema = null, onSchemaSaved, onCancel }: Readonly<DaySchemaFormProps>) {
  const { addSchema, updateSchema } = useDaySchemas();
  const isEdit = !!initialSchema?.id;

  const [schemaName, setSchemaName] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [entries, setEntries] = useState<ScheduleItem[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialSchema) {
      setSchemaName(initialSchema.name);
      setDays(initialSchema.days);
      setEntries(initialSchema.entries);
      setIsDefault(Boolean(initialSchema.is_default));
    }
  }, [initialSchema]);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    setLoading(true);
    const payload = { name: schemaName.trim(), days, entries, is_default: isDefault };

    if (isEdit && initialSchema?.id) {
      await updateSchema(initialSchema.id, payload);
    } else {
      await addSchema(payload);
    }
    setLoading(false);
    onSchemaSaved();
    onCancel?.();
  };
  const toggleDay = (day: number) =>
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  const handleEntryChange = <K extends keyof ScheduleItem>(index: number, field: K, value: ScheduleItem[K]) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const addEntry = () => setEntries([...entries, { id: crypto.randomUUID(), time: "", label: "" }]);
  const removeEntry = (index: number) => setEntries(entries.filter((_, i) => i !== index));

  return (
    <form onSubmit={handleSubmit} className="form-card max-w-lg">
      <div>
        <label htmlFor="name" className="form-label">
          Nazwa schematu:
        </label>
        <input
          id="name"
          type="text"
          value={schemaName}
          onChange={(e) => setSchemaName(e.target.value)}
          className="input-field"
          required
        />
      </div>

      <fieldset>
        <legend className="form-label">Dni tygodnia:</legend>
        <div className="flex flex-wrap gap-2">
          {dayLabels.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => toggleDay(i)}
              aria-pressed={days.includes(i)}
              className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm font-medium transition-colors ${
                days.includes(i)
                  ? "border-primary bg-secondary text-white"
                  : "border-line bg-surface text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex items-start gap-3">
        <input
          id="schema-default"
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0"
          aria-describedby="schema-default-hint"
        />
        <div>
          <label htmlFor="schema-default" className="cursor-pointer font-medium text-text">
            Domyślny w wybrane dni
          </label>
          <p id="schema-default-hint" className="text-sm text-text-secondary">
            Gdy kilka schematów obejmuje ten sam dzień, ten wybierze się sam. Na planie dnia zmienisz go na inny.
          </p>
        </div>
      </div>

      <div>
        <div className="form-label">Wpisy:</div>
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div key={entry.id} className="flex w-full items-center gap-2">
              <label htmlFor={`time-${entry.time}`} className="sr-only">
                Godzina
              </label>
              <input
                id={`time-${entry.time}`}
                type="time"
                value={entry.time}
                onChange={(e) => handleEntryChange(i, "time", e.target.value)}
                className="input-field w-20"
                required
              />

              <label htmlFor={`label-${entry.label}`} className="sr-only">
                Etykieta
              </label>
              <input
                id={`label-${entry.label}`}
                type="text"
                value={entry.label}
                placeholder="Etykieta"
                onChange={(e) => handleEntryChange(i, "label", e.target.value)}
                className="input-field w-full"
                required
              />

              <NotifyButton
                onClick={() => handleEntryChange(i, "notify", !entry.notify)}
                small
                disabled={!!entry.notify}
              />
              <DeleteButton onClick={() => removeEntry(i)} small />
            </div>
          ))}
        </div>
        <AddButton onClick={addEntry} small />
      </div>
      <FormButtons onClickClose={onCancel} loading={loading} />
    </form>
  );
}
