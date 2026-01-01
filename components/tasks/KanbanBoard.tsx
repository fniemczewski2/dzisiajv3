// components/tasks/KanbanBoard.tsx
"use client";

import React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task } from "../../types";
import { useTasks } from "../../hooks/useTasks";
import { getAppDate } from "../../lib/dateUtils";
import DraggableTask from "../eisenhower/DraggableTask"; // Ten sam co w Eisenhower
import DroppableKanbanColumn from "../kanban/DroppableKanbanColumn";

interface Props {
  tasks: Task[];
  onTasksChange: () => void;
  onStartTimer: (task: Task) => void;
}

type KanbanStatus = "todo" | "in_progress" | "done";

interface KanbanColumn {
  id: KanbanStatus;
  title: string;
}

const columns: KanbanColumn[] = [
  { id: "todo", title: "Do zrobienia" },
  { id: "in_progress", title: "W trakcie" },
  { id: "done", title: "Zrobione" },
];

export default function KanbanBoard({ tasks, onTasksChange, onStartTimer }: Props) {
  const { editTask, deleteTask, setDoneTask, fetchTasks } = useTasks();
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const today = getAppDate();

  // Mapowanie statusów zadań do kolumn Kanban
  const getKanbanStatus = (task: Task): KanbanStatus | null => {
    // Oblicz datę sprzed miesiąca
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const taskDueDate = new Date(task.due_date);
    
    // Jeśli zadanie jest zrobione i starsze niż miesiąc, ukryj je
    if (task.due_date && taskDueDate <= oneMonthAgo && task.status === "done") {
      return null;
    }
    
    // Zrobione zadania (z ostatniego miesiąca)
    if (task.status === "done") return "done";
    
    // W trakcie: wysokie priorytety (1-2) które nie są zrobione
    if (task.priority <= 2 && task.status !== "done") return "in_progress";
    
    // Do zrobienia: pozostałe
    return "todo";
  };

  const groupedTasks: Record<KanbanStatus, Task[]> = {
    todo: tasks.filter((t) => {
      const status = getKanbanStatus(t);
      return status === "todo";
    }),
    in_progress: tasks.filter((t) => {
      const status = getKanbanStatus(t);
      return status === "in_progress";
    }),
    done: tasks.filter((t) => {
      const status = getKanbanStatus(t);
      return status === "done";
    }),
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newColumnId = over.id as KanbanStatus;
    const task = tasks.find((t) => t.id === taskId);

    if (!task) return;

    const currentStatus = getKanbanStatus(task);
    if (currentStatus === newColumnId) return;

    try {
      // Aktualizuj status zadania w zależności od kolumny
      if (newColumnId === "done") {
        await setDoneTask(task.id);
      } else if (newColumnId === "in_progress") {
        // Przenieś do "w trakcie" - ustaw priorytet 2 jeśli jest wyższy
        await editTask({
          ...task,
          priority: task.priority <= 2 ? task.priority : 2,
          status: task.status === "done" ? "pending" : task.status,
        });
      } else if (newColumnId === "todo") {
        // Przenieś do "do zrobienia" - ustaw priorytet 3 jeśli jest niższy
        await editTask({
          ...task,
          priority: task.priority > 2 ? task.priority : 3,
          status: task.status === "done" ? "pending" : task.status,
        });
      }

      await fetchTasks();
      onTasksChange();
    } catch (error) {
      console.error("Błąd podczas przenoszenia zadania:", error);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        {columns.map((column) => (
          <DroppableKanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            count={groupedTasks[column.id].length}
          >
            <SortableContext
              items={groupedTasks[column.id].map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2 list-none">
                {groupedTasks[column.id].map((task) => (
                  <DraggableTask key={task.id} task={task} />
                ))}
              </ul>
            </SortableContext>

            {groupedTasks[column.id].length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Brak zadań</p>
              </div>
            )}
          </DroppableKanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <DraggableTask task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}