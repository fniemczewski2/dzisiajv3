"use client";

import React, { useRef, useEffect, useState, FormEvent } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Task } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { getAppDate } from "../../lib/dateUtils";
import LoadingState from "../LoadingState";
import { AddButton, SaveButton, CancelButton } from "../CommonButtons";

interface TaskFormProps {
  initialTask?: Task | null;
  onTasksChange: () => void;
  onCancel?: () => void;
}

export default function TaskForm({
  initialTask = null,
  onTasksChange,
  onCancel,
}: TaskFormProps) {
  const session = useSession();
  const userEmail = session?.user?.email || process.env.USER_EMAIL;
  const { settings } = useSettings();
  const supabase = useSupabaseClient();
  const isEdit = !!initialTask;
  const todayIso = getAppDate();
  const titleRef = useRef<HTMLInputElement>(null);
  const forUserRef = useRef<HTMLSelectElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const priorityRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const userOptions = settings?.users ?? [];

  useEffect(() => {
    if (initialTask) {
      titleRef.current!.value = initialTask.title;
      forUserRef.current!.value = initialTask.for_user;
      categoryRef.current!.value = initialTask.category;
      priorityRef.current!.value = String(initialTask.priority);
      descriptionRef.current!.value = initialTask.description ?? "";
      dueDateRef.current!.value = initialTask.due_date ?? todayIso;
    } else {
      titleRef.current!.value = "";
      forUserRef.current!.value = userEmail || "";
      categoryRef.current!.value = "inne";
      priorityRef.current!.value = "5";
      descriptionRef.current!.value = "";
      dueDateRef.current!.value = todayIso;
    }
  }, [initialTask, userEmail, todayIso]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const forUser = forUserRef.current?.value || userEmail;
    const nextStatus =
      forUser !== userEmail ? "waiting_for_acceptance" : "pending";

    const payload = {
      title: titleRef.current?.value || "",
      user_name: userEmail,
      for_user: forUser,
      category: categoryRef.current?.value || "inne",
      priority: Number(priorityRef.current?.value) || 5,
      description: descriptionRef.current?.value || null,
      due_date: new Date(dueDateRef.current?.value || todayIso),
      status: nextStatus,
    };

    if (isEdit && initialTask) {
      await supabase.from("tasks").update(payload).eq("id", initialTask.id);
    } else {
      await supabase.from("tasks").insert(payload);
    }

    await onTasksChange();
    setLoading(false);
    if (onCancel) onCancel();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-card p-4 rounded-xl shadow"
    >
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Tytuł:
        </label>
        <input
          id="title"
          ref={titleRef}
          type="text"
          className="mt-1 w-full p-2 border rounded"
          required
        />
      </div>

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
            ref={categoryRef}
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
            ref={priorityRef}
            type="number"
            min={1}
            max={10}
            className="mt-1 w-full p-2 border rounded"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="due"
            className="block text-sm font-medium text-gray-700"
          >
            Data wykonania:
          </label>
          <input
            id="due"
            ref={dueDateRef}
            type="date"
            className="mt-1 w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label
            htmlFor="for"
            className="block text-sm font-medium text-gray-700"
          >
            Dla:
          </label>
          <select
            id="for"
            ref={forUserRef}
            className="mt-1 w-full p-2 border rounded"
            required
            defaultValue={userEmail}
          >
            <option value={userEmail}>mnie</option>
            {userOptions.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="desc"
          className="block text-sm font-medium text-gray-700"
        >
          Opis:
        </label>
        <textarea
          id="desc"
          ref={descriptionRef}
          className="mt-1 w-full p-2 border rounded"
        />
      </div>

      <div className="flex space-x-2 items-center">
        {isEdit ? (
          <SaveButton loading={loading} />
        ) : (
          <AddButton loading={loading} />
        )}
        {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}
        {loading && <LoadingState />}
      </div>
    </form>
  );
}