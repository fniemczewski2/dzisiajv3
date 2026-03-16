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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (process.env.NODE_ENV === "development" && !session) {
        console.log("⚠️ Tryb DEV: Automatyczne logowanie kontem testowym...");
        
        const email = process.env.NEXT_PUBLIC_USER_EMAIL;
        const password = process.env.NEXT_PUBLIC_USER_PASSWORD;

        if (email && password) {
          const { data: signInData, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            throw new Error("Błąd automatycznego logowania DEV");
          } else if (isMounted) {
            setUser(signInData.user);
          }
        } else {
          console.warn("Brak NEXT_PUBLIC_USER_EMAIL lub NEXT_PUBLIC_USER_PASSWORD w .env");
        }
      } else if (isMounted) {
        setUser(session?.user ?? null);
      }

      if (isMounted) {
        setLoadingUser(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoadingUser(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, loadingUser, supabase }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);