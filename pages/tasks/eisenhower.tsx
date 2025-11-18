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
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Droppable from "../../components/eisenhower/Droppable";
import DraggableTask  from "../../components/eisenhower/DraggableTask";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/router";
import { getAppDateTime } from "../../lib/dateUtils";
import { useTasks } from "../../hooks/useTasks";

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
  const { fetchTasks, editTask } = useTasks();
 
  const [tasks, setTasks] = useState<Task[]>([]);
  const [board, setBoard] = useState<BoardState>(() => {
    const entries: [Category, Task[]][] = CATEGORIES.map((cat) => [cat, []]);
    return Object.fromEntries(entries) as BoardState;
  });
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const loadTasks = async () => {
    setIsRefreshing(true);
    
    try {
      const fetchedTasks = await fetchTasks();
      
      if (!fetchedTasks || fetchedTasks.length === 0) {
        setBoard({
          "Pilne i ważne": [],
          "Niepilne, ale ważne": [],
          "Pilne, ale nieważne": [],
          "Niepilne i nieważne": [],
        });
        setTasks([]);
        setIsRefreshing(false);
        return;
      }

      const filtered = fetchedTasks.filter((task: Task) =>
        ["pending", "accepted"].includes(task.status)
      );

      const sorted: BoardState = {
        "Pilne i ważne": [],
        "Niepilne, ale ważne": [],
        "Pilne, ale nieważne": [],
        "Niepilne i nieważne": [],
      };

      // Sort tasks based ONLY on their priority, not on due_date
      for (const task of filtered) {
        let key: Category;
        
        // Map priority directly to category
        switch (task.priority) {
          case 1:
            key = "Pilne i ważne";
            break;
          case 2:
            key = "Niepilne, ale ważne";
            break;
          case 3:
            key = "Pilne, ale nieważne";
            break;
          case 4:
          default:
            key = "Niepilne i nieważne";
            break;
        }

        sorted[key].push(task);
      }

      setBoard(sorted);
      setTasks(filtered);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleDragStart = (event: any) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    
    if (!task) {
      console.error("Task not found:", active.id);
      return;
    }

    // Get the droppable zone ID - it might be nested in over.data.current.sortable
    let droppedCategory: string;
    
    // If dropped over a task (sortable item), get its container
    if (over.data?.current?.sortable?.containerId) {
      droppedCategory = over.data.current.sortable.containerId;
    } else {
      // If dropped directly on droppable zone
      droppedCategory = over.id;
    }
    
    // Validate that droppedCategory is actually a valid category
    if (!CATEGORIES.includes(droppedCategory as Category)) {
      console.error("Invalid category:", droppedCategory);
      return;
    }
    
    const validCategory = droppedCategory as Category;

    // Map category to priority
    const newPriority =
      validCategory === "Pilne i ważne"
        ? 1
        : validCategory === "Niepilne, ale ważne"
        ? 2
        : validCategory === "Pilne, ale nieważne"
        ? 3
        : 4;

    // Only update priority, don't change description
    const updatedTask = {
      ...task,
      priority: newPriority,
    };

    // Update UI immediately
    setBoard((prev) => {
      const updated: BoardState = {
        "Pilne i ważne": [...prev["Pilne i ważne"]],
        "Niepilne, ale ważne": [...prev["Niepilne, ale ważne"]],
        "Pilne, ale nieważne": [...prev["Pilne, ale nieważne"]],
        "Niepilne i nieważne": [...prev["Niepilne i nieważne"]],
      };
      
      // Remove task from all categories
      CATEGORIES.forEach((cat) => {
        updated[cat] = updated[cat].filter((t) => t.id !== task.id);
      });
      
      // Add updated task to the dropped category
      updated[validCategory].push(updatedTask);
      
      return updated;
    });

    // Update database using editTask from useTasks hook
    try {
      await editTask(updatedTask);
      // Don't reload - the optimistic update is already correct
    } catch (error) {
      console.error("Failed to update task:", error);
      // Only reload on error to revert the optimistic update
      await loadTasks();
    }
  };

  const handleDragCancel = () => {
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

  const handleRefresh = async () => {
    await loadTasks();
  };

  return (
    <>
      <Head>
        <title>Tablica Eisenhowera</title>
      </Head>
      <Layout>
        <main className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-3 items-center">
              <button
                onClick={handleBack}
                className="p-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-xl font-semibold">Tablica Eisenhowera</h2>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow transition-colors disabled:opacity-50"
              title="Odśwież zadania"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
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

            <DragOverlay dropAnimation={null}>
              {activeTask ? (
                <div className="p-2 bg-white rounded shadow-lg text-sm opacity-90 rotate-3 scale-105">
                  <div className="flex flex-nowrap gap-2 items-center mb-1">
                    <span
                      className="w-6 h-6 text-sm font-bold rounded-md flex items-center justify-center shadow-sm"
                      style={{
                        backgroundColor:
                          activeTask.priority === 1
                            ? "#fca5a5"
                            : activeTask.priority === 2
                            ? "#fdba74"
                            : activeTask.priority === 3
                            ? "#fde68a"
                            : activeTask.priority === 4
                            ? "#a7f3d0"
                            : "#bbf7d0",
                        color:
                          activeTask.priority === 3 
                            ? "#A16207"
                            : activeTask.priority >= 3
                            ? "#15803D"
                            : "#B91C1C"
                      }}
                    >
                      {activeTask.priority}
                    </span>
                    <h3 className="text-lg font-semibold break-words">
                      {activeTask.title}
                    </h3>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </main>
      </Layout>
    </>
  );
}
