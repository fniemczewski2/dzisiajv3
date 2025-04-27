// pages/tasks.tsx

import { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabaseClient";
import { Task } from "../types";
import TaskIcons from "../components/TaskIcons";
import WaterTracker from "../components/WaterTracker";
import { Edit2, Trash2, Check, PlusCircleIcon } from "lucide-react";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<Omit<Task, "id">>({
    title: "",
    for_user: "me",
    category: "other",
    priority: 5,
    description: "",
    due_date: "",
    deadline_date: "",
    status: "pending", // new field
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setTasks(data as Task[]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // determine initial status
    const nextStatus =
      form.for_user !== "me" ? "waiting_for_acceptance" : "pending";

    if (editingId) {
      await supabase
        .from("tasks")
        .update({ ...form, status: form.status }) // preserve existing status on edit
        .eq("id", editingId);
      setEditingId(null);
    } else {
      await supabase.from("tasks").insert({ ...form, status: nextStatus });
    }

    // reset
    setForm({
      title: "",
      for_user: "me",
      category: "other",
      priority: 5,
      description: "",
      due_date: "",
      deadline_date: "",
      status: "pending",
    });
    setShowForm(false);
    fetchTasks();
  }

  function openEditForm(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      for_user: task.for_user,
      category: task.category,
      priority: task.priority,
      description: task.description,
      due_date: task.due_date,
      deadline_date: task.deadline_date,
      status: task.status, // load existing status
    });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    fetchTasks();
  }

  async function acceptTask(id: string) {
    await supabase.from("tasks").update({ status: "accepted" }).eq("id", id);
    fetchTasks();
  }

  async function markDone(id: string) {
    await supabase.from("tasks").update({ status: "done" }).eq("id", id);
    fetchTasks();
  }

  return (
    <>
      <Head>
        <title>Tasks – Dzisiaj v3</title>
        <meta
          name="description"
          content="Zarządzaj swoimi zadaniami: dodawaj, edytuj, usuwaj."
        />
      </Head>

      <Layout>
        <TaskIcons />
        <WaterTracker />
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Zadania</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 flex wrap-nowrap bg-primary text-white rounded"
            >
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className=" w-4 h-4 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-card p-4 rounded-xl shadow space-y-2 mb-6"
          >
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Tytuł
              </label>
              <input
                id="title"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full p-2 border rounded"
                required
              />
            </div>

            {/* For User */}
            <div>
              <label
                htmlFor="for_user"
                className="block text-sm font-medium text-gray-700"
              >
                Dla
              </label>
              <select
                id="for_user"
                value={form.for_user}
                onChange={(e) => setForm({ ...form, for_user: e.target.value })}
                className="mt-1 w-full p-2 border rounded"
              >
                <option value="me">mnie</option>
                <option value="f.niemczewski2@gmail.com">Franka</option>
                {/* add more users as needed */}
              </select>
            </div>

            {/* Category */}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700"
                >
                  Kategoria
                </label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="mt-1 w-full p-2 border rounded"
                >
                  {[
                    "education",
                    "work",
                    "personal",
                    "activism",
                    "friends",
                    "shopping",
                    "traveling",
                    "delivery",
                    "holidays",
                    "other",
                  ].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="priority"
                  className="block text-sm font-medium text-gray-700"
                >
                  Priorytet
                </label>
                <input
                  id="priority"
                  type="number"
                  min={1}
                  max={10}
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: parseInt(e.target.value, 10) })
                  }
                  className="mt-1 w-full p-2 border rounded"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="due_date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Due date
                </label>
                <input
                  id="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm({ ...form, due_date: e.target.value })
                  }
                  className="mt-1 w-full p-2 border rounded"
                />
              </div>
              <div>
                <label
                  htmlFor="deadline_date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Deadline date
                </label>
                <input
                  id="deadline_date"
                  type="date"
                  value={form.deadline_date}
                  onChange={(e) =>
                    setForm({ ...form, deadline_date: e.target.value })
                  }
                  className="mt-1 w-full p-2 border rounded"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Opis
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1 w-full p-2 border rounded"
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 flex wrap-nowrap bg-primary text-white rounded"
              >
                {editingId ? "Zapisz" : "Dodaj"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm({
                    title: "",
                    for_user: "me",
                    category: "other",
                    priority: 5,
                    description: "",
                    due_date: "",
                    deadline_date: "",
                    status: "pending",
                  });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded"
              >
                Anuluj
              </button>
            </div>
          </form>
        )}

        <ul className="space-y-4">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="p-4 max-w-[400px] sm:max-w-[480px] bg-card rounded-xl shadow flex justify-between items-center"
            >
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-3">
                  {task.priority} | {task.title}
                </h3>
                <div className="grid grid-cols-2">
                  <div className="flex flex-col align-middle">
                    <p className="text-xs sm:text-s text-gray-700 m-1">
                      {task.due_date} | {task.deadline_date}
                    </p>
                    <p className="text-sm text-gray-600 ml-1 mb-1">
                      {task.category}
                    </p>
                  </div>
                  <div>
                    {task.for_user !== "me" &&
                    task.status === "waiting_for_acceptance" ? (
                      <div className="flex space-x-2 flex-1">
                        <button
                          onClick={() => acceptTask(task.id)}
                          className="pflex flex-col flex-1 m-1 p-1 sm:p-2 min-w-[42px] border rounded items-center text-green-600 hover:text-green-800 transition-colors"
                        >
                          <Check className=" w-4 h-4" />
                          <span className="text-[8px] sm:text-[11px]">
                            Akceptuj
                          </span>
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="flex flex-col flex-1 m-1 p-1 sm:p-2 min-w-[42px] border rounded items-center text-green-600 hover:text-green-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 sm:w-6 sm:h-6" />
                          <span className="text-[8px] sm:text-[11px]">
                            Usuń
                          </span>
                        </button>
                      </div>
                    ) : (
                      (task.for_user === "me" ||
                        task.status === "accepted") && (
                        <div className="flex justify-end flex-1">
                          <button
                            onClick={() => markDone(task.id)}
                            className="flex flex-col flex-1 m-1 p-1 sm:p-2 min-w-[42px] border rounded items-center text-green-600 hover:text-green-800 transition-colors"
                          >
                            <Check className="w-4 h-4 sm:w-6 sm:h-6" />
                            <span className="text-[8px] sm:text-[11px]">
                              Zrobione
                            </span>
                          </button>
                          <button
                            onClick={() => openEditForm(task)}
                            className="flex flex-col flex-1 m-1 p-1 sm:p-2 min-w-[42px] border rounded items-center text-primary hover:text-secondary transition-colors"
                          >
                            <Edit2 className="w-4 h-4 sm:w-6 sm:h-6" />
                            <span className="text-[8px] sm:text-[11px]">
                              Edytuj
                            </span>
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="flex flex-col flex-1 m-1 p-1 sm:p-2 min-w-[42px] border rounded items-center text-red-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className=" w-4 h-4 sm:w-6 sm:h-6" />
                            <span className="text-[8px] sm:text-[11px]">
                              Usuń
                            </span>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
                <p className="mt-2">{task.description}</p>
              </div>
              {/* Conditional buttons */}
            </li>
          ))}
        </ul>
      </Layout>
    </>
  );
}
