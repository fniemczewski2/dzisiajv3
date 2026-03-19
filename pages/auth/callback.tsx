// pages/auth/callback.tsx

import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../providers/AuthProvider";
import LoadingState from "../../components/LoadingState";

export default function AuthCallbackPage() {
  const { supabase } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (error) {
        console.error("exchangeCodeForSession error:", error.message);
        router.replace("/login?error=auth_failed");
        return;
      }
      const next = router.query.next;
      const destination =
        typeof next === "string" && next.startsWith("/") ? next : "/";

      router.replace(destination);
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <LoadingState size="lg" />
        <p className="text-textMuted font-medium text-sm">Logowanie…</p>
      </div>
    </div>
  );
}