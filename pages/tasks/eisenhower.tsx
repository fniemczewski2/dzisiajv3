"use client";

import React, { useEffect, useState } from "react";
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
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Droppable from "../../components/eisenhower/Droppable";
import DraggableTask from "../../components/eisenhower/DraggableTask";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/router";
import { useTasks } from "../../hooks/useTasks";

const CATEGORIES = [
  "Pilne i ważne",
  "Niepilne, ale ważne",
  "Pilne, ale nieważne",
  "Niepilne i nieważne",
] as const;

interface Props {
  onStartTimer?: (task: Task) => void;
}

type Category = (typeof CATEGORIES)[number];
type BoardState = Record<Category, Task[]>;

export default function EisenhowerPage({ onStartTimer }: Props) {
  const router = useRouter();
  
  const { tasks, fetchTasks, editTask } = useTasks();

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


  // --- AUTOMATIC FETCH ON PAGE LOAD ---
  useEffect(() => {
    fetchTasks();
  }, []);

  // Derive board state from tasks
  const board: BoardState = {
    "Pilne i ważne": [],
    "Niepilne, ale ważne": [],
    "Pilne, ale nieważne": [],
    "Niepilne i nieważne": [],
  };

  tasks
    .filter((task) => ["pending", "accepted"].includes(task.status) && task.status !== "done")
    .forEach((task) => {
      let key: Category;
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
      if (board[key]) {
        board[key].push(task);
      }
    });

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    let droppedCategory: string;
    if (over.data?.current?.sortable?.containerId) {
      droppedCategory = over.data.current.sortable.containerId;
    } else {
      droppedCategory = over.id as string;
    }

    if (!CATEGORIES.includes(droppedCategory as Category)) return;

    const validCategory = droppedCategory as Category;
    
    const newPriority =
      validCategory === "Pilne i ważne"
        ? 1
        : validCategory === "Niepilne, ale ważne"
        ? 2
        : validCategory === "Pilne, ale nieważne"
        ? 3
        : 4;

    if (task.priority === newPriority) return;


    try {
      await editTask({
        ...task,
        priority: newPriority,
      });
      await fetchTasks();
    } catch (error) {
      console.error("Failed to update task:", error);
      await fetchTasks();
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
              onClick={fetchTasks}
              disabled={isRefreshing}
              className="p-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow transition-colors disabled:opacity-50"
              title="Odśwież zadania"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
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
                      <DraggableTask
                        key={task.id}
                        task={task}
                        onTasksChange={fetchTasks}
                      />
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
                            : "#B91C1C",
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
EisenhowerPage.auth = true;