"use client";

import React, { useEffect, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Task } from "../../types";
import Layout from "../../components/Layout";
import Head from "next/head";
import {
  DndContext,
  closestCenter,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Droppable from "../../components/eisenhower/Droppable";
import DraggableTask  from "../../components/eisenhower/DraggableTask";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/router";
import { getAppDate, getAppDateTime } from "../../lib/dateUtils";

const CATEGORIES = [
  "Pilne i ważne",
  "Niepilne, ale ważne",
  "Pilne, ale nieważne",
  "Niepilne i nieważne",
] as const;

type Category = (typeof CATEGORIES)[number];
type BoardState = Record<Category, Task[]>;

export default function EisenhowerPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email || "";
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [board, setBoard] = useState<BoardState>(() => {
    const entries: [Category, Task[]][] = CATEGORIES.map((cat) => [cat, []]);
    return Object.fromEntries(entries) as BoardState;
  });
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    const fetchTasks = async () => {
      const oneMonthAgo = getAppDateTime();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .or(`user_name.eq.${userEmail},for_user.eq.${userEmail}`)
        .neq("status", "done")
        .gte("due_date", oneMonthAgo.toISOString());

      if (error) return;

      const filtered = (data ?? []).filter((task) =>
        ["pending", "accepted"].includes(task.status)
      );

      const sorted: BoardState = {
        "Pilne i ważne": [],
        "Niepilne, ale ważne": [],
        "Pilne, ale nieważne": [],
        "Niepilne i nieważne": [],
      };

      for (const task of filtered) {
        const deadline = task.deadline_date
          ? new Date(task.deadline_date)
          : null;
        const isUrgent = deadline && deadline <= getAppDateTime();
        const isImportant = task.priority <= 2;

        const key: Category = isUrgent
          ? isImportant
            ? "Pilne i ważne"
            : "Pilne, ale nieważne"
          : isImportant
          ? "Niepilne, ale ważne"
          : "Niepilne i nieważne";

        sorted[key].push(task);
      }

      setBoard(sorted);
      setTasks(filtered);
    };

    if (userEmail) fetchTasks();
  }, [userEmail, supabase]);

  const handleDragStart = (event: any) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const task = tasks.find((t) => t.id === active.id);
    const newCategory = over.id as Category;
    if (!task || !newCategory) return;

    const newPriority =
      newCategory === "Pilne i ważne"
        ? 1
        : newCategory === "Niepilne, ale ważne"
        ? 2
        : newCategory === "Pilne, ale nieważne"
        ? 3
        : 4;

    const label = `#${newCategory}`;
    const cleanedDescription = (task.description || "")
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n")
      .trim();

    const updatedDescription = [cleanedDescription, label]
      .filter(Boolean)
      .join("\n");

    await supabase
      .from("tasks")
      .update({
        priority: newPriority,
        description: updatedDescription,
      })
      .eq("id", task.id);

    setBoard((prev) => {
      const updated: BoardState = {
        ...prev,
        ...Object.fromEntries(
          CATEGORIES.map((cat) => [
            cat,
            prev[cat].filter((t) => t.id !== task.id),
          ])
        ),
      };
      updated[newCategory].push({
        ...task,
        priority: newPriority,
        description: updatedDescription,
      });
      return updated;
    });

    setActiveTask(null);
  };

  const handleBack = () => {
      const pathParts = router.pathname.split("/").filter(Boolean);
      if (pathParts.length > 1) {
        const parentPath = "/" + pathParts.slice(0, -1).join("/");
        router.push(parentPath);
      } else {
        router.push("/"); 
      }
    };


  return (
    <>
      <Head>
        <title>Tablica Eisenhowera</title>
      </Head>
      <Layout>
        <main className="p-4">
        <div className="flex justify-start gap-3 items-center mb-4">
          <button
            onClick={handleBack}
            className="p-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-semibold">Tablica Eisenhowera</h2>
        </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-6xl mx-auto">
              {CATEGORIES.map((cat) => (
                <Droppable key={cat} id={cat} title={cat}>
                  <SortableContext
                    items={board[cat].map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {board[cat].map((task) => (
                      <DraggableTask key={task.id} task={task} />
                    ))}
                  </SortableContext>
                </Droppable>
              ))}
            </div>
          </DndContext>
        </main>
      </Layout>
    </>
  );
}
