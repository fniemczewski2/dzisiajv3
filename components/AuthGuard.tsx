// components/AuthGuard.tsx
import { useRouter } from "next/router";
import { useEffect, ReactNode } from "react";
import { useAuth } from "../providers/AuthProvider";
import LoadingState from "./LoadingState";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loadingUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingUser && !user) {
      const next = encodeURIComponent(router.asPath);
      router.replace(`/start?next=${next}`);
    }
  }, [user, loadingUser, router]);

  if (loadingUser) return <LoadingState fullScreen />;

  if (!user) return <LoadingState fullScreen />;

  return <>{children}</>;
}