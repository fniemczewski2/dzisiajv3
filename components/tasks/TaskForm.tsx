// components/tasks/TaskForm.tsx

import React, { useRef, useState, SyntheticEvent } from "react";
import { Task } from "@/types/tasks";
import { useSettings } from "@/hooks/db/useSettings";
import { useAuth } from "@/providers/AuthProvider";
import { getAppDate } from "@/lib/dateUtils";
import { FormButtons } from "../ui/CommonButtons";
import { Minus, Plus } from "lucide-react";
import { DEFAULT_TASK_CATEGORY } from "@/config/tasks";
import RecurrenceEditor from "../ui/RecurrenceEditor";
import { taskRecurrenceFields } from "@/lib/taskRecurrence";
import type { RecurrenceRule } from "@/shared/recurrence";
import { defaultTaskCategory, taskCategoryOptions } from "@/lib/taskCategories";
import { useTaskCategories } from "@/hooks/useTaskCategories";
import { useSlackListOptions, setSlackTaskTarget } from "@/hooks/db/useSlackListOptions";
import { triggerSlackSync } from "@/hooks/db/useSlackTasks";
import { useToast } from "@/providers/ToastProvider";
import TaskRemindersEditor from "./TaskRemindersEditor";
import { replacePendingReminders, validateReminders } from "@/lib/taskReminders";

interface TaskFormProps {
  addTask: (task: Partial<Task> & { shared_with_email?: string }) => Promise<Task | undefined>;
  onTasksChange: () => void;
  onCancel?: () => void;
  selectedDate?: string;
  loading: boolean;
  addMany?: boolean;
  addAnother?: (type: "task" | "event") => void;
  initialTitle?: string;
}

export default function TaskForm({
  addTask,
  onTasksChange,
  onCancel,
  loading,
  selectedDate,
  addMany = false,
  addAnother,
  initialTitle = "",
}: Readonly<TaskFormProps>) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings } = useSettings();
  const { toast } = useToast();
  const todayIso = getAppDate();

  const titleRef = useRef<HTMLInputElement>(null);
  const forUserRef = useRef<HTMLSelectElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const [priority, setPriority] = useState(3);
  const userCategories = useTaskCategories();
  const categoryOptions = taskCategoryOptions(userCategories);
  const defaultCategory = defaultTaskCategory(userCategories);
  const optionsKey = categoryOptions.join("|");
  const [chosenCategory, setChosenCategory] = useState<string>(DEFAULT_TASK_CATEGORY);
  // Po wczytaniu kategorii użytkownika: jeśli wybrana nie istnieje na jego
  // liście (np. usunął „inne”), obowiązuje jego domyślna – wyliczane w renderze.
  const category = optionsKey.split("|").includes(chosenCategory) ? chosenCategory : defaultCategory;
  const [slackListId, setSlackListId] = useState("");
  const [reminders, setReminders] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(selectedDate || todayIso);

  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  // Listy Slack wczytujemy zawsze; bez połączenia po prostu nie ma czego pokazać.
  const { lists: slackLists } = useSlackListOptions(true);

  const userOptions = settings?.users ?? [];

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const reminderError = validateReminders(reminders);
    if (reminderError) {
      toast.error(reminderError);
      return;
    }
    const selectedValue = forUserRef.current?.value || userId;
    const isEmail = selectedValue?.includes("@");

    const taskData: Partial<Task> & { shared_with_email?: string } = {
      title: titleRef.current?.value || "",
      category: category || defaultCategory,
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

    if (recurrence) Object.assign(taskData, taskRecurrenceFields(recurrence, taskData.due_date));

    const created = await addTask(taskData);

    if (created && userId && reminders.length > 0) {
      const { error } = await replacePendingReminders(supabase, userId, created.id, reminders);
      if (error) toast.error(`Zadanie zapisane, ale: ${error}`);
    }

    if (created && slackListId) {
      try {
        await setSlackTaskTarget(Number(created.id), slackListId);
        triggerSlackSync();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Nie udało się przypisać listy Slack.");
      }
    }

    onTasksChange();
    onCancel?.();
  };

  const increasePriority = () => setPriority((p) => Math.max(1, p - 1));
  const decreasePriority = () => setPriority((p) => Math.min(5, p + 1));

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <div>
        <label htmlFor="title" className="form-label">
          Tytuł zadania:
        </label>
        <input
          id="title"
          ref={titleRef}
          type="text"
          defaultValue={initialTitle}
          className="input-field font-medium"
          placeholder="Zadanie"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="form-label">Priorytet:</div>
          <div className="mt-1 flex items-stretch gap-1.5">
            <button
              type="button"
              onClick={decreasePriority}
              className="flex flex-1 shrink-0 items-center justify-center rounded-lg border border-line bg-surface p-1 text-text-secondary shadow-sm transition-colors hover:bg-surface-hover hover:text-text sm:p-2.5"
              title="Zmniejsz priorytet"
              aria-label="Zmniejsz priorytet"
            >
              <Minus size={18} />
            </button>
            <div className="input-field card flex flex-1 items-center justify-center text-text shadow-inner">
              {priority}
            </div>
            <button
              type="button"
              onClick={increasePriority}
              className="flex flex-1 shrink-0 items-center justify-center rounded-lg border border-line bg-surface p-1 text-text-secondary shadow-sm transition-colors hover:bg-surface-hover hover:text-text sm:p-2.5"
              title="Zwiększ priorytet"
              aria-label="Zwiększ priorytet"
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
            className="input-field h-min sm:h-12"
            value={category}
            onChange={(e) => setChosenCategory(e.target.value)}
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="due" className="form-label">
            Data wykonania:
          </label>
          <input
            id="due"
            ref={dueDateRef}
            defaultValue={selectedDate || todayIso}
            type="date"
            onChange={(e) => setDueDate(e.target.value)}
            className="input-field w-full min-w-0 px-2"
            required
          />
        </div>
        <div>
          <label htmlFor="for" className="form-label">
            Zadanie dla:
          </label>
          <select id="for" ref={forUserRef} className="input-field h-min sm:h-12" required defaultValue={userId}>
            <option value={userId}>Mnie</option>
            {userOptions.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <RecurrenceEditor
        idPrefix="task-recurrence"
        value={recurrence}
        onChange={setRecurrence}
        startDay={dueDate}
        allowCount={false}
        disabled={loading}
      />

      {slackLists.length > 0 && (
        <div>
          <label htmlFor="slack-list" className="form-label">
            Wyślij do listy Slack:
          </label>
          <select
            id="slack-list"
            className="input-field"
            value={slackListId}
            onChange={(e) => setSlackListId(e.target.value)}
          >
            <option value="">Nie wysyłaj</option>
            {slackLists.map((list) => (
              <option key={list.list_id} value={list.list_id}>
                {list.list_title ?? list.list_id}
                {list.is_default ? " (domyślna)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <TaskRemindersEditor value={reminders} onChange={setReminders} dueDate={dueDate} disabled={loading} />

      <div>
        <label htmlFor="desc" className="form-label">
          Opis:
        </label>
        <textarea
          id="desc"
          ref={descriptionRef}
          className="input-field"
          rows={3}
          placeholder="Dodatkowe informacje..."
        />
      </div>

      <FormButtons
        onClickClose={onCancel}
        loading={loading}
        addMany={addMany}
        onAddAnother={() => addAnother?.("task")}
      />
    </form>
  );
}
