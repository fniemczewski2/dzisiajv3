// components/tasks/TaskForm.tsx

import React, { useRef, useState, SyntheticEvent } from "react";
import { Task } from "@/types/tasks";
import { useSettings } from "@/hooks/db/useSettings";
import { useAuth } from "@/providers/AuthProvider";
import { getAppDate } from "@/lib/dateUtils";
import { FormButtons } from "../ui/CommonButtons";
import { Minus, Plus } from "lucide-react";
import { TASK_CATEGORIES, DEFAULT_TASK_CATEGORY } from "@/config/tasks";
import { SLACK_TASK_CATEGORY } from "@/config/slack";
import { useSlackListOptions, setSlackTaskTarget } from "@/hooks/db/useSlackListOptions";

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
  const { lists: slackLists, loading: slackListsLoading, defaultListId } =
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

    const created = await addTask(taskData);

    const chosenList = slackListId || defaultListId;
    if (created && isSlackCategory && chosenList) {
      await setSlackTaskTarget(Number(created.id), chosenList);
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

          {isSlackCategory && (
            <div className="mt-2">
              <label htmlFor="slack-list" className="form-label">Lista Slack:</label>
              {slackListsLoading && <p className="text-xs text-textMuted">Wczytuję listy…</p>}
              {!slackListsLoading && slackLists.length === 0 && (
                <p className="text-xs text-textMuted">
                  Brak podłączonych list. Skonfiguruj je w Ustawieniach.
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