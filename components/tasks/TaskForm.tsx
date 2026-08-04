// components/tasks/TaskForm.tsx

import React, { useRef, useState, SyntheticEvent } from "react";
import { Task } from "@/types/tasks";
import { useSettings } from "@/hooks/db/useSettings";
import { useAuth } from "@/providers/AuthProvider";
import { getAppDate } from "@/lib/dateUtils";
import { FormButtons } from "../ui/CommonButtons";
import { Minus, Plus } from "lucide-react";
import { TASK_CATEGORIES, DEFAULT_TASK_CATEGORY, RECURRING_TASK_CATEGORY, DEFAULT_REPEAT_DAYS } from "@/config/tasks";
import { SLACK_TASK_CATEGORY } from "@/config/slack";
import { useSlackListOptions, setSlackTaskTarget } from "@/hooks/db/useSlackListOptions";
import { triggerSlackSync } from "@/hooks/db/useSlackTasks";
import { useToast } from "@/providers/ToastProvider";

interface TaskFormProps {
  addTask: (task: Partial<Task> & { shared_with_email?: string }) => Promise<Task | undefined>;
  onTasksChange: () => void;
  onCancel?: () => void;
  selectedDate?: string;
  loading: boolean;
  addMany?: boolean;
  addAnother?: (type: "task" | "event") => void;
}

export default function TaskForm({ addTask, onTasksChange, onCancel, loading, selectedDate, addMany = false, addAnother }: Readonly<TaskFormProps>) {
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
  const [category, setCategory] = useState<string>(DEFAULT_TASK_CATEGORY);
  const [slackListId, setSlackListId] = useState("");

  const isSlackCategory = category === SLACK_TASK_CATEGORY;
  const isRecurringCategory = category === RECURRING_TASK_CATEGORY;
  const [repeatDays, setRepeatDays] = useState(DEFAULT_REPEAT_DAYS);
  const [recurringUntil, setRecurringUntil] = useState("");
  const { lists: slackLists, loading: slackListsLoading, error: slackListsError, defaultListId } =
    useSlackListOptions(isSlackCategory);

  const userOptions = settings?.users ?? [];

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const selectedValue = forUserRef.current?.value || userId;
    const isEmail = selectedValue?.includes("@");

    const taskData: Partial<Task> & { shared_with_email?: string } = {
      title: titleRef.current?.value || "",
      category: category || DEFAULT_TASK_CATEGORY,
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

    if (isRecurringCategory) {
      taskData.is_recurring = true;
      taskData.repeat_days = repeatDays;
      taskData.recurring_until = recurringUntil || null;
    }

    const created = await addTask(taskData);

    const chosenList = slackListId || defaultListId;
    if (created && isSlackCategory) {
      try {
        if (chosenList) await setSlackTaskTarget(Number(created.id), chosenList);
        triggerSlackSync();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Nie udało się przypisać listy Slack."
        );
      }
    }

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
          <div className="form-label">Priorytet:</div>
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
          <select
            id="category"
            ref={categoryRef}
            className="input-field h-min sm:h-[48px]"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {TASK_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {isRecurringCategory && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="repeat-days" className="form-label">Co ile dni:</label>
                <input
                  id="repeat-days"
                  type="number"
                  min={1}
                  max={365}
                  value={repeatDays}
                  onChange={(e) => setRepeatDays(Math.max(1, Number(e.target.value) || 1))}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label htmlFor="recurring-until" className="form-label">Powtarzaj do:</label>
                <input
                  id="recurring-until"
                  type="date"
                  value={recurringUntil}
                  onChange={(e) => setRecurringUntil(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            </div>
          )}

          {isSlackCategory && (
            <div className="mt-2">
              <label htmlFor="slack-list" className="form-label">Lista Slack:</label>
              {slackListsLoading && <p className="text-xs text-textMuted">Wczytuję listy…</p>}
              {!slackListsLoading && slackListsError && (
                <p className="text-xs text-red-600 dark:text-red-400">{slackListsError}</p>
              )}
              {!slackListsLoading && !slackListsError && slackLists.length === 0 && (
                <p className="text-xs text-textMuted">
                  Brak gotowych list. Podłącz listę i zmapuj w niej kolumnę tytułu w Ustawieniach.
                </p>
              )}
              {slackLists.length > 0 && (
                <select
                  id="slack-list"
                  className="input-field h-min sm:h-[48px]"
                  value={slackListId || defaultListId}
                  onChange={(e) => setSlackListId(e.target.value)}
                >
                  {slackLists.map((list) => (
                    <option key={list.list_id} value={list.list_id}>
                      {list.list_title ?? list.list_id}
                      {list.is_default ? " (domyślna)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
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

      <FormButtons onClickClose={onCancel} loading={loading} addMany={addMany} onAddAnother={() => addAnother?.('task')}/>
    </form>
  );
}