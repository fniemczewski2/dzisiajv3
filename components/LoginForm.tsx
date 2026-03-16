import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";

export default function LoginForm() {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const nextPath = useMemo(() => {
    return typeof router.query.next === "string" ? router.query.next : "/";
  }, [router.query.next]);

  useEffect(() => {
    if (user) {
      router.replace(nextPath);
    }
  }, [user, nextPath, router]);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { 
        redirectTo: `${window.location.origin}${nextPath}` 
      },
    });

    if (error) {
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
                Zaloguj
            </button>
        </div>
    </div>
  );
}
