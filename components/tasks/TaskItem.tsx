"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import { format, parseISO, addDays } from "date-fns";
import { Check, Minus, Plus } from "lucide-react";
import { Task } from "../../types";
import { getAppDate } from "../../lib/dateUtils";
import TimeContextBadge from "./TimeContextBadge";
import UniversalTimer from "../Timer";
import {
  EditButton, DeleteButton, RescheduleButton, TimerButton, FormButtons,
} from "../CommonButtons";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";

interface Props {
  task: Task;
  acceptTask: (id: string) => Promise<void> | void;
  setDoneTask: (id: string) => Promise<void> | void;
  editTask: (task: Task & { shared_with_email?: string }) => Promise<void> | void;
  deleteTask: (id: string) => Promise<void> | void;
  onTasksChange: () => void;
  userId: string;
  userOptions: string[];
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
  titleRef
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
}>) {
  const editPrefix = `edit-task-${task.id}`;

  return (
    <div className="p-4 w-full bg-card border border-primary dark:border-primary-dark rounded-xl shadow-lg transition-colors">
      <div className="space-y-3">
        <div>
          <label htmlFor={`${editPrefix}-title`} className="form-label">Tytuł zadania:</label>
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
            <div className="flex items-stretch gap-1.5 mt-1">
              <button type="button" onClick={decreasePriority} className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-surfaceHover text-textSecondary hover:text-text transition-colors shadow-sm shrink-0"><Minus size={18} /></button>
              <div className="flex-1 flex items-center justify-center text-lg card rounded-xl text-text shadow-inner">{editedTask.priority}</div>
              <button type="button" onClick={increasePriority} className="p-2 sm:p-2.5 bg-surface border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-surfaceHover text-textSecondary hover:text-text transition-colors shadow-sm shrink-0"><Plus size={18} /></button>
            </div>
          </div>
          <div>
            <label htmlFor={`${editPrefix}-category`} className="form-label">Kategoria:</label>
            <select 
              id={`${editPrefix}-category`} 
              value={editedTask.category} 
              onChange={(e) => setEditedTask({ ...editedTask, category: e.target.value })} 
              className="input-field py-1.5 h-[38px]"
            >
              {["edukacja","praca","osobiste","aktywizm","przyjaciele","zakupy","podróże","trening","inne"].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${editPrefix}-date`} className="form-label">Data wykonania:</label>
            <input 
              id={`${editPrefix}-date`} 
              type="date" 
              value={editedTask.due_date} 
              onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })} 
              className="input-field w-full min-w-0 px-1 text-xs h-[38px]" 
            />
          </div>
          {userOptions.length > 0 && (
            <div>
              <label htmlFor={`${editPrefix}-share`} className="form-label">Udostępnij dla:</label>
              <select 
                id={`${editPrefix}-share`} 
                value={sharedEmail} 
                onChange={(e) => setSharedEmail(e.target.value)} 
                className="input-field py-1.5 h-[38px]"
              >
                <option value="">Tylko dla mnie</option>
                {userOptions.map((email: string) => (
                  <option key={email} value={email}>{email}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div>
          <label htmlFor={`${editPrefix}-desc`} className="form-label">Opis:</label>
          <textarea 
            id={`${editPrefix}-desc`} 
            value={editedTask.description || ""} 
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })} 
            className="input-field" 
            rows={2} 
          />
        </div>
          <FormButtons onClickSave={handleSaveEdit} onClickClose={handleCancelEdit} />
      </div>
    </div>
  );
}

function TaskViewActions({
  task,
  userId,
  isDone,
  isRescheduling,
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
  isRescheduling: boolean;
  handleEdit: () => void;
  handleDelete: () => void;
  handleAccept: () => void;
  handleComplete: () => void;
  handleReschedule: (days: number) => void;
  setIsTimerActive: (val: boolean) => void;
}>) {
  if (isDone) {
    return (
      <div className="flex justify-between w-full gap-1 sm:gap-1.5 pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
        <EditButton onClick={handleEdit} />
        <DeleteButton onClick={handleDelete} />
      </div>
    );
  }

  if (task.user_id !== userId && task.status === "waiting_for_acceptance") {
    return (
      <div className="flex justify-between w-full gap-1 sm:gap-1.5 pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
        <button onClick={handleAccept} className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors border border-green-200 dark:border-green-500/30">
          <Check className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
          <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Akceptuj</span>
        </button>
        <DeleteButton onClick={handleDelete} />
      </div>
    );
  }

  return (
    <div className="flex justify-between w-full gap-1 sm:gap-1.5 pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
      <button onClick={handleComplete} className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors">
        <Check className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
        <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wide">Zrobione</span>
      </button>
      <RescheduleButton onClick={() => handleReschedule(1)} loading={isRescheduling} />
      <TimerButton onClick={() => setIsTimerActive(true)} />
      <EditButton onClick={handleEdit} />
      <DeleteButton onClick={handleDelete} />
    </div>
  );
}

const getPriorityColors = (priority: number) => {
  switch (priority) {
    case 1: return { backgroundColor: "#fca5a5", color: "#B91C1C" };
    case 2: return { backgroundColor: "#fdba74", color: "#B91C1C" };
    case 3: return { backgroundColor: "#fde68a", color: "#A16207" };
    case 4: return { backgroundColor: "#a7f3d0", color: "#15803D" };
    default: return { backgroundColor: "#bbf7d0", color: "#15803D" };
  }
};

const getTitleClasses = (isDone: boolean, isHighPriority: boolean, isOverdue: boolean) => {
  if (isDone) return "text-textMuted line-through";
  if (isHighPriority || isOverdue) return "text-red-600 dark:text-red-400";
  return "text-text";
};

function TaskDetails({ task }: { readonly task: Task }) {
  const hasDescription = !!task.description;
  const showShareInfo = !!(
    task.display_share_info && 
    ["accepted", "waiting_for_acceptance", "pending"].includes(task.status)
  );

  if (!hasDescription && !showShareInfo) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-2 rounded-lg bg-surface border border-gray-100 dark:border-gray-800 p-3">
      {hasDescription && (
        <span className="text-xs text-textSecondary whitespace-pre-wrap leading-relaxed">
          {task.description}
        </span>
      )}
      {showShareInfo && (
        <span className="text-xs font-medium text-primary truncate mt-1">
          {task.display_share_info}
        </span>
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
  setIsTimerActive,
  handleEdit,
  handleDelete,
  handleAccept,
  handleComplete,
  handleReschedule,
  isRescheduling
}: Readonly<{
  task: Task;
  userId: string;
  isDone: boolean;
  isHighPriority: boolean;
  isOverdue: boolean;
  setIsTimerActive: (val: boolean) => void;
  handleEdit: () => void;
  handleDelete: () => void;
  handleAccept: () => void;
  handleComplete: () => void;
  handleReschedule: (days: number) => void;
  isRescheduling: boolean;
}>) {
  return (
    <div className="card min-w-0 p-4 w-full rounded-2xl hover:border-primary transition-all flex flex-col text-left">
      <div className="space-y-3 flex-1">
        
        <button 
          type="button" 
          onClick={() => setIsTimerActive(true)} 
          className="flex justify-start gap-3 items-start cursor-pointer focus:outline-none w-full text-left"
        >
          <span
            className="w-6 h-6 shrink-0 mt-0.5 text-xs font-bold rounded-md flex items-center justify-center shadow-sm"
            style={getPriorityColors(task.priority)}
            title={`Priorytet ${task.priority}`}
          >
            {task.priority}
          </span>
          <h3 className={`text-lg sm:text-xl font-bold break-words leading-tight ${getTitleClasses(isDone, isHighPriority, isOverdue)}`}>
            {task.title}
          </h3>
        </button>

        <div className="flex flex-wrap gap-2 items-center">
          <TimeContextBadge dueDate={task.due_date} isDone={isDone} />
          {task.category && (
            <span className="px-2 py-1 md:px-3 md:py-1.5 bg-surface border border-gray-200 dark:border-gray-700 text-textSecondary rounded-md text-[10px] md:text-sm font-bold uppercase tracking-wider">
              {task.category}
            </span>
          )}
        </div>

        <TaskDetails task={task} />

      </div>

      <TaskViewActions 
        task={task}
        userId={userId}
        isDone={isDone}
        isRescheduling={isRescheduling}
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
  const [editedTask, setEditedTask] = useState(task);
  const [sharedEmail, setSharedEmail] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  const handleDelete = async () => {
    const ok = await toast.confirm("Czy na pewno chcesz usunąć to zadanie?");
    if (!ok) return;
    try {
      await deleteTask(task.id);
      toast.success("Usunięto pomyślnie.");
      onTasksChange();
    } catch {
      toast.error("Wystąpił błąd podczas usuwania.");
    }
  };

  const handleEdit = async () => {
    setIsEditing(true);
    setEditedTask(task);
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
    try {
      await editTask({ ...editedTask, shared_with_email: sharedEmail });
      toast.success("Zmieniono pomyślnie.");
      onTasksChange();
      setIsEditing(false);
      setSharedEmail("");
    } catch {
      toast.error("Wystąpił błąd podczas zapisywania.");
    }
  };

  const handleComplete = async () => {
    try {
      await setDoneTask(task.id);
      toast.success("Zadanie wykonane!");
      onTasksChange();
    } catch {
      toast.error("Wystąpił błąd podczas kończenia zadania.");
    }
  };

  const handleReschedule = async (days: number) => {
    setIsRescheduling(true);
    try {
      const newDate = format(addDays(parseISO(task.due_date), days), "yyyy-MM-dd");
      await editTask({ ...task, due_date: newDate });
      toast.success("Zadanie przełożone.");
      onTasksChange();
    } catch {
      toast.error("Wystąpił błąd podczas przekładania zadania.");
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleAccept = async () => {
    try {
      await acceptTask(task.id);
      toast.success("Zadanie zaakceptowane.");
      onTasksChange();
    } catch {
      toast.error("Wystąpił błąd podczas akceptacji.");
    }
  };

  const stopTimerAndSave = async (timerSeconds: number) => {
    setIsTimerActive(false);
    if (timerSeconds >= 60) {
      try {
        const minutes = Math.floor(timerSeconds / 60);
        const newNote = `Czas: ${minutes} min`;
        const updatedDesc = [task.description || "", newNote].filter(Boolean).join("\n");
        await supabase.from("tasks").update({ description: updatedDesc }).eq("id", task.id);
        toast.success("Zapisano czas pracy.");
        onTasksChange();
      } catch {
        toast.error("Nie udało się zapisać czasu z timera.");
      }
    }
  };

  const increasePriority = () => setEditedTask((prev) => ({ ...prev, priority: Math.max(1, prev.priority - 1) }));
  const decreasePriority = () => setEditedTask((prev) => ({ ...prev, priority: Math.min(5, prev.priority + 1) }));

  return {
    isEditing, editedTask, setEditedTask, sharedEmail, setSharedEmail,
    isRescheduling, isTimerActive, setIsTimerActive,
    handleDelete, handleEdit, handleCancelEdit, handleSaveEdit,
    handleComplete, handleReschedule, handleAccept, stopTimerAndSave,
    increasePriority, decreasePriority
  };
}

const TaskItem = memo(function TaskItem(props: Readonly<Props>) {
  const { task, userId, userOptions } = props;
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
      <div className="w-full h-full animate-in fade-in zoom-in duration-300">
        <UniversalTimer
          title={task.title}
          secondsLeft={timerSeconds}
          running={timerRunning}
          paused={timerPaused}
          compact
          controls={{
            start: () => { setTimerRunning(true); setTimerPaused(false); },
            pause: () => setTimerPaused((p) => !p),
            stop: () => {
              setTimerRunning(false);
              setTimerPaused(false);
              actions.stopTimerAndSave(timerSeconds);
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
      isRescheduling={actions.isRescheduling}
    />
  );
});

export default TaskItem;