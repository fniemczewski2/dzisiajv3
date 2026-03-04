'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js';

const AuthContext = createContext<{ user: User | null; loadingUser: boolean; supabase: any }>({
  user: null,
  loadingUser: true,
  supabase: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Tworzymy klienta raz
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // 1. Pobierz użytkownika na starcie
    const initAuth = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoadingUser(false);
    };

    initAuth();

    // 2. Słuchaj zmian (logowanie/wylogowanie) w czasie rzeczywistym
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoadingUser(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, loadingUser, supabase }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);