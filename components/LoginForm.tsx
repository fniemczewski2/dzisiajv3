import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import LoadingState from "./LoadingState";

export default function LoginForm() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();

  // Memoize nextPath to avoid dependency issues
  const nextPath = useMemo(() => {
    return typeof router.query.next === "string" ? router.query.next : "/tasks";
  }, [router.query.next]);

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      router.replace(nextPath);
    }
  }, [session, nextPath, router]);

  // Show loading while checking session
  if (session === undefined) {
    return <LoadingState />;
  }

  // If already logged in, show loading (will redirect via useEffect)
  if (session) {
    return <LoadingState />;
  }

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { 
        redirectTo: `${window.location.origin}${nextPath}` 
      },
    });

    if (error) {
      console.error("Login error:", error);
      alert("Nie udało się zalogować. Spróbuj ponownie.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-card p-6 rounded-xl shadow text-center max-w-md w-full">
            <h1 className="text-3xl font-bold mb-4">Dzisiaj</h1>
            <p className="mb-6">Zaloguj się, aby skorzystać z&nbsp;aplikacji</p>
            <button
                onClick={handleLogin}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
            >
                Zaloguj
            </button>
        </div>
    </div>
  );
}
