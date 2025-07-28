"use client";

import { useEffect, useState } from "react";
import { parseISO, isToday, isPast, format } from "date-fns";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Task } from "../../types";
import Head from "next/head";
import Layout from "../../components/Layout";

const CATEGORIES = [
  "Pilne i ważne",
  "Niepilne, ale ważne",
  "Pilne, ale nieważne",
  "Niepilne i nieważne",
] as const;

type Category = (typeof CATEGORIES)[number];

export default function EisenhowerPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email ?? "";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<Record<Category, Task[]>>({
    "Pilne i ważne": [],
    "Niepilne, ale ważne": [],
    "Pilne, ale nieważne": [],
    "Niepilne i nieważne": [],
  });

  const fetchTasksForEisenhower = async () => {
    setLoading(true);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .or(`user_name.eq.${userEmail},for_user.eq.${userEmail}`)
      .neq("status", "done")
      .gte("due_date", oneMonthAgo.toISOString());

    if (error) {
      console.error("Błąd podczas pobierania zadań:", error.message);
      setLoading(false);
      return;
    }

    const filtered = (data ?? []).filter((task) =>
      ["pending", "accepted"].includes(task.status)
    );

    // sortuj lokalnie po due_date
    filtered.sort((a, b) =>
      new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime()
    );

    setTasks(filtered);
    setLoading(false);
  };

  // klasyfikacja do kwadrantów
  useEffect(() => {
    const today = new Date();

    const sorted: Record<Category, Task[]> = {
      "Pilne i ważne": [],
      "Niepilne, ale ważne": [],
      "Pilne, ale nieważne": [],
      "Niepilne i nieważne": [],
    };

    for (const task of tasks) {
      const deadline = task.deadline_date ? parseISO(task.deadline_date) : null;
      const isUrgent = deadline && (isToday(deadline) || isPast(deadline));
      const isImportant = task.priority <= 2;

      if (isUrgent && isImportant) {
        sorted["Pilne i ważne"].push(task);
      } else if (!isUrgent && isImportant) {
        sorted["Niepilne, ale ważne"].push(task);
      } else if (isUrgent && !isImportant) {
        sorted["Pilne, ale nieważne"].push(task);
      } else {
        sorted["Niepilne i nieważne"].push(task);
      }
    }

    setBoard(sorted);
  }, [tasks]);

  useEffect(() => {
    if (userEmail) fetchTasksForEisenhower();
  }, [userEmail]);

  const handleDrop = async (task: Task, to: Category) => {
    const newPriority =
      to === "Pilne i ważne"
        ? 1
        : to === "Niepilne, ale ważne"
        ? 2
        : to === "Pilne, ale nieważne"
        ? 3
        : 5;

    const label = `#${to}`;

    const cleanedDescription = (task.description || "")
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n")
      .trim();

    const updatedDescription = [cleanedDescription, label]
      .filter(Boolean)
      .join("\n");

    const { error } = await supabase
      .from("tasks")
      .update({
        priority: newPriority,
        description: updatedDescription,
      })
      .eq("id", task.id);

    if (error) {
      console.error("Błąd aktualizacji zadania:", error.message);
      return;
    }

    setBoard((prev) => {
      const newBoard = { ...prev };
      for (const cat of CATEGORIES) {
        newBoard[cat] = newBoard[cat].filter((t) => t.id !== task.id);
      }
      newBoard[to] = [
        ...newBoard[to],
        { ...task, priority: newPriority, description: updatedDescription },
      ];
      return newBoard;
    });
  };

  const onDragStart = (task: Task) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(task));
  };

  const onDrop = (category: Category) => (e: React.DragEvent) => {
    e.preventDefault();
    const task: Task = JSON.parse(e.dataTransfer.getData("text/plain"));
    handleDrop(task, category);
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <>
    <Head>
      <title>Eisenhower – Dzisiajv3</title>
    </Head>
    <Layout>
    <main className="p-4">
      <h2 className="text-2xl font-bold text-center mb-6">Tablica Eisenhowera</h2>

      {loading ? (
        <p className="text-center text-gray-500">Ładowanie zadań...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-6xl mx-auto">
          {CATEGORIES.map((category) => (
            <div
              key={category}
              onDrop={onDrop(category)}
              onDragOver={onDragOver}
              className="min-h-[200px] bg-zinc-100 rounded-xl p-4 shadow border border-zinc-200"
            >
              <h3 className="text-md font-semibold mb-3">{category}</h3>
              <ul className="space-y-2">
                {board[category].map((task) => (
                  <li
                    key={task.id}
                    draggable
                    onDragStart={onDragStart(task)}
                    className="p-2 bg-white rounded shadow-sm cursor-move hover:bg-zinc-50 transition"
                  >
                    <div className="font-semibold">{task.title}</div>
                    <div className="text-xs text-gray-500">
                      {task.deadline_date &&
                        format(parseISO(task.deadline_date), "dd.MM.yyyy")}
                      {" • "}
                      Priorytet {task.priority}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </main>
    </Layout>
    </>
  );
}
