// pages/tasks.tsx 
import React, { useState, useMemo } from "react";
import {
  PlusCircleIcon,
  List,
  ChevronLeft,
  Calendar,
  ChevronRight,
  ChevronsRight,
  Timer,
  Brain,
  Target,
  ListTodo,
  Table2,
} from "lucide-react";
import { format, addDays } from "date-fns";
import Head from "next/head";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import TaskIcons from "../../components/tasks/TaskIcons";
import WaterTracker from "../../components/tasks/WaterTracker";
import TaskForm from "../../components/tasks/TaskForm";
import TaskList from "../../components/tasks/TaskList";
import FocusMode from "../../components/tasks/FocusMode";
import { useSettings } from "../../hooks/useSettings";
import { useTasks } from "../../hooks/useTasks";
import { Task } from "../../types";
import Reminders from "../../components/tasks/Reminders";
import { getAppDate, getAppDateTime } from "../../lib/dateUtils";
import LoadingState from "../../components/LoadingState";
import { AddButton } from "../../components/CommonButtons";
import { useTaskNotifications } from "../../lib/notificationHelpers";

const FILTER_OPTIONS = [
  { value: "all", icon: List, title: "Wszystkie" },
  { value: "yesterday", icon: ChevronLeft, title: "Wczoraj" },
  { value: "today", icon: Calendar, title: "Dzisiaj" },
  { value: "tomorrow", icon: ChevronRight, title: "Jutro" },
  { value: "dayAfterTomorrow", icon: ChevronsRight, title: "Pojutrze" },
] as const;

type DateFilter = (typeof FILTER_OPTIONS)[number]["value"];

export default function TasksPage() {
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [focusModeEnabled, setFocusModeEnabled] = useState(false); 

  const { settings, loading: loadingSettings } = useSettings();
  const { tasks, loading: loadingTasks, fetchTasks } = useTasks();

  const { todayDone, todayTotal } = useMemo(() => {
    const today = getAppDate();
    const todayTasks = tasks.filter((t) => t.due_date === today);
    const done = todayTasks.filter((t) => t.status === "done").length;
    return {
      todayDone: done,
      todayTotal: todayTasks.length,
    };
  }, [tasks]);

  const openNew = () => {
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  const handleStartTimer = (task: Task) => {
    sessionStorage.setItem('currentTask', JSON.stringify(task));
    router.push("/tasks/pomodoro");
  };

  const getFilterDate = (): string | null => {
    const now = getAppDateTime();
    switch (dateFilter) {
      case "yesterday":
        return format(addDays(now, -1), "yyyy-MM-dd");
      case "today":
        return format(now, "yyyy-MM-dd");
      case "tomorrow":
        return format(addDays(now, 1), "yyyy-MM-dd");
      case "dayAfterTomorrow":
        return format(addDays(now, 2), "yyyy-MM-dd");
      default:
        return null;
    }
  };
  
  const filterDate = getFilterDate();
  const filteredTasks = useMemo(() => {
    return filterDate ? tasks.filter((t) => t.due_date === filterDate) : tasks;
  }, [tasks, filterDate]);

  useTaskNotifications(tasks);

  return (
    <>
      <Head>
        <title>Zadania – Dzisiaj</title>
        <meta
          name="description"
          content="Zarządzaj swoimi zadaniami: dodawaj, edytuj i usuwaj w aplikacji Dzisiaj."
        />
        <link rel="canonical" href="https://dzisiajv3.vercel.app/tasks" />
        <meta property="og:title" content="Zadania – Dzisiaj" />
        <meta
          property="og:description"
          content="Zarządzaj swoimi zadaniami: dodawaj, edytuj i usuwaj w aplikacji Dzisiaj."
        />
      </Head>

      <Layout>
        {settings?.show_habits && <TaskIcons />}
        {settings?.show_water_tracker && <WaterTracker />}
        {settings?.show_notifications && <Reminders />}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex flex-nowrap justify-between gap-2">
            Zadania&nbsp;({todayDone}/{todayTotal})

            <div className="flex justify-between items-center gap-2">
              <button
                onClick={() => router.push("/tasks/eisenhower")}
                title="Eisenhower Matrix"
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Brain className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push("/tasks/kanban")}
                title="Kanban Board"
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Table2 className="w-5 h-5" />
              </button>
            </div>
          </h2>

          {!showForm && <AddButton onClick={openNew} type="button" />}
        </div>

        {(loadingSettings || loadingTasks || !settings) && <LoadingState />}

        {/* Focus Mode Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2">
            {FILTER_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDateFilter(opt.value)}
                  title={opt.title}
                  className={`p-1.5 rounded-xl border shadow transition-colors flex items-center justify-center ${
                    dateFilter === opt.value
                      ? "bg-primary text-white border-primary"
                      : "bg-gray-100 text-gray-700 border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setFocusModeEnabled(!focusModeEnabled)}
            className={`px-3 py-1.5 flex items-center rounded-lg shadow ${
              focusModeEnabled
                ? "bg-primary text-white border-primary hover:bg-secondary"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
            title={focusModeEnabled ? "Wyłącz tryb skupienia" : "Włącz tryb skupienia"}
          >
            
            <span className="hidden sm:inline">
              {focusModeEnabled ? "Focus" : "Wszystkie"}&nbsp;&nbsp;
            </span>
            {focusModeEnabled ? <Target className="w-5 h-5" /> : <ListTodo className="w-5 h-5" />}
          </button>
        </div>

        {showForm && (
          <div className="mb-6">
            <TaskForm
              onTasksChange={() => {
                fetchTasks();
                closeForm();
              }}
              onCancel={closeForm}
            />
          </div>
        )}

        {focusModeEnabled && dateFilter === "today" ? (
          <FocusMode
            tasks={filteredTasks}
            onTasksChange={fetchTasks}
            onStartTimer={handleStartTimer}
          />
        ) : (
          <TaskList tasks={filteredTasks} onTasksChange={fetchTasks} />
        )}
      </Layout>
    </>
  );
}

TasksPage.auth = false;