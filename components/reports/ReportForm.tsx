// components/reports/ReportForm.tsx

import React, { useId, useState, SyntheticEvent, useEffect, useRef } from "react";
import type { NamedReportTemplate, Report } from "@/types/reports";
import { getAppDate } from "@/lib/dateUtils";
import { AddButton, DeleteButton, FormButtons } from "../ui/CommonButtons";

interface ReportFormProps {
  initial?: Report | null;
  templates: readonly NamedReportTemplate[];
  defaultTemplateId: string | null;
  loading: boolean;
  onSubmit: (report: Omit<Report, "id" | "user_id" | "inserted_at" | "updated_at">) => Promise<unknown>;
  onCancel: () => void;
}

type Row = { id: string; value: string };
type TaskRow = { id: string; zadanie: string; data: string; osoba: string; app_task_id?: string | null };

const rowId = () => crypto.randomUUID();
const toRows = (values: readonly string[] | undefined): Row[] =>
  values?.length ? values.map((value) => ({ id: rowId(), value })) : [{ id: rowId(), value: "" }];

const PARTICIPANT_HINTS = ["Moderacja", "Protokół"];

function RowList({
  label,
  rows,
  onChange,
  placeholder,
  disabled,
}: Readonly<{
  label: string;
  rows: Row[];
  onChange: (rows: Row[]) => void;
  addLabel: string;
  placeholder: (i: number) => string;
  disabled: boolean;
}>) {
  return (
    <fieldset className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <legend className="form-label">{label}</legend>
        <AddButton small onClick={() => onChange([...rows, { id: rowId(), value: "" }])} disabled={disabled} />
      </div>
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-2">
            <span aria-hidden="true" className="w-5 shrink-0 text-right text-sm text-text-secondary tabular-nums">
              {i + 1}.
            </span>
            <input
              className="input-field"
              value={r.value}
              aria-label={`${label.replace(":", "")} ${i + 1}`}
              placeholder={placeholder(i)}
              disabled={disabled}
              onChange={(e) => onChange(rows.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)))}
            />
            {rows.length > 1 && (
              <DeleteButton
                small
                onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
                ariaLabel={`Usuń: ${r.value || placeholder(i)}`}
                disabled={disabled}
              />
            )}
          </li>
        ))}
      </ol>
    </fieldset>
  );
}

