// pages/settings.tsx
"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const session = useSession();
  const supabase = useSupabaseClient();

  // Local settings state with defaults
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<{
    sort_order: string;
    show_completed: boolean;
    show_habits: boolean;
    show_water_tracker: boolean;
    show_budget_items: boolean;
    users: string[];
  }>({
    sort_order: "priority",
    show_completed: true,
    show_habits: true,
    show_water_tracker: true,
    show_budget_items: false,
    users: [] as string[], // up to 10 friends
  });

  // Fetch settings
  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      const email = session.user.email;
      const { data, error } = await supabase
        .from("settings")
        .select(
          "sort_order,show_completed,show_habits,show_water_tracker,show_budget_items,users"
        )
        .eq("user_name", email)
        .maybeSingle();
      if (!error && data) {
        setSettings({
          sort_order: data.sort_order,
          show_completed: data.show_completed,
          show_habits: data.show_habits,
          show_water_tracker: data.show_water_tracker,
          show_budget_items: data.show_budget_items,
          users: data.users || [],
        });
      }
      setLoading(false);
    })();
  }, [session, supabase]);

  const addUser = () => {
    if (settings.users.length < 10) {
      setSettings((s) => ({ ...s, users: [...s.users, ""] }));
    }
  };
  const removeUser = (idx: number) => {
    setSettings((s) => ({
      ...s,
      users: s.users.filter((_, i) => i !== idx),
    }));
  };
  const updateUser = (idx: number, value: string) => {
    setSettings((s) => {
      const users = [...s.users];
      users[idx] = value;
      return { ...s, users };
    });
  };

  // Save handler
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    const email = session.user.email;
    const payload = {
      user_name: email,
      ...settings,
    };
    const { error } = await supabase
      .from("settings")
      .upsert(payload, { onConflict: "user_name" });
    if (error) console.error(error.message);
    setSaving(false);
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Loading state
  if (!session || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Ustawienia – Dzisiaj v3</title>
        <meta name="description" content="Zmień swoje ustawienia aplikacji" />
      </Head>
      <Layout>
        <h2 className="text-2xl font-semibold mb-6">Ustawienia</h2>
        <form
          onSubmit={handleSave}
          className="mb-6 bg-card p-6 rounded-xl shadow space-y-6"
        >
          <h3 className="text-lg font-semibold">Aplikacja</h3>
          <div>
            <label
              htmlFor="sort_order"
              className="block text-sm font-medium text-gray-700"
            >
              Kolejność sortowania
            </label>
            <select
              id="sort_order"
              value={settings.sort_order}
              onChange={(e) =>
                setSettings({ ...settings, sort_order: e.target.value })
              }
              className="mt-1 w-full p-2 border rounded max-w-xs"
            >
              <option value="priority">Priorytet</option>
              <option value="due_date">Data wykonania</option>
              <option value="alphabetical">Alfabetycznie A→Z</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              id="show_completed"
              type="checkbox"
              checked={settings.show_completed}
              onChange={(e) =>
                setSettings({ ...settings, show_completed: e.target.checked })
              }
              className="h-4 w-4 text-primary border-gray-300 rounded"
            />
            <label
              htmlFor="show_completed"
              className="ml-2 text-sm text-gray-700"
            >
              Pokaż wykonane zadania
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="show_habits"
              type="checkbox"
              checked={settings.show_habits}
              onChange={(e) =>
                setSettings({ ...settings, show_habits: e.target.checked })
              }
              className="h-4 w-4 text-primary border-gray-300 rounded"
            />
            <label htmlFor="show_habits" className="ml-2 text-sm text-gray-700">
              Pokaż sekcję nawyków
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="show_water_tracker"
              type="checkbox"
              checked={settings.show_water_tracker}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  show_water_tracker: e.target.checked,
                })
              }
              className="h-4 w-4 text-primary border-gray-300 rounded"
            />
            <label
              htmlFor="show_water_tracker"
              className="ml-2 text-sm text-gray-700"
            >
              Pokaż tracker wody
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="show_budget_items"
              type="checkbox"
              checked={settings.show_budget_items}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  show_budget_items: e.target.checked,
                })
              }
              className="h-4 w-4 text-primary border-gray-300 rounded"
            />
            <label
              htmlFor="show_budget_items"
              className="ml-2 text-sm text-gray-700"
            >
              Pokaż pozycje z budżetu
            </label>
          </div>
          <div className="space-y-2">
            {settings.users.map((u: string, idx: number) => (
              <div key={idx} className="flex items-center space-x-2">
                <input
                  type="email"
                  value={u}
                  placeholder="Email znajomego"
                  onChange={(e) => updateUser(idx, e.target.value)}
                  className="flex-1 p-2 border rounded"
                />
                <button
                  type="button"
                  onClick={() => removeUser(idx)}
                  className="p-2 bg-red-100 rounded-xl text-red-500 hover:bg-red-200"
                  title="usuń"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {settings.users.length < 10 && (
              <button
                type="button"
                onClick={addUser}
                className="flex items-center space-x-1 text-primary"
              >
                <PlusCircleIcon className="w-5 h-5" />
                <span>Dodaj znajomego</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-xl disabled:opacity-50"
          >
            {saving ? "Zapisywanie…" : "Zapisz ustawienia"}
          </button>
        </form>

        <div className="bg-card p-6 rounded-xl shadow space-y-4">
          <h3 className="text-xl font-semibold">Użytkownik</h3>
          <p>
            <strong>Email:</strong> {session.user.email}
          </p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500 text-white rounded-xl"
          >
            Wyloguj się
          </button>
        </div>
      </Layout>
    </>
  );
}

SettingsPage.auth = true;
