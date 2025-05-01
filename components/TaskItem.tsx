import React from "react";
import { format, parseISO } from "date-fns";
import { Check, Edit2, Trash2 } from "lucide-react";
import { Task } from "../types";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

interface Props {
  task: Task;
  userEmail: string;
  onTasksChange: () => void;
  onEdit: (task: Task) => void;
}

export default function TaskItem({
  task,
  userEmail,
  onTasksChange,
  onEdit,
}: Props) {
  const supabase = useSupabaseClient();
  const isDone = task.status === "done";

  const handleDelete = async () => {
    if (!confirm("Czy na pewno chcesz usunąć to zadanie?")) return;
    await supabase.from("tasks").delete().eq("id", task.id);
    onTasksChange();
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

  const handleEdit = () => {
    onEdit(task);
  };

  return (
    <li
      key={task.id}
      className="p-4 max-w-[400px] sm:max-w-[480px] m-4 bg-card rounded-xl shadow flex justify-between items-center"
    >
      <div className="flex-1">
        <h3
          className={`text-xl font-bold mb-3 ${
            isDone ? "text-gray-500 line-through" : ""
          }`}
        >
          {task.priority} | {task.title}
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <p className="text-xs sm:text-sm text-gray-700 m-1">
              {task.due_date
                ? format(parseISO(task.due_date), "dd.MM.yyyy")
                : ""}
              {task.deadline_date && (
                <>
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  {format(parseISO(task.deadline_date), "dd.MM.yyyy")}
                </>
              )}
            </p>
            <p className="text-sm text-gray-600 ml-1 mb-1">{task.category}</p>
          </div>

          <div className="flex w-full min-w-[140px] sm:min-w-[210px] gap-2">
            {isDone ? (
              <button
                onClick={handleDelete}
                className="flex-1 flex flex-col items-center justify-center p-1 sm:p-2 border rounded-xl text-red-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4 sm:w-6 sm:h-6" />
                <span className="text-[8px] sm:text-[11px]">Usuń</span>
              </button>
            ) : task.for_user !== userEmail &&
              task.status === "waiting_for_acceptance" ? (
              <>
                <button
                  onClick={acceptTask}
                  className="flex-1 flex flex-col items-center justify-center p-1 sm:p-2 border rounded-xl text-green-600 hover:text-green-800 transition-colors"
                >
                  <Check className="w-4 h-4 sm:w-6 sm:h-6" />
                  <span className="text-[8px] sm:text-[11px]">Akceptuj</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 flex flex-col items-center justify-center p-1 sm:p-2 border rounded-xl text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4 sm:w-6 sm:h-6" />
                  <span className="text-[8px] sm:text-[11px]">Usuń</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={markDone}
                  className="flex-1 flex flex-col items-center justify-center p-1 sm:p-2 border rounded-xl text-green-600 hover:text-green-800 transition-colors"
                >
                  <Check className="w-4 h-4 sm:w-6 sm:h-6" />
                  <span className="text-[8px] sm:text-[11px]">Zrobione</span>
                </button>
                <button
                  onClick={handleEdit}
                  className="flex-1 flex flex-col items-center justify-center p-1 sm:p-2 border rounded-xl text-primary hover:text-secondary transition-colors"
                >
                  <Edit2 className="w-4 h-4 sm:w-6 sm:h-6" />
                  <span className="text-[8px] sm:text-[11px]">Edytuj</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 flex flex-col items-center justify-center p-1 sm:p-2 border rounded-xl text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4 sm:w-6 sm:h-6" />
                  <span className="text-[8px] sm:text-[11px]">Usuń</span>
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-2 rounded-lg bg-gray-200 py-1 px-2">
          {task.description}
        </p>
      </div>
    </li>
  );
}
