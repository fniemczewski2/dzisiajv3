"use client";

import React, { useRef, useState, SyntheticEvent } from "react";
import { Plus, X } from "lucide-react";
import { Report } from "../../types";
import { useReports } from "../../hooks/useReports";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { getAppDate } from "../../lib/dateUtils";
import { FormButtons } from "../CommonButtons";

interface ReportFormProps {
  onChange: () => void;
  onCancel?: () => void;
  initial?: Report;
}

const createItem = (value = "") => ({ id: crypto.randomUUID(), value });
const createTask = () => ({ id: crypto.randomUUID(), zadanie: "", data: "", osoba: "" });

export default function ReportForm({ onChange, onCancel }: Readonly<ReportFormProps>) {
  const { addReport, loading } = useReports();
  const { toast } = useToast();
  const { user } = useAuth();

  const topicRef = useRef<HTMLInputElement>(null);
  const dateRef  = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const [agenda, setAgenda] = useState([createItem()]);
  const [participants, setParticipants] = useState([createItem()]);
  const [tasks, setTasks] = useState([createTask()]);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const payload: Report = {
      topic: topicRef.current?.value.trim() || "",
      date: dateRef.current?.value || getAppDate(),
      agenda: agenda.map(a => a.value.trim()).filter(Boolean),
      participants: participants.map(p => p.value.trim()).filter(Boolean),
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
    
    setAgenda([createItem()]); 
    setParticipants([createItem()]); 
    setTasks([createTask()]);
    
    onChange();
    onCancel?.();
  };

  const removeItem = (arr: any[], setter: any, idToRemove: string) => {
    if (arr.length > 1) setter(arr.filter((item) => item.id !== idToRemove));
  };

  return (
    <form onSubmit={handleSubmit} className="form-card flex flex-col max-w-2xl gap-2 md:gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
        <div>
          <label htmlFor="report-topic" className="form-label">Temat spotkania:</label>
          <input id="report-topic" ref={topicRef} className="input-field" required disabled={loading} placeholder="np. Tygodniowy status" />
        </div>
        <div>
          <label htmlFor="report-date" className="form-label">Data:</label>
          <input id="report-date" ref={dateRef} type="date" defaultValue={getAppDate()}
            className="input-field w-full min-w-0 px-1 text-xs" required disabled={loading} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
        <div>
          <div className="form-label">Agenda:</div>
          <div className="space-y-2 md:space-y-4">
            {agenda.map((a, i) => (
              <div key={a.id} className="flex gap-2">
                <input className="input-field" value={a.value} aria-label={`Punkt agendy ${i + 1}`}
                  onChange={(e) => { const c = [...agenda]; c[i].value = e.target.value; setAgenda(c); }}
                  placeholder={`Punkt agendy ${i + 1}`} disabled={loading} />
                {agenda.length > 1 && (
                  <button type="button" onClick={() => removeItem(agenda, setAgenda, a.id)} className="text-textMuted hover:text-red-500 shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setAgenda([...agenda, createItem()])}
            className="text-sm font-medium text-primary hover:text-secondary mt-2 flex items-center">
            <Plus className="w-4 h-4 mr-1" /> Dodaj punkt
          </button>
        </div>
        <div>
          <div className="form-label">Uczestnicy:</div>
          <div className="space-y-2 md:space-y-4">
            {participants.map((p, i) => (
              <div key={p.id} className="flex gap-2">
                <input className="input-field" value={p.value} aria-label={`Uczestnik ${i + 1}`}
                  onChange={(e) => { const c = [...participants]; c[i].value = e.target.value; setParticipants(c); }}
                  placeholder={`Uczestnik ${i + 1}`} disabled={loading} />
                {participants.length > 1 && (
                  <button type="button" onClick={() => removeItem(participants, setParticipants, p.id)} className="text-textMuted hover:text-red-500 shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setParticipants([...participants, createItem()])}
            className="text-sm font-medium text-primary hover:text-secondary mt-2 flex items-center">
            <Plus className="w-4 h-4 mr-1" /> Dodaj osobę
          </button>
        </div>
      </div>

      <div>
        <div className="form-label">Zadania po spotkaniu:</div>
        <div className="space-y-2 md:space-y-4">
          {tasks.map((t, i) => (
            <div key={t.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-surface space-y-3">
              <div className="flex gap-2">
                <input placeholder="Treść zadania" aria-label="Treść zadania" className="input-field bg-card" value={t.zadanie}
                  onChange={(e) => { const c = [...tasks]; c[i].zadanie = e.target.value; setTasks(c); }}
                  disabled={loading} />
                {tasks.length > 1 && (
                  <button type="button" onClick={() => removeItem(tasks, setTasks, t.id)} className="text-textMuted hover:text-red-500 shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="date" aria-label="Data wykonania zadania" className="input-field bg-card w-full min-w-0 px-1 text-xs" value={t.data}
                  onChange={(e) => { const c = [...tasks]; c[i].data = e.target.value; setTasks(c); }} disabled={loading} />
                <input placeholder="Osoba odpowiedzialna" aria-label="Osoba odpowiedzialna za zadanie" className="input-field bg-card" value={t.osoba}
                  onChange={(e) => { const c = [...tasks]; c[i].osoba = e.target.value; setTasks(c); }} disabled={loading} />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setTasks([...tasks, createTask()])}
            className="text-sm font-medium text-primary hover:text-secondary flex items-center mt-1">
            <Plus className="w-4 h-4 mr-1" /> Dodaj zadanie
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="report-notes" className="form-label">Notatki ze spotkania:</label>
        <textarea id="report-notes" ref={notesRef} className="input-field" rows={5}
          placeholder="Podsumowanie, wnioski..." disabled={loading} />
      </div>

      <FormButtons onClickClose={onCancel} loading={loading} />
    </form>
  );
}