"use client";

import React, { useRef, useState, FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { ReportTask, Report } from "../../types";
import { useReports } from "../../hooks/useReports";
import { getAppDate } from "../../lib/dateUtils";
import LoadingState from "../LoadingState";
import { AddButton, CancelButton } from "../CommonButtons";

interface ReportFormProps {
  onChange: () => void;
  onCancel?: () => void;
  initial?: Report;
}

export default function ReportForm({
  onChange,
  onCancel,
}: ReportFormProps) {
  const { addReport, loading } = useReports();

  const topicRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const [agenda, setAgenda] = useState<string[]>([""]);
  const [participants, setParticipants] = useState<string[]>([""]);
  const [tasks, setTasks] = useState<ReportTask[]>([
    { zadanie: "", data: "", osoba: "" },
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const payload: Report = {
      topic: topicRef.current?.value.trim() || "",
      date: dateRef.current?.value || getAppDate(),
      agenda: agenda.filter(Boolean),
      participants: participants.filter(Boolean),
      tasks: tasks
        .filter((t) => t.zadanie.trim())
        .map((t) => ({
          zadanie: t.zadanie.trim(),
          data: t.data,
          osoba: t.osoba.trim(),
        })),
      notes: notesRef.current?.value.trim() || "",
    } as Report;


    await addReport(payload);
    onChange();
      topicRef.current!.value = "";
      dateRef.current!.value = getAppDate();
      notesRef.current!.value = "";
      setAgenda([""]);
      setParticipants([""]);
      setTasks([{ zadanie: "", data: "", osoba: "" }]);

    if (onCancel) onCancel();
  };

  const removeAgendaItem = (index: number) => {
    if (agenda.length > 1) {
      setAgenda(agenda.filter((_, i) => i !== index));
    }
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-card p-4 rounded-xl shadow max-w-2xl"
    >
      <div>
        <label className="block text-sm font-medium mb-1">
          Temat spotkania:
        </label>
        <input
          ref={topicRef}
          className="w-full border p-2 rounded focus:ring-2 focus:ring-primary"
          required
          disabled={loading}
          placeholder="Wprowadź temat spotkania"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Data:</label>
        <input
          ref={dateRef}
          type="date"
          className="w-full border p-2 rounded focus:ring-2 focus:ring-primary"
          required
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agenda */}
        <div>
          <label className="block text-sm font-medium mb-1">Agenda:</label>
          <div className="space-y-2">
            {agenda.map((a, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="flex-1 border p-2 rounded focus:ring-2 focus:ring-primary"
                  value={a}
                  onChange={(e) => {
                    const copy = [...agenda];
                    copy[i] = e.target.value;
                    setAgenda(copy);
                  }}
                  placeholder={`Punkt ${i + 1}`}
                  disabled={loading}
                />
                {agenda.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAgendaItem(i)}
                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
                    title="Usuń"
                    disabled={loading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAgenda([...agenda, ""])}
            className="inline-flex items-center text-primary hover:text-secondary mt-2 transition-colors"
            disabled={loading}
          >
            Dodaj&nbsp;
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Uczestnicy */}
        <div>
          <label className="block text-sm font-medium mb-1">Uczestnicy:</label>
          <div className="space-y-2">
            {participants.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="flex-1 border p-2 rounded focus:ring-2 focus:ring-primary"
                  value={p}
                  onChange={(e) => {
                    const copy = [...participants];
                    copy[i] = e.target.value;
                    setParticipants(copy);
                  }}
                  placeholder={`Uczestnik ${i + 1}`}
                  disabled={loading}
                />
                {participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParticipant(i)}
                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
                    title="Usuń"
                    disabled={loading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setParticipants([...participants, ""])}
            className="inline-flex items-center text-primary hover:text-secondary mt-2 transition-colors"
            disabled={loading}
          >
            Dodaj&nbsp;
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Zadania:</label>
        <div className="space-y-3">
          {tasks.map((t, i) => (
            <div key={i} className="p-3 border rounded-lg bg-gray-50 space-y-2">
              <div className="flex gap-2">
                <input
                  placeholder="Zadanie"
                  className="flex-1 border p-2 rounded focus:ring-2 focus:ring-primary bg-white"
                  value={t.zadanie}
                  onChange={(e) => {
                    const copy = [...tasks];
                    copy[i].zadanie = e.target.value;
                    setTasks(copy);
                  }}
                  disabled={loading}
                />
                {tasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTask(i)}
                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
                    title="Usuń zadanie"
                    disabled={loading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  className="border p-2 rounded focus:ring-2 focus:ring-primary bg-white"
                  value={t.data}
                  onChange={(e) => {
                    const copy = [...tasks];
                    copy[i].data = e.target.value;
                    setTasks(copy);
                  }}
                  disabled={loading}
                />
                <input
                  placeholder="Osoba odpowiedzialna"
                  className="border p-2 rounded focus:ring-2 focus:ring-primary bg-white"
                  value={t.osoba}
                  onChange={(e) => {
                    const copy = [...tasks];
                    copy[i].osoba = e.target.value;
                    setTasks(copy);
                  }}
                  disabled={loading}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setTasks([...tasks, { zadanie: "", data: "", osoba: "" }])
            }
            className="inline-flex items-center text-primary hover:text-secondary transition-colors"
            disabled={loading}
          >
            Dodaj&nbsp;
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notatki:</label>
        <textarea
          ref={notesRef}
          className="w-full border p-2 rounded focus:ring-2 focus:ring-primary"
          rows={6}
          placeholder="Dodatkowe notatki ze spotkania..."
          disabled={loading}
        />
      </div>

      <div className="flex gap-2 items-center">
        <AddButton loading={loading} />
        {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}