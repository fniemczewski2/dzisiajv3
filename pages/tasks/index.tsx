// pages/tasks/index.tsx

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  List,
  ChevronLeft,
  Calendar,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { format, addDays } from "date-fns";
import TaskList from "@/components/tasks/TaskList";
import { useTasks } from "@/hooks/db/useTasks";
import { getAppDate, getAppDateTime } from "@/lib/dateUtils";
import { AddButton } from "@/components/ui/CommonButtons";
import { SkeletonTaskList } from "@/components/ui/Skeleton";
import SearchBar from "@/components/ui/SearchBar";
import { useQuickAction } from "@/hooks/useQuickAction";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "@/hooks/db/useSettings";
import Seo from "@/components/ui/SEO";
import CategoryFilter from "@/components/tasks/CategoryFilter";
import { useTaskCategories, useCategoryColors } from "@/hooks/useTaskCategories";
import { taskCategoryOptions } from "@/lib/taskCategories";

const TaskForm = dynamic(() => import("@/components/tasks/TaskForm"), {
  ssr: false, 
});

const FILTER_OPTIONS = [
  { value: "all", icon: List, title: "Wszystkie" },
  { value: "yesterday", icon: ChevronLeft, title: "Wczoraj" },
  { value: "today", icon: Calendar, title: "Dzisiaj" },
  { value: "tomorrow", icon: ChevronRight, title: "Jutro" },
  { value: "dayAfterTomorrow", icon: ChevronsRight, title: "Pojutrze" },
] as const;

type DateFilter = (typeof FILTER_OPTIONS)[number]["value"];

export default function TasksPage() {
  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [searchQuery, setSearchQuery] = useState("");
  /** null = wszystkie kategorie. */
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const userCategories = useTaskCategories();
  const categoryColors = useCategoryColors();
  
  const { tasks, loading, fetching, addTask, acceptTask, editTask, deleteTask, setDoneTask, fetchTasks } = useTasks();
  const { user } = useAuth();
  const { settings } = useSettings();

  const userId = user?.id ?? "";
  const userOptions = settings?.users ?? [];

  const { todayDone, todayTotal } = useMemo(() => {
    const today = getAppDate();
    const todayTasks = tasks.filter((t) => t.due_date === today);
    const done = todayTasks.filter((t) => t.status === "done").length;
    return {
      todayDone: done,
      todayTotal: todayTasks.length,
    };
  }, [tasks]);

  const openNew = () => setShowForm(true);
  const closeForm = () => setShowForm(false);

  const filterDate = useMemo(() => {
    const now = getAppDateTime();
    switch (dateFilter) {
      case "yesterday":        return format(addDays(now, -1), "yyyy-MM-dd");
      case "today":            return format(now, "yyyy-MM-dd");
      case "tomorrow":         return format(addDays(now, 1), "yyyy-MM-dd");
      case "dayAfterTomorrow": return format(addDays(now, 2), "yyyy-MM-dd");
      case "all":              return null;
      default:                 return null;
    }
  }, [dateFilter]);

  const filteredTasks = useMemo(() => {
    const allowedStatuses = new Set(["pending", "waiting_for_acceptance"]);
    let result: typeof tasks;

    if (!filterDate) {
      result = tasks;
    } else if (filterDate === format(getAppDateTime(), "yyyy-MM-dd")) {
      result = tasks.filter((t) => (t.due_date === filterDate) || (t.due_date <= filterDate && allowedStatuses.has(t.status)));
    } else {
      result = tasks.filter((t) => t.due_date === filterDate);
    }

    if (categoryFilter) {
      result = result.filter((t) => t.category === categoryFilter);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.description ?? "").toLowerCase().includes(query)
      );
    }
    return result;
  }, [tasks, filterDate, searchQuery, categoryFilter]);

  // Kategorie użytkownika + systemowe + te, które mają istniejące zadania
  // (np. usunięte z listy w ustawieniach), żeby dało się je odfiltrować.
  const filterCategories = useMemo(() => {
    const base = taskCategoryOptions(userCategories);
    const extra = [...new Set(tasks.map((t) => t.category).filter((c): c is string => Boolean(c) && !base.includes(c)))];
    const counts = new Map<string, number>();
    for (const t of tasks) if (t.category) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    // Puste kategorie systemowe tylko zaśmiecają pasek filtra.
    return [...base, ...extra].filter((c) => counts.has(c) || userCategories.includes(c) || c === categoryFilter);
  }, [userCategories, tasks, categoryFilter]);

  useQuickAction({
    onActionAdd: () => setShowForm(true),
  });
  

  return (
    <>
      <Seo
        title="Zadania"
        description="Lista zadań z priorytetami, terminami i godziną wykonania. Zlecaj zadania innym osobom i synchronizuj je z listami w Slacku."
        canonical="https://dzisiaj.fun/tasks"
        keywords="zadania, lista to-do, projekty, priorytety, zarządzanie projektami"
      />
        <div className="flex justify-between items-center mb-6">
          <h1 className="page-title flex items-center gap-3">
            <span>Zadania</span>
            <span className="text-sm font-semibold text-text-secondary tabular-nums">
              <span className="sr-only">Dziś zrobione: </span>{todayDone}/{todayTotal}
            </span>
          </h1>
          {!showForm && <AddButton onClick={openNew} />}
        </div>
        
        <fieldset className="flex items-center justify-between mb-4 card p-1.5 rounded-xl gap-1 max-w-md">
            <legend className="sr-only">Filtruj po dniu</legend>
            {FILTER_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDateFilter(opt.value)}
                  type='button'
                  aria-pressed={dateFilter === opt.value}
                  className={`min-h-12 px-1 sm:px-3 py-1.5 rounded-lg transition-colors flex flex-1 flex-col items-center justify-center gap-1 ${
                    dateFilter === opt.value
                      ? "bg-text text-card"
                      : "bg-transparent text-text-secondary hover:text-text hover:bg-surface"
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
                  <span className="text-xs font-semibold">{opt.title}</span>
                </button>
              );
            })}
        </fieldset>

        <CategoryFilter
          categories={filterCategories}
          colors={categoryColors}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />

        {showForm && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4">
            <TaskForm
              addTask={addTask}
              onTasksChange={() => {
                void fetchTasks();
                closeForm();
              }}
              onCancel={closeForm}
              loading={loading}
            />
          </div>
        )}
          <div className="space-y-6">
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Szukaj w zadaniach..." />
            {fetching ? (
              <SkeletonTaskList count={6} />
            ) : (
              <TaskList
                tasks={filteredTasks}
                acceptTask={acceptTask}
                setDoneTask={setDoneTask}
                editTask={editTask}
                deleteTask={deleteTask}
                onTasksChange={fetchTasks}
                userId={userId}
                userOptions={userOptions}
                loading={loading}
              />
            )}
        </div>
    </>
  );
}