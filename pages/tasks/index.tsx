"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  List,
  ChevronLeft,
  Calendar,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { format, addDays } from "date-fns";
import Head from "next/head";
import Layout from "../../components/Layout";
import TaskForm from "../../components/tasks/TaskForm";
import TaskList from "../../components/tasks/TaskList";
import { useTasks } from "../../hooks/useTasks";
import { getAppDate, getAppDateTime } from "../../lib/dateUtils";
import { AddButton } from "../../components/CommonButtons";
import { useQuickAction } from "../../hooks/useQuickAction";
import Reminders from "../../components/tasks/Reminders";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";
import { useSettings } from "../../hooks/useSettings";

const FILTER_OPTIONS = [
  { value: "all", icon: List, title: "Wszystkie" },
  { value: "yesterday", icon: ChevronLeft, title: "Wczoraj" },
  { value: "today", icon: Calendar, title: "Dzisiaj" },
  { value: "tomorrow", icon: ChevronRight, title: "Jutro" },
  { value: "dayAfterTomorrow", icon: ChevronsRight, title: "Pojutrze" },
] as const;

type DateFilter = (typeof FILTER_OPTIONS)[number]["value"];

export default function TasksPage({isMain}: {isMain?: boolean}) {
  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  
  const { tasks, loading, fetching, addTask, acceptTask, editTask, deleteTask, setDoneTask, fetchTasks } = useTasks();
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings } = useSettings();
  
  // BEZPIECZNE POBRANIE ID (ochrona przed błędem reading 'id' of null)
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
      default:                 return null;
    }
  }, [dateFilter]);
  
  // POPRAWIONE useMemo: Zwraca przefiltrowaną listę zamiast hooków!
  const filteredTasks = useMemo(() => {
    if (!filterDate) return tasks;
    
    const allowedStatuses = ["pending", "waiting_for_acceptance"];
    if (filterDate === format(getAppDateTime(), "yyyy-MM-dd")) { // Jeśli dzisiaj
      return tasks.filter(
        (t) => t.due_date <= filterDate && allowedStatuses.includes(t.status)
      );
    } else {
       return tasks.filter((t) => t.due_date === filterDate);
    }
  }, [tasks, filterDate]);

  // Hook wyciągnięty na zewnątrz, zgodnie z zasadami Reacta
  useQuickAction({
    onActionAdd: () => setShowForm(true),
  });
  
  useEffect(() => {
      let toastId: string | undefined;
      
      if (fetching && toast.loading) {
        toastId = toast.loading("Ładowanie zadań...");
      }
  
      return () => {
        if (toastId && toast.dismiss) {
          toast.dismiss(toastId);
        }
      };
  }, [fetching, toast]);

  return (
    <>
      <Head>
        <title>Zadania – Dzisiaj</title>
        <meta
          name="description"
          content="Zarządzaj swoimi zadaniami: dodawaj, edytuj i usuwaj w aplikacji Dzisiaj."
        />
        <link rel="canonical" href="https://dzisiajv3.vercel.app/tasks" />
      </Head>

      <Layout>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text flex items-center gap-3">
            Zadania
            <span className="text-sm font-bold bg-blue-100 dark:bg-blue-900/70 border border-blue-100 dark:border-blue-900/70 px-2.5 py-1 rounded-lg">
              {todayDone}/{todayTotal}
            </span>
          </h2>
          {!showForm && <AddButton onClick={openNew} type="button" />}
        </div>
        
        <div className="flex items-center justify-between mb-6 card p-2 rounded-xl shadow-sm gap-2 max-w-md">
            {FILTER_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDateFilter(opt.value)}
                  title={opt.title}
                  className={`p-1 sm:px-3 sm:py-2 rounded-lg transition-all flex flex-1 flex-col items-center justify-center gap-1 ${
                    dateFilter === opt.value
                      ? "bg-surfaceHover text-text shadow-md scale-105"
                      : "bg-transparent text-textMuted hover:text-text hover:bg-surface"
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="text-[8px] sm:text-[10px] font-bold uppercase">{opt.title}</span>
                </button>
              );
            })}
        </div>

        {showForm && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4">
            <TaskForm
              addTask={addTask}
              onTasksChange={() => {
                fetchTasks();
                closeForm();
              }}
              onCancel={closeForm}
              loading={loading}
            />
          </div>
        )}
          <div className="space-y-6">
            <TaskList   
              tasks={filteredTasks} 
              acceptTask={acceptTask}
              setDoneTask={setDoneTask}
              editTask={editTask}
              deleteTask={deleteTask}
              onTasksChange={fetchTasks}
              userId={userId} 
              userOptions={userOptions}
            />
            <Reminders onTasksChange={fetchTasks} addTask={addTask} />
          </div>
      </Layout>
    </>
  );
}