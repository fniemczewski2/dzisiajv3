// providers/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User, SupabaseClient } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  loadingUser: boolean;
  supabase: SupabaseClient;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loadingUser: true,
  supabase,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
        setLoadingUser(false);
      }
    );

    const tryDevAutoLogin = async () => {
      if (process.env.NODE_ENV !== "development") return;

      const email = process.env.NEXT_PUBLIC_USER_EMAIL;
      const password = process.env.NEXT_PUBLIC_USER_PASSWORD;
      if (!email || !password) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session || !isMounted) return;

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error && isMounted) {
        console.warn("[AuthProvider] Dev auto-login failed:", error.message);
      }
    };

    tryDevAutoLogin();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loadingUser, supabase }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);