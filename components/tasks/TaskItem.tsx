import React from "react";
import { format, parseISO } from "date-fns";
import { Check, Edit2, Play, Trash2 } from "lucide-react";
import { Task } from "../../types";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

interface Props {
  task: Task;
  userEmail: string;
  onTasksChange: () => void;
  onEdit: (task: Task) => void;
  onStartTimer: () => void; 
}

export default function TaskItem({
  task,
  userEmail,
  onTasksChange,
  onEdit,
  onStartTimer,
}: Props) {
  const supabase = useSupabaseClient();
  const isDone = task.status === "done";

  const handleDelete = async () => {
    if (!confirm("Czy na pewno chcesz usunąć to zadanie?")) return;
    await supabase.from("tasks").delete().eq("id", task.id);
    onTasksChange();
  };

  const handleEdit = () => {
    onEdit(task);
  };

  const acceptTask = async () => {
    await supabase
      .from("tasks")
      .update({ status: "accepted" })
      .eq("id", task.id);
    onTasksChange();
  };

  const markDone = async () => {
    await supabase.from("tasks").update({ status: "done" }).eq("id", task.id);
    onTasksChange();
  };

  return (
    <li
      key={task.id}
      className={`p-4 max-w-[400px] sm:max-w-[480px] w-full my-1 sm:mx-2 hover:shadow-lg hover:bg-gray-100 bg-card rounded-xl shadow flex justify-between items-center 
        ${
          task.priority === 1
            ? "shadow-red-800 shadow-sm"
            : new Date(task.deadline_date).toISOString().split("T")[0] ===
              new Date().toISOString().split("T")[0]
            ? ""
            : new Date(task.deadline_date) < new Date()
            ? "shadow-red-800 shadow-sm"
            : ""
        }`}
    >
      <div className="flex-1">
        <div onClick={onStartTimer} className="flex justify-start gap-2 items-center mb-3">
        <span
          className={`w-6 h-6 text-sm font-bold rounded-md flex items-center justify-center shadow-sm cursor-pointer transition duration-200 hover:shadow hover:brightness-110`}
          style={{
            backgroundColor:
              task.priority === 1
                ? "#fca5a5" // pastel red
                : task.priority === 2
                ? "#fdba74" // pastel orange
                : task.priority === 3
                ? "#fde68a" // pastel yellow
                : task.priority === 4
                ? "#a7f3d0" // pastel teal-green
                : "#bbf7d0", // pastel green
            color:
              task.priority === 3 
                ? "#A16207"
                : task.priority >= 3
                ? "#15803D"
                : "#B91C1C" // darker red text for high priority
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
                : task.priority === 1
                ? "text-red-800"
                : new Date(task.deadline_date).toISOString().split("T")[0] ===
                  new Date().toISOString().split("T")[0]
                ? ""
                : new Date(task.deadline_date) < new Date()
                ? "text-red-800"
                : ""
            }
          `}
        >
          
          {task.title}
        </h3>
      </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <p className="text-xs sm:text-sm w-full text-gray-700 m-1">
              {task.due_date
                ? format(parseISO(task.due_date), "dd.MM.yyyy")
                : ""}
              {task.deadline_date && (
                <>
                  &nbsp;|&nbsp;
                  {format(parseISO(task.deadline_date), "dd.MM.yyyy")}
                </>
              )}
            </p>
            <p className="text-sm text-gray-600 ml-1 mb-1">{task.category}</p>
          </div>

          <div className="flex justify-end w-full min-w-[140px] gap-1.5">
            {isDone ? (
              <button
                onClick={handleDelete}
                className="flex flex-col px-1.5 items-center justify-center rounded-lg text-red-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[9px] sm:text-[11px]">Usuń</span>
              </button>
            ) : task.user_name !== userEmail &&
              task.status === "waiting_for_acceptance" ? (
              <>
                <button
                  onClick={acceptTask}
                  className="flex flex-col px-1.5 items-center justify-center rounded-lg text-green-600 hover:text-green-800 transition-colors"
                >
                  <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[9px] sm:text-[11px]">Akceptuj</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="flex flex-col px-1.5 items-center justify-center rounded-lg text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[9px] sm:text-[11px]">Usuń</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={markDone}
                  className="flex flex-col px-1.5 items-center justify-center rounded-lg text-green-600 hover:text-green-800 transition-colors"
                >
                  <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[9px] sm:text-[11px]">Zrobione</span>
                </button>
                <button
                  onClick={handleEdit}
                  className="flex flex-col px-1.5 items-center justify-center rounded-lg text-primary hover:text-secondary transition-colors"
                >
                  <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[9px] sm:text-[11px]">Edytuj</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="flex flex-col px-1.5 items-center justify-center rounded-lg text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[9px] sm:text-[11px]">Usuń</span>
                </button>
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
              {task.for_user === userEmail ? (
                (task.status === "accepted" ||
                  task.status === "waiting_for_acceptance") && (
                  <>
                    <br />
                    Zlecone przez: {task.user_name}
                  </>
                )
              ) : (
                <>
                  <br />
                  Zlecone dla: {task.for_user}
                </>
              )}
            </span>
          </p>
        )}
      </div>
    </li>
  );
}
