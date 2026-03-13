"use client";

import React, { useRef, useState, SyntheticEvent } from "react";
import { Task } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useTasks } from "../../hooks/useTasks";
import { getAppDate } from "../../lib/dateUtils";
import LoadingState from "../LoadingState";
import { AddButton, CancelButton } from "../CommonButtons";
import { Minus, Plus } from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";

interface TaskFormProps {
  initialTask?: Task | null;
  onTasksChange: () => void;
  onCancel?: () => void;
}

export default function TaskForm({
  onTasksChange,
  onCancel,
}: TaskFormProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();
  const { addTask, loading } = useTasks();
  const todayIso = getAppDate();
  
  const titleRef = useRef<HTMLInputElement>(null);
  const forUserRef = useRef<HTMLSelectElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);

  const [priority, setPriority] = useState(3);

  const userOptions = settings?.users ?? [];

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    const selectedValue = forUserRef.current?.value || userId;
    const isEmail = selectedValue?.includes("@");

    const taskData: any = {
      title: titleRef.current?.value || "",
      category: categoryRef.current?.value || "inne",
      priority: priority,
      description: descriptionRef.current?.value || "",
      due_date: dueDateRef.current?.value || todayIso,
    };

    if (isEmail) {
      taskData.shared_with_email = selectedValue;
      taskData.status = "waiting_for_acceptance";
    } else {
      taskData.for_user_id = userId;
      taskData.status = "pending";
    }

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
      className="space-y-4 card p-5 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4 mb-6"
    >
      <div>
        <label htmlFor="title" className="form-label">
          Tytuł zadania:
        </label>
        <input
          id="title"
          ref={titleRef}
          type="text"
          className="input-field font-medium"
          placeholder="Co masz do zrobienia?"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Priorytet:</label>
          <div className="flex items-stretch gap-1.5 mt-1">
            <button
              type="button"
              onClick={decreasePriority}
              className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-surfaceHover text-textSecondary hover:text-text transition-colors shadow-sm shrink-0"
              title="Zmniejsz priorytet (wyższa liczba)"
            >
              <Minus size={18} />
            </button>
            <div className="flex-1 flex items-center justify-center text-lg card rounded-xl text-text shadow-inner">
              {priority}
            </div>
            <button
              type="button"
              onClick={increasePriority}
              className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-surfaceHover text-textSecondary hover:text-text transition-colors shadow-sm shrink-0"
              title="Zwiększ priorytet (niższa liczba)"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="category" className="form-label">
            Kategoria:
          </label>
          <select
            id="category"
            ref={categoryRef}
            className="input-field h-[46px] sm:h-[48px]"
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
              "trening",
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
          <label htmlFor="due" className="form-label">
            Data wykonania:
          </label>
          <input
            id="due"
            ref={dueDateRef}
            defaultValue={todayIso}
            type="date w-full min-w-0 px-1 text-xs"
            className="input-field h-[46px] sm:h-[48px]"
            required
          />
        </div>
        <div>
          <label htmlFor="for" className="form-label">
            Zadanie dla:
          </label>
          <select
            id="for"
            ref={forUserRef}
            className="input-field h-[46px] sm:h-[48px]"
            required
            defaultValue={userId}
          >
            <option value={userId}>Mnie</option>
            {userOptions.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="desc" className="form-label">
          Opis (opcjonalny):
        </label>
        <textarea
          id="desc"
          ref={descriptionRef}
          className="input-field"
          rows={3}
          placeholder="Dodatkowe informacje..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        {loading && <div className="mr-2"><LoadingState /></div>}
        <AddButton loading={loading} />
        {onCancel && <CancelButton onCancel={onCancel} loading={loading} />}
      </div>
    </form>
  );
}