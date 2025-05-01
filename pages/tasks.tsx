// pages/tasks.tsx
import React, { useEffect, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon } from "lucide-react";
import { format } from "date-fns";
import Head from "next/head";
import Layout from "../components/Layout";
import TaskIcons from "../components/TaskIcons";
import WaterTracker from "../components/WaterTracker";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import { useSettings } from "../hooks/useSettings";
import { useTasks } from "../hooks/useTasks";
import { Task } from "../types";

export default function TasksPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email ?? "";

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [todayDone, setTodayDone] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);

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
    const today = format(new Date(), "yyyy-MM-dd");
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

  if (!session || loadingSettings || loadingTasks || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
      </div>
    );
  }

  const openAdd = () => {
    setEditingTask(null);
    setShowForm(true);
  };
  const openEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };
  const closeForm = () => setShowForm(false);

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
        {settings.show_habits && <TaskIcons />}
        {settings.show_water_tracker && <WaterTracker />}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Zadania&nbsp;({todayDone}/{todayTotal})
          </h2>
          {!showForm && (
            <button
              onClick={openAdd}
              className="px-4 py-2 flex items-center bg-primary text-white rounded-xl"
            >
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </button>
          )}
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
          tasks={tasks}
          userEmail={userEmail}
          onTasksChange={fetchTasks}
          onEdit={openEdit}
        />
      </Layout>
    </>
  );
}

TasksPage.auth = true;
