"use client";

import React, { useRef, useState, SyntheticEvent } from "react";
import { Task } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withRetry } from "../../lib/withRetry";
import { getAppDate } from "../../lib/dateUtils";
import { FormButtons } from "../CommonButtons";
import { Minus, Plus } from "lucide-react";

interface TaskFormProps {
  addTask: (task: Task) => Promise<unknown>;
  onTasksChange: () => void;
  onCancel?: () => void;
  selectedDate?: string;
  loading: boolean;
}

export default function TaskForm({ addTask, onTasksChange, onCancel, loading, selectedDate }: Readonly<TaskFormProps>) {
  const { user } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();
  const { toast } = useToast();
  const todayIso = getAppDate();

  const titleRef       = useRef<HTMLInputElement>(null);
  const forUserRef     = useRef<HTMLSelectElement>(null);
  const categoryRef    = useRef<HTMLSelectElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const dueDateRef     = useRef<HTMLInputElement>(null);
  const [priority, setPriority] = useState(3);

  const userOptions = settings?.users ?? [];

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const selectedValue = forUserRef.current?.value || userId;
    const isEmail = selectedValue?.includes("@");

    const taskData: any = {
      title: titleRef.current?.value || "",
      category: categoryRef.current?.value || "inne",
      priority,
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

    await withRetry(
      () => addTask(taskData),
      toast,
      { context: "TaskForm.addTask", userId }
    );

    toast.success("Dodano pomyślnie.");
    onTasksChange();
    onCancel?.();
  };

  const increasePriority = () => setPriority((p) => Math.max(1, p - 1));
  const decreasePriority = () => setPriority((p) => Math.min(5, p + 1));

  return (
    <form
      onSubmit={handleSubmit}
      className="form-card"
    >
      <div>
        <label htmlFor="title" className="form-label">Tytuł zadania:</label>
        <input id="title" ref={titleRef} type="text"
          className="input-field font-medium" placeholder="Zadanie" required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Priorytet:</label>
          <div className="flex items-stretch gap-1.5 mt-1">
            <button type="button" onClick={decreasePriority}
              className="flex flex-1 items-center justify-center p-1 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-surfaceHover text-textSecondary hover:text-text transition-colors shadow-sm shrink-0"
              title="Zmniejsz priorytet">
              <Minus size={18} />
            </button>
            <div className="input-field flex-1 flex items-center justify-center card rounded-lg text-text shadow-inner">
              {priority}
            </div>
            <button type="button" onClick={increasePriority}
              className="flex flex-1 items-center justify-center p-1 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-surfaceHover text-textSecondary hover:text-text transition-colors shadow-sm shrink-0"
              title="Zwiększ priorytet">
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="category" className="form-label">Kategoria:</label>
          <select id="category" ref={categoryRef} className="input-field h-min sm:h-[48px]" defaultValue="inne">
            {["edukacja","praca","osobiste","aktywizm","przyjaciele","zakupy","podróże","trening","inne"].map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="due" className="form-label">Data wykonania:</label>
          <input id="due" ref={dueDateRef} defaultValue={selectedDate || todayIso} type="date"
            className="input-field text-xs w-full min-w-0 px-1" required />
        </div>
        <div>
          <label htmlFor="for" className="form-label">Zadanie dla:</label>
          <select id="for" ref={forUserRef} className="input-field h-min sm:h-[48px]" required defaultValue={userId}>
            <option value={userId}>Mnie</option>
            {userOptions.map((email) => <option key={email} value={email}>{email}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="desc" className="form-label">Opis:</label>
        <textarea id="desc" ref={descriptionRef} className="input-field" rows={3}
          placeholder="Dodatkowe informacje..." />
      </div>

      <FormButtons onClickClose={onCancel} loading={loading}/>
    </form>
  );
}