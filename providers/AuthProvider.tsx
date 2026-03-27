'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '../utils/supabase/client'; 

type AuthContextType = {
  readonly user: User | null;
  readonly loadingUser: boolean;
  readonly supabase: SupabaseClient;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true); 

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

  const contextValue = useMemo(() => ({
    user,
    loadingUser,
    supabase
  }), [user, loadingUser, supabase]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};