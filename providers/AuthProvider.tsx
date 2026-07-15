// providers/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client'; 

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

    const bc = new BroadcastChannel('supabase-auth-channel');
    bc.onmessage = (event) => {
      if (event.data === 'auth-success') {
        window.location.reload();
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'auth-success') {
        window.location.reload();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data === 'auth-success') {
        window.location.reload(); 
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      subscription.unsubscribe();
      bc.close();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handleMessage);
    };
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