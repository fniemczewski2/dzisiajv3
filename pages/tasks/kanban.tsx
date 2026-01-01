// pages/tasks/kanban.tsx
import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import KanbanBoard from "../../components/tasks/KanbanBoard";
import { useTasks } from "../../hooks/useTasks";
import { useSession } from "@supabase/auth-helpers-react";
import { ChevronLeft } from "lucide-react";
import LoadingState from "../../components/LoadingState";
import { Task } from "../../types";

export default function KanbanPage() {
  const router = useRouter();
  const { tasks, loading, fetchTasks } = useTasks();

  const handleStartTimer = (task: Task) => {
    router.push({
      pathname: "/tasks/pomodoro",
      query: {
        taskId: task.id,
        taskTitle: task.title,
      },
    });
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
        <title>Tablica Kanban - Dzisiaj</title>
        <meta name="description" content="Zarządzaj zadaniami na tablicy Kanban" />
      </Head>

      <Layout>
        <div className="mb-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-xl font-semibold">Tablica Kanban</h2>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : (
          <KanbanBoard
            tasks={tasks}
            onTasksChange={fetchTasks}
            onStartTimer={handleStartTimer}
          />
        )}
      </Layout>
    </>
  );
}

KanbanPage.auth = true;