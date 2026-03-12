"use client";

import React, { useState, useMemo } from "react";
import {
  List,
  ChevronLeft,
  Calendar,
  ChevronRight,
  ChevronsRight,
  Target,
  ListTodo,
} from "lucide-react";
import { format, addDays } from "date-fns";
import Head from "next/head";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import TaskForm from "../../components/tasks/TaskForm";
import TaskList from "../../components/tasks/TaskList";
import { useTasks } from "../../hooks/useTasks";
import { Task } from "../../types";
import { getAppDate, getAppDateTime } from "../../lib/dateUtils";
import LoadingState from "../../components/LoadingState";
import { AddButton } from "../../components/CommonButtons";
import { useQuickAction } from "../../hooks/useQuickAction";
import Reminders from "../../components/tasks/Reminders";

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
    const allowedStatuses = ["pending", "waiting_for_acceptance"];
    if (!filterDate) return tasks;
    if (filterDate == "today") {
      return tasks.filter(
        (t) => t.due_date <= filterDate && allowedStatuses.includes(t.status)
      );
    }
    else {
       return tasks.filter((t) => t.due_date === filterDate);
    }
  }, [tasks, filterDate]);

  useQuickAction({
    onActionAdd: () => setShowForm(true),
  });

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
        {/* NAGŁÓWEK */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text flex items-center gap-3">
            Zadania
            <span className="text-sm font-bold bg-blue-100 dark:bg-blue-900/70 border border-blue-100 dark:border-blue-900/70 px-2.5 py-1 rounded-lg">
              {todayDone}/{todayTotal}
            </span>
          </h2>
          {!showForm && <AddButton onClick={openNew} type="button" />}
        </div>

        {/* PASEK FILTRÓW I TRYBU SKUPIENIA */}
        <div className="flex items-center justify-between mb-6 bg-card border border-gray-200 dark:border-gray-800 p-2 rounded-2xl shadow-sm w-fit gap-2">
            {FILTER_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDateFilter(opt.value)}
                  title={opt.title}
                  className={`p-2.5 sm:px-3 sm:py-2 rounded-xl transition-all duration-200 flex items-center justify-center ${
                    dateFilter === opt.value
                      ? "bg-primary text-white shadow-md scale-105"
                      : "bg-transparent text-textMuted hover:text-text hover:bg-surface"
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              );
            })}
        </div>

        {loadingTasks && <LoadingState />}

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
          <div className="space-y-6">
            <TaskList tasks={filteredTasks} onTasksChange={fetchTasks} />
            <Reminders onTasksChange={fetchTasks} />
          </div>
      </Layout>
    </>
  );
}

TasksPage.auth = true;