// pages/settings.tsx
"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const session = useSession();
  const supabase = useSupabaseClient();

  // Local settings state with defaults
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    sort_order: "priority",
    show_completed: true,
    show_habits: true,
    show_water_tracker: true,
    notification_enabled: true,
    notification_times: "06:00,12:00,18:00",
  });

  // Fetch current user session & settings
  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      const userEmail = session.user?.email;
      if (!userEmail) return;

      const { data, error } = await supabase
        .from("settings")
        .select(
          "sort_order,show_completed,show_habits,show_water_tracker,notification_enabled,notification_times"
        )
        .eq("user_name", userEmail)
        .maybeSingle();

      if (!error && data) {
        setSettings({
          sort_order: data.sort_order,
          show_completed: data.show_completed,
          show_habits: data.show_habits,
          show_water_tracker: data.show_water_tracker,
          notification_enabled: data.notification_enabled,
          notification_times: data.notification_times || "",
        });
      }
      setLoading(false);
    })();
  }, [session, supabase]);

  // Save handler
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    const userEmail = session.user?.email;
    const payload = {
      user_name: userEmail,
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

  // Loading
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
          {/** repeat for other app settings **/}
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

          <h3 className="text-lg font-semibold">Powiadomienia</h3>
          <div className="flex items-center">
            <input
              id="notification_enabled"
              type="checkbox"
              checked={settings.notification_enabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                setSettings({ ...settings, notification_enabled: enabled });
                if (
                  enabled &&
                  typeof window !== "undefined" &&
                  "Notification" in window
                ) {
                  Notification.requestPermission();
                }
              }}
              className="h-4 w-4 text-primary rounded"
            />
            <label
              htmlFor="notification_enabled"
              className="ml-2 text-sm text-gray-700"
            >
              Włącz powiadomienia
            </label>
          </div>
          {settings.notification_enabled && (
            <div>
              <label
                htmlFor="notification_times"
                className="block text-sm font-medium text-gray-700"
              >
                Godziny powiadomień (HH:mm,&nbsp;rozdzielone&nbsp;przecinkami)
              </label>
              <input
                id="notification_times"
                type="text"
                value={settings.notification_times}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    notification_times: e.target.value,
                  })
                }
                className="mt-1 w-full p-2 border rounded max-w-xs"
                placeholder="06:00,12:00,18:00"
              />
            </div>
          )}

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
            <strong>Email:</strong> {session.user?.email}
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
