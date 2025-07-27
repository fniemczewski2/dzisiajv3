// pages/settings.tsx
"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2, PlusCircleIcon, Save, Trash2 } from "lucide-react";
import InstallButton from "../components/InstallButton";

export default function SettingsPage() {
  const session = useSession();
  const supabase = useSupabaseClient();

  // Local settings state with defaults
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [settings, setSettings] = useState<{
    sort_order: string;
    show_completed: boolean;
    show_habits: boolean;
    show_water_tracker: boolean;
    show_budget_items: boolean;
    show_month_view: boolean;
    show_notifications: boolean;
    users: string[];
  }>({
    sort_order: "priority",
    show_completed: true,
    show_habits: true,
    show_water_tracker: true,
    show_budget_items: true,
    show_month_view: true,
    show_notifications: true,
    users: [] as string[], // up to 10 friends
  });

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus(
        "Geolokalizacja nie jest obsługiwana przez tę przeglądarkę."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationStatus(
          `Lokalizacja uzyskana: ${latitude.toFixed(3)}, ${longitude.toFixed(
            3
          )}`
        );
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("Odmowa dostępu do lokalizacji.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationStatus("Lokalizacja niedostępna.");
        } else if (error.code === error.TIMEOUT) {
          setLocationStatus("Przekroczono czas oczekiwania na lokalizację.");
        } else {
          setLocationStatus("Nieznany błąd podczas pobierania lokalizacji.");
        }
      }
    );
  };

  // Fetch settings
  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      const email = session.user.email;
      const { data, error } = await supabase
        .from("settings")
        .select(
          "sort_order,show_completed,show_habits,show_water_tracker,show_budget_items,show_month_view,show_notifications,users"
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
          show_month_view: data.show_month_view,
          show_notifications: data.show_notifications,
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Ustawienia</h2>
          <InstallButton/>
        </div>
        
        <form
          onSubmit={handleSave}
          className="mb-4 bg-card p-6 rounded-xl shadow space-y-3"
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
              <option value="due_date_alphabetical">
                Data i alfabetycznie
              </option>
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
              Pokaż zrobione
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
              id="show_notifiactions"
              type="checkbox"
              checked={settings.show_notifications}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  show_notifications: e.target.checked,
                })
              }
              className="h-4 w-4 text-primary border-gray-300 rounded"
            />
            <label
              htmlFor="show_notifications"
              className="ml-2 text-sm text-gray-700"
            >
              Pokaż przypomnienia
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
          <div className="flex items-center">
            <input
              id="show_month_view"
              type="checkbox"
              checked={settings.show_month_view}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  show_month_view: e.target.checked,
                })
              }
              className="h-4 w-4 text-primary border-gray-300 rounded"
            />
            <label
              htmlFor="show_month_view"
              className="ml-2 text-sm text-gray-700"
            >
              Pokaż zawsze widok miesiąca
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
                  className="p-2 bg-red-100 rounded-lg text-red-500 hover:bg-red-200"
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
                className="flex items-center rounded-lg space-x-1 text-primary hover:bg-secondary"
              >
                <PlusCircleIcon className="w-5 h-5" />
                <span>Dodaj znajomego</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-lg flex flex-nowrap items-center disabled:opacity-50"
          >
            {saving ? (
              <>
                Zapisywanie…&nbsp;&nbsp;
                <Loader2 className="animate-spin w-5 h-5" />
              </>
            ) : (
              <>
                Zapisz&nbsp;&nbsp;
                <Save className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
        <div className="bg-card mb-4 p-6 rounded-xl shadow space-y-4">
          <h3 className="text-xl font-semibold">Lokalizacja</h3>
          <button
            onClick={requestGeolocation}
            className="px-4 py-2 text-white rounded-lg  bg-primary hover:bg-secondary"
          >
            Poproś o lokalizację
          </button>
          {locationStatus && (
            <p className="text-sm text-gray-700 mt-2">{locationStatus}</p>
          )}
        </div>

        <div className="bg-card p-6 mb-6 rounded-xl shadow space-y-4">
          <h3 className="text-xl font-semibold">Użytkownik</h3>
          <p>
            <strong>Email:</strong> {session.user.email}
          </p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500 text-white rounded-lg"
          >
            Wyloguj się
          </button>
        </div>
      </Layout>
    </>
  );
}

SettingsPage.auth = true;
