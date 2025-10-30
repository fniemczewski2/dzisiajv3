"use client";

import { useSession } from "@supabase/auth-helpers-react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, ReactNode, useCallback, useState } from "react";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const session = useSession();
  const router = useRouter();

  // Redirect only once when session is null
  const checkAuth = useCallback(() => {
    if (session === null) {
       const next = encodeURIComponent(router.asPath);
       router.replace(`/login?next=${next}`, undefined, { shallow: true });
    }
  }, [session, router]);

  useEffect(() => {
    setLoading(true);
    checkAuth();
    setLoading(false);
  }, [checkAuth]);

  if (session === undefined || loading) {
    return (
      <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
    );
  }

  return <>{children}</>;
}