export default function ReportForm({
  initial,
  templates,
  defaultTemplateId,
  loading,
  onSubmit,
  onCancel,
}: Readonly<ReportFormProps>) {
  const id = useId();
  const topicRef = useRef<HTMLInputElement>(null);

  // Formularz otwiera się na żądanie użytkownika – fokus od razu w pierwszym polu.
  useEffect(() => {
    topicRef.current?.focus();
  }, []);
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [date, setDate] = useState(initial?.date?.slice(0, 10) ?? getAppDate());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [templateId, setTemplateId] = useState(initial?.template_id ?? "");
  const [agenda, setAgenda] = useState<Row[]>(() => toRows(initial?.agenda));
  const [participants, setParticipants] = useState<Row[]>(() => toRows(initial?.participants));
  const [tasks, setTasks] = useState<TaskRow[]>(() =>
    initial?.tasks?.length
      ? initial.tasks.map((t) => ({
          id: rowId(),
          zadanie: t.zadanie,
          data: t.data ?? "",
          osoba: t.osoba ?? "",
          app_task_id: t.app_task_id ?? null,
        }))
      : [{ id: rowId(), zadanie: "", data: "", osoba: "" }]
  );

  const updateTask = (taskId: string, field: keyof Omit<TaskRow, "id">, value: string) =>
    setTasks((list) => list.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)));

  const templatePatch = (): { template_id?: string | null } => {
    if (templateId) return { template_id: templateId };
    return initial?.template_id ? { template_id: null } : {};
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    await onSubmit({
      topic: topic.trim(),
      date: date || getAppDate(),
      agenda: agenda.map((a) => a.value.trim()).filter(Boolean),
      participants: participants.map((p) => p.value.trim()).filter(Boolean),
      tasks: tasks
        .filter((t) => t.zadanie.trim())
        .map((t) => ({
          zadanie: t.zadanie.trim(),
          data: t.data,
          osoba: t.osoba.trim(),
          ...(t.app_task_id ? { app_task_id: t.app_task_id } : {}),
        })),
      notes: notes.trim(),
      ...templatePatch(),
    });
  };

  const defaultName = templates.find((t) => t.id === defaultTemplateId)?.name;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="form-card flex max-w-3xl flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
        <div>
          <label htmlFor={`${id}-topic`} className="form-label">
            Temat spotkania:
          </label>
          <input
            id={`${id}-topic`}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="input-field font-medium"
            required
            disabled={loading}
            placeholder="np. Posiedzenie zarządu"
            ref={topicRef}
          />
        </div>
        <div>
          <label htmlFor={`${id}-date`} className="form-label">
            Data:
          </label>
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field w-full"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <RowList
          label="Agenda:"
          rows={agenda}
          onChange={setAgenda}
          addLabel="Dodaj punkt"
          placeholder={(i) => `Punkt ${i + 1}`}
          disabled={loading}
        />
        <RowList
          label="Osoby na spotkaniu:"
          rows={participants}
          onChange={setParticipants}
          addLabel="Dodaj osobę"
          placeholder={(i) => PARTICIPANT_HINTS[i] ?? `Osoba ${i + 1}`}
          disabled={loading}
        />
      </div>

      <fieldset className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <legend className="form-label">Zadania:</legend>
          <AddButton
            small
            onClick={() => setTasks((list) => [...list, { id: rowId(), zadanie: "", data: "", osoba: "" }])}
            disabled={loading}
          />
        </div>
        <ul className="space-y-2">
          {tasks.map((t, i) => (
            <li
              key={t.id}
              className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_9.5rem_12rem_auto] sm:items-center"
            >
              <div className="flex items-center gap-2">
                <input
                  className="input-field"
                  value={t.zadanie}
                  onChange={(e) => updateTask(t.id, "zadanie", e.target.value)}
                  placeholder="Treść zadania"
                  aria-label={`Zadanie ${i + 1}`}
                  disabled={loading}
                />
                <DeleteButton
                  onClick={() => setTasks((list) => list.filter((x) => x.id !== t.id))}
                  ariaLabel={`Usuń zadanie ${i + 1}`}
                  small
                  disabled={loading || tasks.length <= 1}
                />
              </div>
              <input
                type="date"
                className="input-field w-full"
                value={t.data}
                onChange={(e) => updateTask(t.id, "data", e.target.value)}
                aria-label={`Termin zadania ${i + 1}`}
                disabled={loading}
              />
              <input
                className="input-field"
                value={t.osoba}
                onChange={(e) => updateTask(t.id, "osoba", e.target.value)}
                placeholder="Osoba odpowiedzialna"
                aria-label={`Osoba odpowiedzialna za zadanie ${i + 1}`}
                disabled={loading}
              />
            </li>
          ))}
        </ul>
      </fieldset>

      <div>
        <label htmlFor={`${id}-notes`} className="form-label">
          Notatki ze spotkania:
        </label>
        <textarea
          id={`${id}-notes`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input-field"
          rows={5}
          placeholder="Podsumowanie, ustalenia, wnioski…"
          disabled={loading}
        />
      </div>

      {templates.length > 0 && (
        <div className="max-w-sm">
          <label htmlFor={`${id}-tpl`} className="form-label">
            Szablon PDF:
          </label>
          <select
            id={`${id}-tpl`}
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="input-field"
            disabled={loading}
          >
            <option value="">Domyślny{defaultName ? ` (${defaultName})` : ""}</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <FormButtons onClickClose={onCancel} loading={loading} />
    </form>
  );
}
