"use client";

import React, { useRef, useEffect, useState, FormEvent } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, Plus, PlusCircleIcon, Save } from "lucide-react";
import { ReportTask, Report } from "../../types";
import { getAppDate, getAppDateTime } from "../../lib/dateUtils";

interface ReportFormProps {
  userEmail: string;
  onChange: () => void;
  onCancel?: () => void;
  initial?: Report;
}

export default function ReportForm({ userEmail, onChange, onCancel, initial }: ReportFormProps) {
  const supabase = useSupabaseClient();
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);

  const topicRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const [agenda, setAgenda] = useState<string[]>([""]);
  const [participants, setParticipants] = useState<string[]>([""]);
  const [tasks, setTasks] = useState<ReportTask[]>([{ zadanie: "", data: "", osoba: "" }]);

  useEffect(() => {
    if (initial) {
      topicRef.current!.value = initial.topic || "";
      dateRef.current!.value = initial.date || getAppDate();
      notesRef.current!.value = initial.notes || "";
      setAgenda(initial.agenda?.length ? initial.agenda : [""]);
      setParticipants(initial.participants?.length ? initial.participants : [""]);
      setTasks(initial.tasks?.length ? initial.tasks : [{ zadanie: "", data: "", osoba: "" }]);
    } else {
      topicRef.current!.value = "";
      dateRef.current!.value = getAppDate();
      notesRef.current!.value = "";
      setAgenda([""]);
      setParticipants([""]);
      setTasks([{ zadanie: "", data: "", osoba: "" }]);
    }
  }, [initial]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      user_email: userEmail,
      topic: topicRef.current?.value.trim() || "",
      date: dateRef.current?.value || getAppDateTime(),
      agenda: agenda.filter(Boolean),
      participants: participants.filter(Boolean),
      tasks: tasks.map((t) => ({
        zadanie: t.zadanie.trim(),
        data: t.data,
        osoba: t.osoba.trim(),
      })),
      notes: notesRef.current?.value.trim() || "",
    };

    if (isEdit && initial) {
      await supabase.from("reports").update(payload).eq("id", initial.id);
    } else {
      await supabase.from("reports").insert(payload);
    }

    setLoading(false);
    onChange();

    if (!isEdit) {
      topicRef.current!.value = "";
      dateRef.current!.value = getAppDate();
      notesRef.current!.value = "";
      setAgenda([""]);
      setParticipants([""]);
      setTasks([{ zadanie: "", data: "", osoba: "" }]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card p-4 rounded-xl shadow max-w-2xl">
      <div>
        <label className="block text-sm font-medium">Temat spotkania:</label>
        <input ref={topicRef} className="w-full border p-2 rounded" required />
      </div>
      <div>
        <label className="block text-sm font-medium">Data:</label>
        <input ref={dateRef} type="date" className="w-full border p-2 rounded" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* Agenda */}
        <div className="flex-1">
          <label className="block text-sm font-medium">Agenda:</label>
          <div className="flex flex-col mt-1">
            {agenda.map((a, i) => (
              <input
                key={i}
                className="border p-2 rounded"
                value={a}
                onChange={(e) => {
                  const copy = [...agenda];
                  copy[i] = e.target.value;
                  setAgenda(copy);
                }}
                placeholder={`${i + 1}.`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAgenda([...agenda, ""])}
            className="inline-flex items-center text-blue-600 hover:underline mt-1"
          >
            Dodaj&nbsp;<Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Uczestnicy */}
        <div className="flex-1">
          <label className="block text-sm font-medium">Uczestnicy:</label>
          <div className="flex flex-col mt-1">
            {participants.map((p, i) => (
              <input
                key={i}
                className="w-full border p-2 rounded"
                value={p}
                onChange={(e) => {
                  const copy = [...participants];
                  copy[i] = e.target.value;
                  setParticipants(copy);
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setParticipants([...participants, ""])}
              className="inline-flex items-center text-blue-600 hover:underline mt-1"
            >
              Dodaj&nbsp;<Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>


      <div>
        <label className="block text-sm font-medium">Zadania:</label>
        <div>
          {tasks.map((t, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <input
                placeholder="Zadanie"
                className="flex-1 border p-2 rounded"
                value={t.zadanie}
                onChange={(e) => {
                  const copy = [...tasks];
                  copy[i].zadanie = e.target.value;
                  setTasks(copy);
                }}
              />
              <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="border p-2 rounded"
                value={t.data}
                onChange={(e) => {
                  const copy = [...tasks];
                  copy[i].data = e.target.value;
                  setTasks(copy);
                }}
              />
              <input
                placeholder="Osoba"
                className="flex-1 border p-2 rounded"
                value={t.osoba}
                onChange={(e) => {
                  const copy = [...tasks];
                  copy[i].osoba = e.target.value;
                  setTasks(copy);
                }}
              />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setTasks([...tasks, { zadanie: "", data: "", osoba: "" }])}
            className="inline-flex items-center text-blue-600 hover:underline mt-1"
          >
            Dodaj&nbsp;<Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Notatki:</label>
        <textarea ref={notesRef} className="w-full border p-2 rounded" rows={6} />
      </div>

      <div className="flex gap-2 items-center">
        <button
          type="submit"
          className="px-3 py-1 bg-primary hover:bg-secondary text-white rounded-lg flex items-center transition"
          disabled={loading}
        >
          {isEdit ? (
            <>
              Zapisz&nbsp;<Save className="w-5 h-5" />
            </>
          ) : (
            <>
              Dodaj&nbsp;<PlusCircleIcon className="w-5 h-5" />
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            disabled={loading}
          >
            Anuluj
          </button>
        )}

        {loading && <Loader2 className="animate-spin w-5 h-5 text-gray-500" />}
      </div>
    </form>
  );
}
