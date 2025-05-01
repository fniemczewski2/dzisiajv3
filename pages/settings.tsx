"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userEmail = session?.user?.email ?? "";

  async function signOut() {
    await supabase.auth.signOut();
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<{
    sort_order: string;
    show_completed: boolean;
    show_habits: boolean;
    show_water_tracker: boolean;
  }>({
    sort_order: "priority",
    show_completed: true,
    show_habits: true,
    show_water_tracker: true,
  });

  // Load or create defaults
  useEffect(() => {
    if (!userEmail) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("settings")
        .select("sort_order,show_completed,show_habits,show_water_tracker")
        .eq("user_name", userEmail)
        .maybeSingle();

      if (error) {
        console.error("Fetch settings failed:", error.message);
      }

      if (data) {
        setSettings(data);
      } else {
        // insert default row
        const defaults = {
          user_name: userEmail,
          sort_order: "priority",
          show_completed: true,
          show_habits: true,
          show_water_tracker: true,
        };
        const { error: insErr } = await supabase
          .from("settings")
          .insert(defaults);
        if (insErr) console.error("Insert defaults failed:", insErr.message);
        setSettings(defaults);
      }
      setLoading(false);
    })();
  }, [supabase, userEmail]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      user_name: userEmail,
      sort_order: settings.sort_order,
      show_completed: settings.show_completed,
      show_habits: settings.show_habits,
      show_water_tracker: settings.show_water_tracker,
    };

    const { error } = await supabase
      .from("settings")
      .upsert(payload, { onConflict: "user_name" });

    if (error) {
      console.error("Save settings failed:", error.message);
      alert("Błąd zapisu ustawień: " + error.message);
    } else {
      alert("Ustawienia zapisane.");
    }

    setSaving(false);
  };

  if (session === undefined || loading) {
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
          className="bg-card rounded-xl shadow p-6 space-y-4 mb-4"
        >
          {/* Sort order */}
          <div>
            <h3 className="text-2xl font-semibold mb-6">Aplikacja</h3>
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
                setSettings((s) => ({
                  ...s,
                  sort_order: e.target.value,
                }))
              }
              className="mt-1 w-full p-2 border rounded max-w-[240px]"
            >
              <option value="priority">Priorytet</option>
              <option value="due_date">Data wykonania</option>
              <option value="alphabetical">Alfabetycznie A→Z</option>
            </select>
          </div>

          {/* Show completed */}
          <div className="flex items-center">
            <input
              id="show_completed"
              type="checkbox"
              checked={settings.show_completed}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  show_completed: e.target.checked,
                }))
              }
              className="h-4 w-4 text-primary border-gray-300 rounded"
            />
            <label
              htmlFor="show_completed"
              className="ml-2 block text-sm text-gray-700"
            >
              Pokaż wykonane zadania
            </label>
          </div>

          {/* Show habits */}
          <div className="flex items-center">
            <input
              id="show_habits"
              type="checkbox"
              checked={settings.show_habits}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  show_habits: e.target.checked,
                }))
              }
              className="h-4 w-4 text-primary border-gray-300 rounded"
            />
            <label
              htmlFor="show_habits"
              className="ml-2 block text-sm text-gray-700"
            >
              Pokaż sekcję nawyków
            </label>
          </div>

          {/* Show water tracker */}
          <div className="flex items-center">
            <input
              id="show_water_tracker"
              type="checkbox"
              checked={settings.show_water_tracker}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  show_water_tracker: e.target.checked,
                }))
              }
              className="h-4 w-4 text-primary border-gray-300 rounded"
            />
            <label
              htmlFor="show_water_tracker"
              className="ml-2 block text-sm text-gray-700"
            >
              Pokaż tracker wody
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-xl disabled:opacity-50"
          >
            {saving ? "Zapis..." : "Zapisz ustawienia"}
          </button>
        </form>
        <div className="bg-card rounded-xl shadow p-6 space-y-4">
          <h3 className="text-xl font-semibold">Użytkownik</h3>
          {session?.user && (
            <div>
              <p>
                <strong>Email:</strong> {session.user.email}
              </p>
            </div>
          )}
          <button
            onClick={signOut}
            className="mt-4 px-4 py-2 rounded-xl bg-red-500 text-white"
          >
            Wyloguj się
          </button>
        </div>
      </Layout>
    </>
  );
}

SettingsPage.auth = true;
