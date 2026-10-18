// components/tasks/TaskItem.tsx

import { getPriorityColors } from "@/config/priority";
import React, { useState, useRef, useEffect, memo } from "react";
import { format, parseISO, addDays } from "date-fns";
import { Minus, Plus, Repeat } from "lucide-react";
import { Task } from "@/types/tasks";
import { getAppDate } from "@/lib/dateUtils";
import TimeContextBadge from "./TimeContextBadge";
import UniversalTimer from "../ui/Timer";
import {
  EditButton,
  DeleteButton,
  RescheduleButton,
  TimerButton,
  FormButtons,
  ConfirmButton,
  UndoButton,
} from "../ui/CommonButtons";
import { useAuth } from "@/providers/AuthProvider";
import { taskCategoryOptions } from "@/lib/taskCategories";
import { useTaskCategories, useCategoryColors } from "@/hooks/useTaskCategories";
import TaskRemindersEditor from "./TaskRemindersEditor";
import RecurrenceEditor from "../ui/RecurrenceEditor";
import { taskRecurrenceFields, taskRule } from "@/lib/taskRecurrence";
import { describeRule } from "@/shared/recurrence";
import { fetchPendingReminders, replacePendingReminders, validateReminders } from "@/lib/taskReminders";
import { useToast } from "@/providers/ToastProvider";

interface Props {
  task: Task;
  acceptTask: (id: string) => Promise<void> | void;
  setDoneTask: (id: string, done?: boolean) => Promise<void> | void;
  editTask: (task: Task & { shared_with_email?: string }) => Promise<void> | void;
  deleteTask: (id: string) => Promise<void> | void;
  onTasksChange: () => void;
  userId: string;
  userOptions: string[];
  loading: boolean;
}

