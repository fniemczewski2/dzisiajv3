"use client";

import React, { useRef, useState, FormEvent } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { Task } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useTasks } from "../../hooks/useTasks";
import { getAppDate } from "../../lib/dateUtils";
import LoadingState from "../LoadingState";
import { AddButton, CancelButton } from "../CommonButtons";
import { Minus, Plus } from "lucide-react";

interface TaskFormProps {
  initialTask?: Task | null;
  onTasksChange: () => void;
  onCancel?: () => void;
}

export default function TaskForm({
  onTasksChange,
  onCancel,
}: TaskFormProps) {
  const session = useSession();
  const userEmail = session?.user?.email || process.env.NEXT_PUBLIC_USER_EMAIL;
  const { settings } = useSettings();
  const { addTask, loading } = useTasks();
  const todayIso = getAppDate();
  
  const titleRef = useRef<HTMLInputElement>(null);
  const forUserRef = useRef<HTMLSelectElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);

  // State for priority (default 3)
  const [priority, setPriority] = useState(3);

  const userOptions = settings?.users ?? [];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const forUser = forUserRef.current?.value || userEmail;
    const nextStatus =
      forUser !== userEmail ? "waiting_for_acceptance" : "pending";

    const taskData: Partial<Task> = {
      title: titleRef.current?.value || "",
      user_name: userEmail || "",
      for_user: forUser || "mnie",
      category: categoryRef.current?.value || "inne",
      priority: priority,
      description: descriptionRef.current?.value || "",
      due_date: dueDateRef.current?.value || todayIso,
      status: nextStatus,
    };

    await addTask(taskData);
    onTasksChange();
    if (onCancel) onCancel();
  };

  // Increase priority = Lower Number (e.g. 2 is higher priority than 3)
  const increasePriority = () => {
    setPriority((prev) => Math.max(1, prev - 1));
  };

  // Decrease priority = Higher Number (e.g. 4 is lower priority than 3)
  const decreasePriority = () => {
    setPriority((prev) => Math.min(5, prev + 1));
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
              <label className="text-xs font-semibold text-gray-700">Priorytet:</label>
              <div className="flex items-center gap-1 mt-1">
                <button
                    type="button"
                    onClick={decreasePriority}
                    className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Zmniejsz priorytet"
                >
                    <Minus size={16} />
                </button>
                <div className="flex-1 text-center font-bold text-sm bg-white border border-gray-300 rounded-lg py-2">
                    {priority}
                </div>
                <button
                    type="button"
                    onClick={increasePriority}
                    className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Zwiększ priorytet"
                >
                    <Plus size={16} />
                </button>
              </div>
            </div>
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
            defaultValue={"inne"}
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
              "przypomnienia",
              "inne",
            ].map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
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
            defaultValue={todayIso}
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

      <div className="flex justify-end gap-2 pt-2">
        {loading && <LoadingState />}
        <AddButton loading={loading} />
        {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}
      </div>
    </form>
  );
}