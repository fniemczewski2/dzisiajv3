// components/LoginForm.tsx
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";

export default function LoginForm() {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const nextPath = useMemo(() => {
    const raw = router.query.next;
    if (typeof raw !== "string") return "/";
    try {
      const url = new URL(raw, "http://x");
      return url.pathname + url.search;
    } catch {
      return "/";
    }
  }, [router.query.next]);

  useEffect(() => {
    if (user) {
      router.replace(nextPath);
    }
  }, [user, nextPath, router]);

  const handleLogin = async () => {
    const redirectTo =
      `${window.location.origin}/auth/callback` +
      (nextPath !== "/" ? `?next=${encodeURIComponent(nextPath)}` : "");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          // Ensure Google returns a refresh token (needed for long sessions)
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("[LoginForm] signInWithOAuth error:", error.message);
      toast.error("Nie udało się zalogować. Spróbuj ponownie.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="card p-6 rounded-xl shadow text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4">Dzisiaj v3</h1>
        <p className="mb-6">Zaloguj się, aby skorzystać z&nbsp;aplikacji</p>
        <button
          onClick={handleLogin}
          className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
        >
          Zaloguj przez Google
        </button>
      </div>
    </div>
  );
}