function TaskEditForm({
  task,
  editedTask,
  setEditedTask,
  sharedEmail,
  setSharedEmail,
  userOptions,
  handleSaveEdit,
  handleCancelEdit,
  increasePriority,
  decreasePriority,
  titleRef,
  loading,
  reminders,
  setReminders,
  remindersLoaded,
}: Readonly<{
  task: Task;
  editedTask: Task;
  setEditedTask: React.Dispatch<React.SetStateAction<Task>>;
  sharedEmail: string;
  setSharedEmail: (val: string) => void;
  userOptions: string[];
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
  increasePriority: () => void;
  decreasePriority: () => void;
  titleRef: React.RefObject<HTMLInputElement | null>;
  loading: boolean;
  reminders: string[];
  setReminders: (next: string[]) => void;
  remindersLoaded: boolean;
}>) {
  const userCategories = useTaskCategories();
  const editPrefix = `edit-task-${task.id}`;

  return (
    <div className="card w-full rounded-xl p-4">
      <div className="space-y-3">
        <div>
          <label htmlFor={`${editPrefix}-title`} className="form-label">
            Tytuł zadania:
          </label>
          <input
            id={`${editPrefix}-title`}
            ref={titleRef}
            type="text"
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            className="input-field font-medium"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="form-label">Priorytet:</div>
            <div className="mt-1 flex items-stretch gap-1.5">
              <button
                type="button"
                onClick={decreasePriority}
                aria-label="Zmniejsz priorytet"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <output
                aria-live="polite"
                aria-label={`Priorytet ${editedTask.priority}`}
                className="card flex flex-1 items-center justify-center rounded-lg text-lg text-text"
              >
                {editedTask.priority}
              </output>
              <button
                type="button"
                onClick={increasePriority}
                aria-label="Zwiększ priorytet"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor={`${editPrefix}-category`} className="form-label">
              Kategoria:
            </label>
            <select
              id={`${editPrefix}-category`}
              value={editedTask.category}
              onChange={(e) => setEditedTask({ ...editedTask, category: e.target.value })}
              className="input-field"
            >
              {taskCategoryOptions(userCategories, task.category).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${editPrefix}-date`} className="form-label">
              Data wykonania:
            </label>
            <input
              id={`${editPrefix}-date`}
              type="date"
              value={editedTask.due_date}
              onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })}
              className="input-field w-full min-w-0 px-2"
            />
          </div>
          {userOptions.length > 0 && (
            <div>
              <label htmlFor={`${editPrefix}-share`} className="form-label">
                Udostępnij dla:
              </label>
              <select
                id={`${editPrefix}-share`}
                value={sharedEmail}
                onChange={(e) => setSharedEmail(e.target.value)}
                className="input-field"
              >
                <option value="">Tylko dla mnie</option>
                {userOptions.map((email: string) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <RecurrenceEditor
          idPrefix={`${editPrefix}-recurrence`}
          value={taskRule(editedTask)}
          onChange={(rule) => setEditedTask({ ...editedTask, ...taskRecurrenceFields(rule) })}
          startDay={editedTask.due_date}
          allowCount={false}
          disabled={loading}
        />
        {remindersLoaded ? (
          <TaskRemindersEditor
            value={reminders}
            onChange={setReminders}
            dueDate={editedTask.due_date}
            disabled={loading}
          />
        ) : (
          <p className="text-sm text-text-secondary">Wczytuję przypomnienia…</p>
        )}
        <div>
          <label htmlFor={`${editPrefix}-desc`} className="form-label">
            Opis:
          </label>
          <textarea
            id={`${editPrefix}-desc`}
            value={editedTask.description || ""}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            className="input-field"
            rows={2}
          />
        </div>
        <FormButtons onClickSave={handleSaveEdit} onClickClose={handleCancelEdit} loading={loading} />
      </div>
    </div>
  );
}

function TaskViewActions({
  task,
  userId,
  isDone,
  loading,
  handleEdit,
  handleDelete,
  handleAccept,
  handleComplete,
  handleReschedule,
  setIsTimerActive,
}: Readonly<{
  task: Task;
  userId: string;
  isDone: boolean;
  loading?: boolean;
  handleEdit: () => void;
  handleDelete: () => void;
  handleAccept: () => void;
  handleComplete: (done?: boolean) => void;
  handleReschedule: (days: number) => void;
  setIsTimerActive: (val: boolean) => void;
}>) {
  if (isDone) {
    return (
      <div className="mt-3 flex w-full justify-between gap-1 border-t border-line pt-3 sm:gap-1.5">
        <UndoButton onClick={() => handleComplete(false)} />
        <EditButton onClick={handleEdit} />
        <DeleteButton onClick={handleDelete} />
      </div>
    );
  }

  if (task.user_id !== userId && task.status === "waiting_for_acceptance") {
    return (
      <div className="mt-3 flex w-full justify-between gap-1 border-t border-line pt-3 sm:gap-1.5">
        <ConfirmButton onClick={handleAccept} label="Akceptuj" />
        <DeleteButton onClick={handleDelete} />
      </div>
    );
  }

  return (
    <div className="mt-3 flex w-full justify-between gap-1 border-t border-line pt-3 sm:gap-1.5">
      <ConfirmButton onClick={() => handleComplete()} label="Zrobione" />
      <RescheduleButton onClick={() => handleReschedule(1)} loading={loading} />
      <TimerButton onClick={() => setIsTimerActive(true)} />
      <EditButton onClick={handleEdit} />
      <DeleteButton onClick={handleDelete} />
    </div>
  );
}

const getTitleClasses = (isDone: boolean, isHighPriority: boolean, isOverdue: boolean) => {
  if (isDone) return "text-text-muted line-through";
  if (isHighPriority || isOverdue) return "text-danger ";
  return "text-text";
};

function TaskDetails({ task }: { readonly task: Task }) {
  const hasDescription = !!task.description;
  const showShareInfo = !!(task.display_share_info && ["waiting_for_acceptance", "pending"].includes(task.status));

  if (!hasDescription && !showShareInfo) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-3">
      {hasDescription && (
        <span className="text-xs leading-relaxed whitespace-pre-wrap text-text-secondary">{task.description}</span>
      )}
      {showShareInfo && (
        <span className="mt-1 truncate text-xs font-medium text-primary">{task.display_share_info}</span>
      )}
    </div>
  );
}

function TaskView({
  task,
  userId,
  isDone,
  isHighPriority,
  isOverdue,
  loading,
  setIsTimerActive,
  handleEdit,
  handleDelete,
  handleAccept,
  handleComplete,
  handleReschedule,
}: Readonly<{
  task: Task;
  userId: string;
  isDone: boolean;
  isHighPriority: boolean;
  isOverdue: boolean;
  loading?: boolean;
  setIsTimerActive: (val: boolean) => void;
  handleEdit: () => void;
  handleDelete: () => void;
  handleAccept: () => void;
  handleComplete: (done?: boolean) => void;
  handleReschedule: (days: number) => void;
}>) {
  const categoryColors = useCategoryColors();
  return (
    <div className="card flex w-full min-w-0 flex-col rounded-card p-4 text-left transition-all">
      <div className="flex-1 space-y-3">
        <button
          type="button"
          onClick={() => setIsTimerActive(true)}
          className="flex w-full cursor-pointer items-start justify-start gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-sm"
            style={getPriorityColors(task.priority)}
            title={`Priorytet ${task.priority}`}
          >
            {task.priority}
          </span>
          <h3
            className={`text-lg leading-tight font-bold wrap-break-word sm:text-xl ${getTitleClasses(isDone, isHighPriority, isOverdue)}`}
          >
            {task.title}
          </h3>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <TimeContextBadge dueDate={task.due_date} isDone={isDone} />
          {task.category && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-sm font-medium text-text-secondary">
              {categoryColors[task.category] && (
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: categoryColors[task.category] }}
                />
              )}
              {task.category}
            </span>
          )}
        </div>

        {taskRule(task) && (
          <p className="flex items-center gap-2 text-sm text-text-secondary">
            <Repeat className="h-4 w-4 shrink-0" aria-hidden="true" />
            {describeRule(taskRule(task), task.due_date)}
          </p>
        )}

        <TaskDetails task={task} />
      </div>

      <TaskViewActions
        task={task}
        userId={userId}
        isDone={isDone}
        loading={loading}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        handleAccept={handleAccept}
        handleComplete={handleComplete}
        handleReschedule={handleReschedule}
        setIsTimerActive={setIsTimerActive}
      />
    </div>
  );
}

function useTaskActions(props: Props) {
  const { task, acceptTask, setDoneTask, editTask, deleteTask, onTasksChange, userId } = props;
  const { supabase } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [reminders, setReminders] = useState<string[]>([]);
  const [remindersLoaded, setRemindersLoaded] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [sharedEmail, setSharedEmail] = useState("");
  const [isTimerActive, setIsTimerActive] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteTask(task.id);
      onTasksChange();
    } catch {
      return;
    }
  };

  const handleEdit = async () => {
    setIsEditing(true);
    setEditedTask(task);
    setRemindersLoaded(false);
    void fetchPendingReminders(supabase, task.id).then((list) => {
      setReminders(list);
      setRemindersLoaded(true);
    });
    if (task.for_user_id && task.for_user_id !== userId) {
      const { data, error } = await supabase.rpc("get_email_by_user_id", {
        target_uuid: task.for_user_id,
      });
      setSharedEmail(!error && data ? (data as string) : "");
    } else {
      setSharedEmail("");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTask(task);
    setSharedEmail("");
  };

  const handleSaveEdit = async () => {
    const reminderError = remindersLoaded ? validateReminders(reminders) : null;
    if (reminderError) {
      toast.error(reminderError);
      return;
    }
    try {
      // Dzień miesiąca reguły liczony od terminu z chwili zapisu (termin mógł się zmienić po wyborze reguły).
      const recurrenceFix = editedTask.is_recurring
        ? taskRecurrenceFields(taskRule(editedTask), editedTask.due_date)
        : {};
      await editTask({ ...editedTask, ...recurrenceFix, shared_with_email: sharedEmail });
      if (remindersLoaded) {
        const { error } = await replacePendingReminders(supabase, userId, task.id, reminders);
        if (error) toast.error(error);
      }
      onTasksChange();
      setIsEditing(false);
      setSharedEmail("");
    } catch {
      return;
    }
  };

  const handleComplete = async (done = true) => {
    try {
      await setDoneTask(task.id, done);
      onTasksChange();
    } catch {
      return;
    }
  };

  const handleReschedule = async (days: number) => {
    try {
      const newDate = format(addDays(parseISO(task.due_date), days), "yyyy-MM-dd");
      await editTask({ ...task, due_date: newDate });
      onTasksChange();
    } catch {
      return;
    }
  };

  const handleAccept = async () => {
    try {
      await acceptTask(task.id);
      onTasksChange();
    } catch (err) {
      console.error("[TaskItem] Akceptacja zadania nie powiodła się:", err);
    }
  };

  const stopTimerAndSave = async (timerSeconds: number) => {
    setIsTimerActive(false);
    if (timerSeconds >= 60) {
      const minutes = Math.floor(timerSeconds / 60);
      const newNote = `Czas: ${minutes} min`;
      const updatedDesc = [task.description || "", newNote].filter(Boolean).join("\n");
      const { error } = await supabase.from("tasks").update({ description: updatedDesc }).eq("id", task.id);
      if (error) throw error;
      onTasksChange();
    }
  };

  const increasePriority = () => setEditedTask((prev) => ({ ...prev, priority: Math.max(1, prev.priority - 1) }));
  const decreasePriority = () => setEditedTask((prev) => ({ ...prev, priority: Math.min(5, prev.priority + 1) }));

  return {
    isEditing,
    editedTask,
    setEditedTask,
    sharedEmail,
    setSharedEmail,
    reminders,
    setReminders,
    remindersLoaded,
    isTimerActive,
    setIsTimerActive,
    handleDelete,
    handleEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleComplete,
    handleReschedule,
    handleAccept,
    stopTimerAndSave,
    increasePriority,
    decreasePriority,
  };
}

const TaskItem = memo(function TaskItem(props: Readonly<Props>) {
  const { task, userId, userOptions, loading } = props;
  const isDone = task.status === "done";

  const titleRef = useRef<HTMLInputElement>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);

  const actions = useTaskActions(props);

  useEffect(() => {
    if (actions.isEditing && titleRef.current) titleRef.current.focus();
  }, [actions.isEditing]);

  useEffect(() => {
    if (!timerRunning || timerPaused) return;
    const interval = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerPaused]);

  const dueDate = new Date(task.due_date).toISOString().split("T")[0];
  const today = getAppDate();
  const isOverdue = dueDate < today;
  const isHighPriority = task.priority === 1;

  if (actions.isTimerActive) {
    return (
      <div className="h-full w-full animate-in duration-300 fade-in zoom-in">
        <UniversalTimer
          title={task.title}
          secondsLeft={timerSeconds}
          running={timerRunning}
          paused={timerPaused}
          compact
          controls={{
            start: () => {
              setTimerRunning(true);
              setTimerPaused(false);
            },
            pause: () => setTimerPaused((p) => !p),
            stop: () => {
              setTimerRunning(false);
              setTimerPaused(false);
              actions.stopTimerAndSave(timerSeconds).catch((err: unknown) => {
                console.error("[TaskItem] Nie udało się zapisać czasu zadania:", err);
              });
              setTimerSeconds(0);
            },
            cancel: () => {
              setTimerRunning(false);
              setTimerPaused(false);
              setTimerSeconds(0);
              actions.setIsTimerActive(false);
            },
          }}
        />
      </div>
    );
  }

  if (actions.isEditing) {
    return (
      <TaskEditForm
        task={task}
        editedTask={actions.editedTask}
        setEditedTask={actions.setEditedTask}
        sharedEmail={actions.sharedEmail}
        setSharedEmail={actions.setSharedEmail}
        userOptions={userOptions}
        handleSaveEdit={actions.handleSaveEdit}
        handleCancelEdit={actions.handleCancelEdit}
        increasePriority={actions.increasePriority}
        decreasePriority={actions.decreasePriority}
        titleRef={titleRef}
        loading={loading}
        reminders={actions.reminders}
        setReminders={actions.setReminders}
        remindersLoaded={actions.remindersLoaded}
      />
    );
  }

  return (
    <TaskView
      task={task}
      userId={userId}
      isDone={isDone}
      isHighPriority={isHighPriority}
      isOverdue={isOverdue}
      setIsTimerActive={actions.setIsTimerActive}
      handleEdit={actions.handleEdit}
      handleDelete={actions.handleDelete}
      handleAccept={actions.handleAccept}
      handleComplete={actions.handleComplete}
      handleReschedule={actions.handleReschedule}
    />
  );
});

export default TaskItem;
