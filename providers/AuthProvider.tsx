// providers/AuthProvider.tsx

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { clearLocalUserData } from "@/lib/localUserData";
import { DEVICE_LOCAL_STORAGE_KEYS, USER_LOCAL_STORAGE_KEYS } from "@/config/storage";

type AuthContextType = {
  readonly user: User | null;
  readonly loadingUser: boolean;
  readonly supabase: SupabaseClient;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Zapamiętuje, czyje dane są w przeglądarce. Jeśli zaloguje się ktoś inny
 * (np. sesja poprzedniej osoby wygasła bez wylogowania), czyści jej dane.
 */
async function rememberOwner(userId: string): Promise<void> {
  try {
    const previous = localStorage.getItem(USER_LOCAL_STORAGE_KEYS.lastUserId);
    if (previous && previous !== userId) await clearLocalUserData();
    localStorage.setItem(USER_LOCAL_STORAGE_KEYS.lastUserId, userId);
  } catch {
    // localStorage niedostępny – nie ma czego porównać.
  }
}

export const AuthProvider = ({ children }: Readonly<{ children: ReactNode }>) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoadingUser(false);
      if (session?.user) void rememberOwner(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoadingUser(false);
      if (event === "SIGNED_OUT") void clearLocalUserData();
      if (event === "SIGNED_IN" && session?.user) void rememberOwner(session.user.id);
    });

    // Logowanie w innej karcie lub w oknie OAuth – odświeżamy, żeby wczytać sesję.
    const channel = new BroadcastChannel("supabase-auth-channel");
    channel.onmessage = (event) => {
      if (event.data === "auth-success") globalThis.location.reload();
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === DEVICE_LOCAL_STORAGE_KEYS.authSuccess && event.newValue) globalThis.location.reload();
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.origin === globalThis.location.origin && event.data === "auth-success") globalThis.location.reload();
    };
    globalThis.addEventListener("storage", handleStorageChange);
    globalThis.addEventListener("message", handleMessage);

    return () => {
      subscription.unsubscribe();
      channel.close();
      globalThis.removeEventListener("storage", handleStorageChange);
      globalThis.removeEventListener("message", handleMessage);
    };
  }, [supabase]);

  const contextValue = useMemo(() => ({ user, loadingUser, supabase }), [user, loadingUser, supabase]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth musi być użyty wewnątrz <AuthProvider>.");
  return context;
};
