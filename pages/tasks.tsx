// pages/tasks.tsx
import React, { useEffect, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import {
  Loader2,
  PlusCircleIcon,
  List,
  ChevronLeft,
  Calendar,
  ChevronRight,
  ChevronsRight,
  Timer,
  Brain,
  Logs,
} from "lucide-react";
import { format, addDays } from "date-fns";
import Head from "next/head";
import Layout from "../components/Layout";
import TaskIcons from "../components/tasks/TaskIcons";
import WaterTracker from "../components/tasks/WaterTracker";
import TaskForm from "../components/tasks/TaskForm";
import TaskList from "../components/tasks/TaskList";
import { useSettings } from "../hooks/useSettings";
import { useTasks } from "../hooks/useTasks";
import { Task } from "../types";
import Reminders from "../components/tasks/Reminders";
import { useRouter } from "next/router";
import { getAppDateTime } from "../lib/dateUtils";

const FILTER_OPTIONS = [
  { value: "all", icon: List, title: "Wszystkie" },
  { value: "yesterday", icon: ChevronLeft, title: "Wczoraj" },
  { value: "today", icon: Calendar, title: "Dzisiaj" },
  { value: "tomorrow", icon: ChevronRight, title: "Jutro" },
  { value: "dayAfterTomorrow", icon: ChevronsRight, title: "Pojutrze" },
] as const;

type DateFilter = (typeof FILTER_OPTIONS)[number]["value"];

export default function TasksPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email ?? "";
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [todayDone, setTodayDone] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

  const { settings, loading: loadingSettings } = useSettings(userEmail);
  const {
    tasks,
    loading: loadingTasks,
    fetchTasks,
  } = useTasks(userEmail, settings);

  // Fetch tasks list whenever settings change
  useEffect(() => {
    if (settings) fetchTasks();
  }, [settings, fetchTasks]);

  // Compute today’s stats
  useEffect(() => {
    if (!session) return;
    const today = new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .format(new Date())
    .replace(/\./g, "-") 
    .replace(/\s/g, ""); 
    (async () => {
      const [{ count: totalCount }, { count: doneCount }] = await Promise.all([
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_name", userEmail)
          .eq("due_date", today),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_name", userEmail)
          .eq("due_date", today)
          .eq("status", "done"),
      ]);
      setTodayTotal(totalCount || 0);
      setTodayDone(doneCount || 0);
    })();
  }, [session, supabase, userEmail, tasks]);
  
  const openAdd = () => {
    setEditingTask(null);
    setShowForm(true);
  };
  const openEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };
  const closeForm = () => setShowForm(false);

  // Calculate filter date string
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
  const filteredTasks = filterDate
    ? tasks.filter((t) => t.due_date === filterDate)
    : tasks;

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
              onClick={() => router.push("/tasks/pomodoro")}
              title="Pomodoro"
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Timer className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push("/tasks/eisenhower")}
              title="Eisenhower Matrix"
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Brain className="w-5 h-5" />
            </button>
            </div>
            </h2>
          
          {!showForm && (
            <button
              onClick={openAdd}
              className="px-3 py-1.5 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
            >
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        {(!session || loadingSettings || loadingTasks || !settings) && (
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
          </div>
        )}
        <div className="flex space-x-2 mb-4">
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

        {showForm && (
          <div className="mb-6">
            <TaskForm
              userEmail={userEmail}
              initialTask={editingTask}
              onTasksChange={() => {
                fetchTasks();
                closeForm();
              }}
              onCancel={closeForm}
            />
          </div>
        )}

        <TaskList
          tasks={filteredTasks}
          userEmail={userEmail}
          onTasksChange={fetchTasks}
          onEdit={openEdit}
        />
      </Layout>
    </>
  );
}

TasksPage.auth = true;
