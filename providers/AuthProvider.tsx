'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '../utils/supabase/client'; // Zmiana Importu!

type AuthContextType = {
  user: User | null;
  loadingUser: boolean;
  supabase: SupabaseClient;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  // Jeśli używasz Middleware, większość stron nie wymaga stanu "loadingUser: true" na start, 
  // ale zostawiamy go dla pełnej zgodności z resztą kodu.
  const [loadingUser, setLoadingUser] = useState(true); 

  // Inicjalizujemy klienta TYLKO RAZ w pamięci używając useMemo
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoadingUser(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoadingUser(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]); 

  return (
    <AuthContext.Provider value={{ user, loadingUser, supabase }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};