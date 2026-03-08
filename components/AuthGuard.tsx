// components/AuthGuard.tsx
import { useRouter } from "next/router"; 
import { useEffect, ReactNode } from "react";
import { useAuth } from "../providers/AuthProvider";
import LoadingState from "./LoadingState";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loadingUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingUser && !user && process.env.NODE_ENV !== "development") {
        const next = encodeURIComponent(router.asPath);
        router.replace(`/login?next=${next}`);
    }
  }, [user, loadingUser, router]);

  if (loadingUser) return <LoadingState />;

  return <>{children}</>;
}