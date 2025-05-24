// components/TaskForm.tsx
"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Task } from "../types";
import { Loader2, PlusCircleIcon } from "lucide-react";
import { useSettings } from "../hooks/useSettings";

interface TaskFormProps {
  userEmail: string;
  initialTask?: Task | null;
  onTasksChange: () => void;
  onCancel?: () => void;
}

export default function TaskForm({
  userEmail,
  initialTask = null,
  onTasksChange,
  onCancel,
}: TaskFormProps) {
  const { settings } = useSettings(userEmail);
  const supabase = useSupabaseClient();
  const isEdit = initialTask !== null;
  const todayIso = new Date().toISOString().slice(0, 10);

  // form state
  const [form, setForm] = useState<Omit<Task, "id">>({
    title: "",
    user_name: userEmail,
    for_user: userEmail,
    category: "other",
    priority: 5,
    description: "",
    due_date: todayIso,
    deadline_date: todayIso,
    status: "pending",
  });
  const [loading, setLoading] = useState(false);
  const userOptions = settings?.users ?? [];
  // populate when editing
  useEffect(() => {
    if (initialTask) {
      setForm({
        title: initialTask.title,
        user_name: initialTask.user_name,
        for_user: initialTask.for_user,
        category: initialTask.category,
        priority: initialTask.priority,
        description: initialTask.description ?? "",
        due_date: initialTask.due_date ?? "",
        deadline_date: initialTask.deadline_date ?? "",
        status: initialTask.status,
      });
    }
  }, [initialTask]);

  const resetForm = () => {
    setForm({
      title: "",
      user_name: userEmail,
      for_user: userEmail,
      category: "inne",
      priority: 5,
      description: "",
      due_date: todayIso,
      deadline_date: todayIso,
      status: "pending",
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const nextStatus =
      form.for_user !== userEmail ? "waiting_for_acceptance" : "pending";
    const payload = {
      title: form.title,
      user_name: userEmail,
      for_user: form.for_user,
      category: form.category,
      priority: form.priority,
      status: nextStatus,
      description: form.description || null,
      due_date: new Date(form.due_date) || null,
      deadline_date: new Date(form.deadline_date) || null,
    };

    if (isEdit && initialTask) {
      await supabase.from("tasks").update(payload).eq("id", initialTask.id);
    } else {
      await supabase.from("tasks").insert(payload);
    }

    await onTasksChange();
    setLoading(false);
    resetForm();
    if (onCancel) onCancel();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-card p-4 rounded-xl shadow"
    >
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Tytuł:
        </label>
        <input
          id="title"
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="mt-1 w-full p-2 border rounded"
          required
        />
      </div>

      {/* For User */}
      <div>
        <label
          htmlFor="for_user"
          className="block text-sm font-medium text-gray-700"
        >
          Dla:
        </label>
        <select
          id="for_user"
          value={form.for_user}
          onChange={(e) => setForm({ ...form, for_user: e.target.value })}
          className="mt-1 w-full p-2 border rounded"
          required
        >
          <option value={userEmail} defaultChecked>
            mnie
          </option>
          <option value="f.niemczewski2@gmail.com">Franka</option>
          {userOptions.map((email: string) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>
      </div>

      {/* Category & Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700"
          >
            Kategoria:
          </label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="mt-1 w-full p-2 border rounded"
          >
            {[
              "edukacja",
              "praca",
              "osobiste",
              "aktywizm",
              "przyjaciele",
              "zakupy",
              "podróże",
              "dostawa",
              "święta",
              "inne",
            ].map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-gray-700"
          >
            Priorytet:
          </label>
          <input
            id="priority"
            type="number"
            min={1}
            max={10}
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: parseInt(e.target.value, 10) })
            }
            className="mt-1 w-full p-2 border rounded"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="due_date"
            className="block text-sm font-medium text-gray-700"
          >
            Data wykonania:&nbsp;
          </label>
          <input
            id="due_date"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className="mt-1 w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label
            htmlFor="deadline_date"
            className="block text-sm font-medium text-gray-700"
          >
            Deadline:&nbsp;
          </label>
          <input
            id="deadline_date"
            type="date"
            value={form.deadline_date}
            onChange={(e) =>
              setForm({ ...form, deadline_date: e.target.value })
            }
            className="mt-1 w-full p-2 border rounded"
            required
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          Opis:
        </label>
        <textarea
          id="description"
          value={form.description || ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mt-1 w-full p-2 border rounded"
        />
      </div>

      {/* Buttons */}
      <div className="flex space-x-2 items-center">
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded-lg flex items-center"
        >
          {isEdit ? (
            "Zapisz"
          ) : (
            <>
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </>
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded-lg"
          >
            Anuluj
          </button>
        )}
        {loading && <Loader2 className="animate-spin w-6 h-6 text-gray-500" />}
      </div>
    </form>
  );
}
