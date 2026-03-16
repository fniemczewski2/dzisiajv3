"use client";

import React, { useRef, useState, SyntheticEvent } from "react";
import { Plus, X } from "lucide-react";
import { ReportTask, Report } from "../../types";
import { useReports } from "../../hooks/useReports";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { getAppDate } from "../../lib/dateUtils";
import LoadingState from "../LoadingState";
import { AddButton, CancelButton } from "../CommonButtons";

interface ReportFormProps {
  onChange: () => void;
  onCancel?: () => void;
  initial?: Report;
}

export default function ReportForm({ onChange, onCancel }: ReportFormProps) {
  const { addReport, loading } = useReports();
  const { toast } = useToast();
  const { user } = useAuth();

  const topicRef = useRef<HTMLInputElement>(null);
  const dateRef  = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const [agenda, setAgenda] = useState<string[]>([""]);
  const [participants, setParticipants] = useState<string[]>([""]);
  const [tasks, setTasks] = useState<ReportTask[]>([{ zadanie: "", data: "", osoba: "" }]);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const payload: Report = {
      topic: topicRef.current?.value.trim() || "",
      date: dateRef.current?.value || getAppDate(),
      agenda: agenda.filter(Boolean),
      participants: participants.filter(Boolean),
      tasks: tasks.filter((t) => t.zadanie.trim()).map((t) => ({
        zadanie: t.zadanie.trim(), data: t.data, osoba: t.osoba.trim(),
      })),
      notes: notesRef.current?.value.trim() || "",
    } as Report;

    await withRetry(
      () => addReport(payload),
      toast,
      { context: "ReportForm.addReport", userId: user?.id }
    );

    toast.success("Dodano pomyślnie.");
    if (topicRef.current) topicRef.current.value = "";
    if (dateRef.current)  dateRef.current.value  = getAppDate();
    if (notesRef.current) notesRef.current.value = "";
    setAgenda([""]); setParticipants([""]); setTasks([{ zadanie: "", data: "", osoba: "" }]);
    onChange();
    onCancel?.();
  };

  const removeItem = (arr: any[], setter: any, index: number) => {
    if (arr.length > 1) setter(arr.filter((_: any, i: number) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="form-card max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Temat spotkania:</label>
          <input ref={topicRef} className="input-field" required disabled={loading} placeholder="np. Tygodniowy status" />
        </div>
        <div>
          <label className="form-label">Data:</label>
          <input ref={dateRef} type="date" defaultValue={getAppDate()}
            className="input-field w-full min-w-0 px-1 text-xs" required disabled={loading} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Agenda:</label>
          <div className="space-y-2">
            {agenda.map((a, i) => (
              <div key={i} className="flex gap-2">
                <input className="input-field" value={a}
                  onChange={(e) => { const c = [...agenda]; c[i] = e.target.value; setAgenda(c); }}
                  placeholder={`Punkt agendy ${i + 1}`} disabled={loading} />
                {agenda.length > 1 && (
                  <button type="button" onClick={() => removeItem(agenda, setAgenda, i)} className="text-textMuted hover:text-red-500">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setAgenda([...agenda, ""])}
            className="text-sm font-medium text-primary hover:text-secondary mt-2 flex items-center">
            <Plus className="w-4 h-4 mr-1" /> Dodaj punkt
          </button>
        </div>
        <div>
          <label className="form-label">Uczestnicy:</label>
          <div className="space-y-2">
            {participants.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input className="input-field" value={p}
                  onChange={(e) => { const c = [...participants]; c[i] = e.target.value; setParticipants(c); }}
                  placeholder={`Uczestnik ${i + 1}`} disabled={loading} />
                {participants.length > 1 && (
                  <button type="button" onClick={() => removeItem(participants, setParticipants, i)} className="text-textMuted hover:text-red-500">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setParticipants([...participants, ""])}
            className="text-sm font-medium text-primary hover:text-secondary mt-2 flex items-center">
            <Plus className="w-4 h-4 mr-1" /> Dodaj osobę
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
        <label className="form-label">Zadania przydzielone po spotkaniu (Action Items):</label>
        <div className="space-y-3">
          {tasks.map((t, i) => (
            <div key={i} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-surface space-y-3">
              <div className="flex gap-2">
                <input placeholder="Treść zadania" className="input-field bg-card" value={t.zadanie}
                  onChange={(e) => { const c = [...tasks]; c[i].zadanie = e.target.value; setTasks(c); }}
                  disabled={loading} />
                {tasks.length > 1 && (
                  <button type="button" onClick={() => removeItem(tasks, setTasks, i)} className="text-textMuted hover:text-red-500 shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="date" className="input-field bg-card w-full min-w-0 px-1 text-xs" value={t.data}
                  onChange={(e) => { const c = [...tasks]; c[i].data = e.target.value; setTasks(c); }} disabled={loading} />
                <input placeholder="Osoba odpowiedzialna" className="input-field bg-card" value={t.osoba}
                  onChange={(e) => { const c = [...tasks]; c[i].osoba = e.target.value; setTasks(c); }} disabled={loading} />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setTasks([...tasks, { zadanie: "", data: "", osoba: "" }])}
            className="text-sm font-medium text-primary hover:text-secondary flex items-center mt-2">
            <Plus className="w-4 h-4 mr-1" /> Dodaj zadanie
          </button>
        </div>
      </div>

      <div>
        <label className="form-label">Notatki ze spotkania:</label>
        <textarea ref={notesRef} className="input-field" rows={5}
          placeholder="Podsumowanie, wnioski..." disabled={loading} />
      </div>

      <div className="flex gap-3 pt-2">
        <AddButton loading={loading} />
        {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}