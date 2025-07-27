// pages/login.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import Head from "next/head";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const nextPath =
    typeof router.query.next === "string" ? router.query.next : "/tasks";

  useEffect(() => {
    if (session) {
      router.replace(nextPath);
    }
  }, [session, nextPath, router]);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${nextPath}` },
      // options: { redirectTo: `${window.location.origin}${nextPath}` },
    });
    if (error) console.error("Login error:", error.message);
  };

  if (session === undefined) {
    return (
      <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
    );
  }

  return (
    <>
      <Head>
        <title>Logowanie – Dzisiaj v3</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-card p-6 rounded-xl shadow text-center">
          <h1 className="text-3xl font-bold mb-4">Dzisiaj v3</h1>
          <p className="mb-6">Zaloguj się, aby skorzystać z&nbsp;aplikacji</p>
          <button
            onClick={handleLogin}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
          >
            Zaloguj
          </button>
        </div>
      </div>
    </>
  );
}
