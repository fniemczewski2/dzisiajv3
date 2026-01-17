"use client";

import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useEffect, ReactNode, useCallback, useState } from "react";
import LoadingState from "./LoadingState";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const session = useSession();
  const userEmail = session?.user.email || process.env.NEXT_PUBLIC_USER_EMAIL;
  const router = useRouter();

  const checkAuth = useCallback(() => {
    if (session === null && userEmail === "") {
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
      <LoadingState/>
    );
  }

  return <>{children}</>;
}
