// pages/auth/callback.tsx
import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../providers/AuthProvider"; 
import LoadingState from "../../components/LoadingState";

export default function AuthCallbackPage() {
  const { supabase } = useAuth();
  const router = useRouter();
  const hasExchanged = useRef(false); 

  useEffect(() => {
    if (!router.isReady) return;

    const handleCallback = async () => {
      if (hasExchanged.current) return;
      
      const code = router.query.code;
      const next = router.query.next;
      
      if (typeof code === "string") {
        hasExchanged.current = true;
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("exchangeCodeForSession error:", error.message);
          router.replace("/login?error=auth_failed");
          return;
        }
      }
      const destination =
        typeof next === "string" && next.startsWith("/") ? next : "/";

      router.replace(destination);
    };

    handleCallback();
  }, [router.isReady, router.query, supabase.auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <LoadingState size="lg" />
        <p className="text-textMuted font-medium text-sm">Logowanie…</p>
      </div>
    </div>
  );
}