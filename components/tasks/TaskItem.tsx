// components/tasks/TaskItem.tsx (UPDATED VERSION)
import React, { useState, useRef, useEffect } from "react";
import { format, parseISO, addDays } from "date-fns";
import { Check, Edit2, Trash2, X, Save, Timer, ChevronsRight } from "lucide-react";
import { Task } from "../../types";
import { getAppDate } from "../../lib/dateUtils";
import { useTasks } from "../../hooks/useTasks";
import { useSession } from "@supabase/auth-helpers-react";
import TimeContextBadge from "./TimeContextBadge";
import CompletionCelebration from "./CompletionCelebration";

interface Props {
  task: Task;
  onTasksChange: () => void;
  onStartTimer: () => void;
}

export default function TaskItem({ task, onTasksChange, onStartTimer }: Props) {
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const isDone = task.status === "done";
  const { fetchTasks, deleteTask, acceptTask, setDoneTask, editTask, rescheduleTask } = useTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const CELEBRATION_MS = 2500;
  
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && titleRef.current) {
      titleRef.current.focus();
    }
  }, [isEditing]);

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć to zadanie?")) return;
    await deleteTask(id);
    await fetchTasks();
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedTask(task);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTask(task);
  };

  const handleSaveEdit = async () => {
    await editTask(editedTask);
    await fetchTasks();
    onTasksChange();
    setIsEditing(false);
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
    
    await editTask({
      ...task,
      due_date: newDate,
    });
    
    await fetchTasks();
    onTasksChange();
    setIsRescheduling(false);
  };

  const dueDate = new Date(task.due_date).toISOString().split("T")[0];
  const today = getAppDate();
  const isOverdue = dueDate < today;
  const isHighPriority = task.priority === 1;

  const DeleteButton = () => (
    <button
      onClick={() => handleDelete(task.id)}
      className="flex flex-col px-1.5 items-center justify-center rounded-lg text-red-500 hover:text-red-600 transition-colors"
      aria-label="Usuń zadanie"
    >
      <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
      <span className="text-[9px] sm:text-[11px]">Usuń</span>
    </button>
  );

  const EditButton = () => (
    <button
      onClick={handleEdit}
      className="flex flex-col px-1.5 items-center justify-center rounded-lg text-primary hover:text-secondary transition-colors"
      aria-label="Edytuj zadanie"
    >
      <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
      <span className="text-[9px] sm:text-[11px]">Edytuj</span>
    </button>
  );

  const RescheduleButton = () => (
    <button
      onClick={() => handleReschedule(1)}
      disabled={isRescheduling}
      className="flex flex-col px-1.5 items-center justify-center rounded-lg text-yellow-600 hover:text-yellow-800 transition-colors disabled:opacity-50"
      aria-label="Przesuń na jutro"
      title="Przesuń na jutro"
    >
      <ChevronsRight className="w-5 h-5 sm:w-6 sm:h-6" />
      <span className="text-[9px] sm:text-[11px]">
        {isRescheduling ? '...' : 'Odłóż'}
      </span>
    </button>
  );

  const TimerButton = () => (
    <button
      onClick={onStartTimer}
      className="flex flex-col px-1.5 items-center justify-center rounded-lg text-purple-600 hover:text-purple-800 transition-colors"
      aria-label="Uruchom timer"
      title="Start Pomodoro"
    >
      <Timer className="w-5 h-5 sm:w-6 sm:h-6" />
      <span className="text-[9px] sm:text-[11px]">Timer</span>
    </button>
  );

  if (isEditing) {
    return (
      <div className="p-4 max-w-[400px] sm:max-w-[480px] w-full my-1 sm:mx-2 bg-gray-50 border-2 border-gray-300 rounded-xl shadow-lg">
        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-700">Tytuł:</label>
            <input
              ref={titleRef}
              type="text"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Priority and Category */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-700">Priorytet:</label>
              <input
                type="number"
                min={1}
                max={10}
                value={editedTask.priority}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, priority: Number(e.target.value) })
                }
                className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Kategoria:</label>
              <select
                value={editedTask.category}
                onChange={(e) => setEditedTask({ ...editedTask, category: e.target.value })}
                className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
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
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Data wykonania:</label>
            <input
              type="date"
              value={editedTask.due_date}
              onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })}
              className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-700">Opis:</label>
            <textarea
              value={editedTask.description || ""}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleSaveEdit}
              className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
            >
              <span className="text-sm">Zapisz</span>
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              <span className="text-sm">Anuluj</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div
        key={task.id}
        className="p-4 max-w-[400px] sm:max-w-[480px] w-full my-1 sm:mx-2 hover:shadow-lg hover:bg-gray-100 bg-card rounded-xl shadow flex justify-between items-center transition-all"
      >
        <div className="flex-1">
          <div onClick={onStartTimer} className="flex justify-start gap-2 items-center cursor-pointer">
            <span
              className={`w-6 h-6 text-sm font-bold rounded-md flex items-center justify-center shadow-sm transition duration-200 hover:shadow hover:brightness-110`}
              style={{
                backgroundColor:
                  task.priority === 1
                    ? "#fca5a5"
                    : task.priority === 2
                    ? "#fdba74"
                    : task.priority === 3
                    ? "#fde68a"
                    : task.priority === 4
                    ? "#a7f3d0"
                    : "#bbf7d0",
                color:
                  task.priority === 3
                    ? "#A16207"
                    : task.priority >= 3
                    ? "#15803D"
                    : "#B91C1C",
              }}
              title={`Priorytet ${task.priority}`}
            >
              {task.priority}
            </span>

            <h3
              className={`text-xl font-bold break-words
              ${
                isDone
                  ? "text-gray-500 line-through"
                  : isHighPriority || isOverdue
                  ? "text-red-800"
                  : ""
              }
            `}
            >
              {task.title}
            </h3>
          </div>
          
          <hr
            className={`w-[100%] mt-2 mb-3 
              ${
                isDone
                  ? "text-gray-500 line-through"
                  : isHighPriority || isOverdue
                  ? "text-red-800"
                  : ""
              }
            `}
          />
          
          {/* Time Context Badge */}
          <div className="mb-3">
            <TimeContextBadge dueDate={task.due_date} isDone={isDone} />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <p className="text-xs sm:text-sm w-full text-gray-700 m-1 my-auto">
                {task.due_date ? format(parseISO(task.due_date), "dd.MM.yyyy") : ""}
                {task.category && (
                  <>
                    &nbsp;|&nbsp;
                    {task.category}
                  </>
                )}
              </p>
            </div>

            <div className="flex justify-end w-full gap-1.5 flex-wrap">
              {isDone ? (
                <>
                  <EditButton />
                  <DeleteButton />
                </>
              ) : task.user_name !== userEmail &&
                task.status === "waiting_for_acceptance" ? (
                <>
                  <button
                    onClick={async () => {
                      await acceptTask(task.id);
                      await fetchTasks();
                      onTasksChange();
                    }}
                    className="flex flex-col px-1.5 items-center justify-center rounded-lg text-green-600 hover:text-green-800 transition-colors"
                  >
                    <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[9px] sm:text-[11px]">Akceptuj</span>
                  </button>
                  <DeleteButton />
                </>
              ) : (
                <>
                  <button
                    onClick={handleComplete}
                    className="flex flex-col px-1.5 items-center justify-center rounded-lg text-green-600 hover:text-green-800 transition-colors"
                  >
                    <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[9px] sm:text-[11px]">Zrobione</span>
                    
                  </button>
                  <RescheduleButton />
                  <TimerButton />
                  <EditButton />
                  <DeleteButton />
                </>
              )}
            </div>
          </div>
          {(task.description ||
            task.status === "accepted" ||
            task.status === "waiting_for_acceptance") && (
            <p className="mt-2 rounded-lg text-sm bg-gray-100 py-1 px-2">
              <span className="text-xs font-bold">
                {task.priority === 1 && (
                  <>
                    PILNE! <br />
                  </>
                )}
              </span>
              {task.description}
              <span className="text-xs">
                {(task.user_name !== userEmail) && 
                  (task.status === "accepted" || task.status === "waiting_for_acceptance") &&
                    <>
                      <br />
                      Zlecone przez: {task.user_name}
                    </>
                } 
                {(task.for_user !== userEmail) && 
                  (task.status === "accepted" || task.status === "waiting_for_acceptance") &&
                    <>
                      <br />
                      Zlecone dla: {task.for_user}
                    </>
                }
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Completion Celebration */}
      <CompletionCelebration
        show={showCelebration}
        taskTitle={task.title}
        priority={task.priority}
      />
    </>
  );
}