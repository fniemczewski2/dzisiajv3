"use client";

import React, { useState, useRef, useEffect } from "react";
import { format, parseISO, addDays } from "date-fns";
import { Check, Minus, Plus } from "lucide-react";
import { Task } from "../../types";
import { getAppDate } from "../../lib/dateUtils";
import { useTasks } from "../../hooks/useTasks";
import TimeContextBadge from "./TimeContextBadge";
import CompletionCelebration from "./CompletionCelebration";
import UniversalTimer from "../Timer";
import { useSettings } from "../../hooks/useSettings"; // DODANE: hook ustawień
import { 
  EditButton, 
  DeleteButton, 
  RescheduleButton, 
  TimerButton,
  SaveButton,
  CancelButton 
} from "../CommonButtons";
import { useAuth } from "../../providers/AuthProvider";

interface Props {
  task: Task;
  onTasksChange: () => void;
}

export default function TaskItem({ task, onTasksChange }: Props) {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const isDone = task.status === "done";
  const { fetchTasks, deleteTask, acceptTask, setDoneTask, editTask } = useTasks();
  const { settings } = useSettings(); // DODANE: ustawienia (do pobrania e-maili)
  const userOptions = settings?.users ?? [];
  
  // Stany ogólne
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [sharedEmail, setSharedEmail] = useState(""); // DODANE: Stan dla udostępnianego maila
  const [showCelebration, setShowCelebration] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const CELEBRATION_MS = 2500;
  
  const titleRef = useRef<HTMLInputElement>(null);

  // --- STANY TIMERA ---
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);

  useEffect(() => {
    if (isEditing && titleRef.current) {
      titleRef.current.focus();
    }
  }, [isEditing]);

  // Logika odliczania czasu
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && !timerPaused) {
      interval = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerPaused]);

  const handleDelete = async () => {
    if (!confirm("Czy na pewno chcesz usunąć to zadanie?")) return;
    await deleteTask(task.id);
    await fetchTasks();
    onTasksChange();
  };

  const handleEdit = async () => {
    setIsEditing(true);
    setEditedTask(task);

    // Pobieramy e-mail dla trybu edycji (jeśli zadanie było już udostępnione)
    if (task.for_user_id) {
      const { data, error } = await supabase.rpc('get_email_by_user_id', { 
        target_uuid: task.for_user_id 
      });
      if (data && !error) {
        setSharedEmail(data);
      } else {
        setSharedEmail("");
      }
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
    let targetUserId = null;

    // Zamieniamy wybrany e-mail na ID użytkownika
    if (sharedEmail) {
      const { data, error } = await supabase.rpc('get_user_id_by_email', { 
        email_address: sharedEmail 
      });

      if (data && !error) {
        targetUserId = data;
      } else {
        alert("Błąd: Nie znaleziono użytkownika o takim adresie e-mail w bazie.");
        return;
      }
    }

    // Dodajemy przetłumaczone ID do edytowanego zadania
    await editTask({
      ...editedTask,
      for_user_id: targetUserId,
    });
    
    await fetchTasks();
    onTasksChange();
    setIsEditing(false);
    setSharedEmail("");
  };

  const handleComplete = async () => {
    await setDoneTask(task.id);
    setShowCelebration(true);

    setTimeout(async () => {
      setShowCelebration(false); 
      try {
        await fetchTasks();
        onTasksChange();
      } catch (err) {
        console.error("Fetch tasks error", err);
      }
    }, CELEBRATION_MS);
  };

  const handleReschedule = async (days: number) => {
    setIsRescheduling(true);
    const currentDate = parseISO(task.due_date);
    const newDate = format(addDays(currentDate, days), "yyyy-MM-dd");
    
    await editTask({ ...task, due_date: newDate });
    await fetchTasks();
    onTasksChange();
    setIsRescheduling(false);
  };

  // --- FUNKCJE TIMERA ---
  const handleOpenTimer = () => {
    setIsTimerActive(true);
  };

  const stopTimerAndSave = async () => {
    setTimerRunning(false);
    setTimerPaused(false);
    setIsTimerActive(false); 

    if (timerSeconds >= 60) {
      const minutes = Math.floor(timerSeconds / 60);
      const newNote = `Czas: ${minutes} min`;
      const updatedDesc = [task.description || "", newNote].filter(Boolean).join("\n");

      await supabase
        .from("tasks")
        .update({ description: updatedDesc })
        .eq("id", task.id);
        
      await fetchTasks();
      onTasksChange();
    }
    setTimerSeconds(0);
  };

  const cancelTimer = () => {
    setTimerRunning(false);
    setTimerPaused(false);
    setTimerSeconds(0);
    setIsTimerActive(false);
  };

  const increasePriority = () => setEditedTask(prev => ({ ...prev, priority: Math.max(1, prev.priority - 1) }));
  const decreasePriority = () => setEditedTask(prev => ({ ...prev, priority: Math.min(5, prev.priority + 1) }));

  const dueDate = new Date(task.due_date).toISOString().split("T")[0];
  const today = getAppDate();
  const isOverdue = dueDate < today;
  const isHighPriority = task.priority === 1;

  // 1. WIDOK: TRYB TIMERA
  if (isTimerActive) {
    return (
      <div className="w-full h-full animate-in fade-in zoom-in duration-300">
        <UniversalTimer
          title={task.title}
          secondsLeft={timerSeconds}
          running={timerRunning}
          paused={timerPaused}
          compact={true} 
          controls={{
            start: () => {
              setTimerRunning(true);
              setTimerPaused(false);
            },
            pause: () => setTimerPaused((p) => !p),
            stop: stopTimerAndSave,
            cancel: cancelTimer,
          }}
        />
      </div>
    );
  }

  // 2. WIDOK: TRYB EDYCJI
  if (isEditing) {
    return (
      <div className="p-4 w-full bg-card border border-primary dark:border-primary-dark rounded-xl shadow-lg transition-colors">
        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className="form-label">Tytuł zadania:</label>
            <input
              ref={titleRef}
              type="text"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className="input-field font-medium"
            />
          </div>

          {/* Priority and Category */}
          <div className="grid grid-cols-2 gap-3">
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
                  {editedTask.priority}
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
              <label className="form-label">Kategoria:</label>
              <select
                value={editedTask.category}
                onChange={(e) => setEditedTask({ ...editedTask, category: e.target.value })}
                className="input-field py-1.5 h-[38px]"
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
                  "inne"
                ].map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Data wykonania:</label>
              <input
                type="date"
                value={editedTask.due_date}
                onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })}
                className="input-field w-full min-w-0 px-1 text-xs h-[38px]"
              />
            </div>

            {/* Udostępnianie zadania */}
            {userOptions.length > 0 && (
              <div>
                <label className="form-label">Udostępnij dla:</label>
                <select
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
            <label className="form-label">Opis:</label>
            <textarea
              value={editedTask.description || ""}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              className="input-field"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <SaveButton onClick={handleSaveEdit} type="button" />
            <CancelButton onCancel={handleCancelEdit} />
          </div>
        </div>
      </div>
    );
  }
  
  // 3. WIDOK NORMALNY
  return (
    <>
      <div className="p-4 w-full h-full card hover:border-primary/50 dark:hover:border-primary-dark/50 rounded-xl shadow-sm flex flex-col justify-between transition-all group">
        
        <div className="space-y-3 flex-1">
          <div onClick={handleOpenTimer} className="flex justify-start gap-3 items-start cursor-pointer">
            <span
              className="w-6 h-6 shrink-0 mt-0.5 text-xs font-bold rounded-md flex items-center justify-center shadow-sm transition duration-200 group-hover:shadow"
              style={{
                backgroundColor:
                  task.priority === 1 ? "#fca5a5"
                  : task.priority === 2 ? "#fdba74"
                  : task.priority === 3 ? "#fde68a"
                  : task.priority === 4 ? "#a7f3d0"
                  : "#bbf7d0",
                color:
                  task.priority === 3 ? "#A16207"
                  : task.priority >= 3 ? "#15803D"
                  : "#B91C1C",
              }}
              title={`Priorytet ${task.priority}`}
            >
              {task.priority}
            </span>

            <h3
              className={`text-lg sm:text-xl font-bold break-words leading-tight
                ${isDone 
                  ? "text-textMuted line-through" 
                  : (isHighPriority || isOverdue) 
                    ? "text-red-600 dark:text-red-400" 
                    : "text-text"
                }
              `}
            >
              {task.title}
            </h3>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <TimeContextBadge dueDate={task.due_date} isDone={isDone} />
            {task.category && (
              <span className="text-sm px-3 py-1.5 bg-surface border border-gray-200 dark:border-gray-700 text-textSecondary rounded text-[10px] font-bold uppercase tracking-wider">
                {task.category}
              </span>
            )}
          </div>

          {(task.description || task.display_share_info) && (
            <div className="flex flex-col gap-1.5 mt-2 rounded-lg bg-surface border border-gray-100 dark:border-gray-800 p-3">
              {task.description && (
                <span className="text-sm text-textSecondary whitespace-pre-wrap leading-relaxed">{task.description}</span>
              )}
              {task.display_share_info && 
                (task.status === "accepted" || task.status === "waiting_for_acceptance" || task.status === "pending") && (
                <span className="text-xs font-medium text-primary truncate mt-1">
                  {task.display_share_info}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Przyciski Akcji */}
        <div className="flex justify-between w-full gap-1 sm:gap-1.5 pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
          
          {isDone ? (
            <>
              <EditButton onClick={handleEdit} />
              <DeleteButton onClick={handleDelete} />
            </>
          ) : task.user_id !== userId && task.status === "waiting_for_acceptance" ? (
            <>
              <button
                onClick={async () => {
                  await acceptTask(task.id);
                  await fetchTasks();
                  onTasksChange();
                }}
                className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors border border-green-200 dark:border-green-500/30"
              >
                <Check className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide">Akceptuj</span>
              </button>
              <DeleteButton onClick={handleDelete} />
            </>
          ) : (
            <>
              <button
                onClick={handleComplete}
                className="flex-1 flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors"
              >
                <Check className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide">Zrobione</span>
              </button>
              <RescheduleButton onClick={() => handleReschedule(1)} loading={isRescheduling} />
              <TimerButton onClick={handleOpenTimer} />
              <EditButton onClick={handleEdit} />
              <DeleteButton onClick={handleDelete} />
            </>
          )}
        </div>
      </div>

      <CompletionCelebration show={showCelebration} taskTitle={task.title} priority={task.priority} />
    </>
  );
}