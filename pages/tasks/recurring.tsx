// pages/tasks/recurring.tsx
//
// Zadania cykliczne w jednym miejscu: lista reguł z opisem powtarzania, edycja (także reguły) i usuwanie.
// Edycję i usuwanie wykonuje useTasks (te same zasady co na liście zadań); lista odświeża się po zmianie.

import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { ListTodo } from "lucide-react";
import Seo from "@/components/ui/SEO";
import SearchBar from "@/components/ui/SearchBar";
import NoResultsState from "@/components/ui/NoResultsState";
import { SkeletonTaskList } from "@/components/ui/Skeleton";
import { IconActionButton } from "@/components/ui/CommonButtons";
import TaskItem from "@/components/tasks/TaskItem";
import { useTasks } from "@/hooks/db/useTasks";
import { useSettings } from "@/hooks/db/useSettings";
import { RECURRING_TASKS_KEY, useRecurringTasks } from "@/hooks/db/useRecurringTasks";
import { useAuth } from "@/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import type { Task } from "@/types/tasks";

export default function RecurringTasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSettings();
  const queryClient = useQueryClient();
  const { acceptTask, editTask, deleteTask, setDoneTask, loading } = useTasks();
  const recurring = useRecurringTasks();
  const [query, setQuery] = useState("");

  const tasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = recurring.data ?? [];
    return q ? list.filter((t) => `${t.title}\n${t.description ?? ""}`.toLowerCase().includes(q)) : list;
  }, [recurring.data, query]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: [RECURRING_TASKS_KEY] });

  const edit = async (task: Task & { shared_with_email?: string }) => {
    await editTask(task);
    await refresh();
  };

  const remove = async (id: string) => {
    queryClient.setQueriesData<Task[]>({ queryKey: [RECURRING_TASKS_KEY] }, (list) => list?.filter((t) => t.id !== id));
    await deleteTask(id);
  };

  return (
    <>
      <Seo
        title="Zadania cykliczne"
        description="Lista zadań cyklicznych z edycją reguł powtarzania."
        canonical="https://dzisiaj.fun/tasks/recurring"
      />
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between gap-4">
          <h1 className="page-title">Zadania cykliczne</h1>
          <IconActionButton Icon={ListTodo} title="Wszystkie zadania" onClick={() => void router.push("/tasks")} />
        </div>

        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Szukaj zadań cyklicznych…"
          resultsCount={query.trim() ? tasks.length : undefined}
          resultsLabel="zadań"
        />

        {recurring.isLoading && <SkeletonTaskList />}
        {!recurring.isLoading && tasks.length === 0 && (
          <NoResultsState
            text="zadań cyklicznych"
            isSearch={query.trim().length > 0}
            hint="Dodaj zadanie i ustaw w formularzu powtarzanie."
          />
        )}
        {tasks.length > 0 && (
          <ul className="space-y-3" aria-label="Zadania cykliczne">
            {tasks.map((task) => (
              <li key={task.id}>
                <TaskItem
                  task={task}
                  acceptTask={acceptTask}
                  setDoneTask={setDoneTask}
                  editTask={edit}
                  deleteTask={remove}
                  onTasksChange={() => void refresh()}
                  userId={user?.id ?? ""}
                  userOptions={settings?.users ?? []}
                  loading={loading}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
