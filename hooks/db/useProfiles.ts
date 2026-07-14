// hooks/useProfiles.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { NewVCardProfile, VCardProfile } from '@/types/profiles';

export function useProfiles() {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [profiles, setProfiles] = useState<VCardProfile[]>([]);
  const [fetching, setFetching] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  
  useEffect(() => {
    let toastId: string | undefined;
    if (fetching  && toast.loading) toastId = toast.loading("Ładowanie profili...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchProfiles = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('vcard_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        toast.error('Błąd pobierania danych');
        throw error;
      }
      setProfiles(data || []);
    } catch {
      toast.error('Błąd pobierania profili');
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, toast]);

  const addProfile = async (profileData: NewVCardProfile) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true);
    try {
      if (profiles.length >= 5) throw new Error("Osiągnięto limit 5 wizytówek.");

      const { data, error } = await supabase
        .from('vcard_profiles')
        .insert([{ ...profileData, user_id: userId }]) 
        .select()
        .single();

      if (error) throw error;
      setProfiles((prev) => [...prev, data]);
      return { success: true, data };
    } catch (err: any) {
      console.error('Błąd dodawania profilu:', err);
      if (err.code === '23505') return { success: false, error: 'Ten publiczny link jest już zajęty.' };
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (id: string, updates: Partial<VCardProfile>) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vcard_profiles')
        .update(updates) 
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setProfiles((prev) => prev.map((p) => (p.id === id ? data : p)));
      return { success: true, data };
    } catch (err: any) {
      console.error('Błąd edycji profilu:', err);
      if (err.code === '23505') return { success: false, error: 'Ten publiczny link jest już zajęty.' };
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteProfile = async (id: string) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    const ok = await toast.confirm(
      `Czy chcesz usunąć profil?`
    );
    if (!ok) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('vcard_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      toast.success("Usunięto wizytówkę");
    } catch {
      toast.error("Błąd usuwania wizytówki");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return {
    profiles,
    fetching,
    loading,
    error,
    refetch: fetchProfiles,
    addProfile,
    updateProfile,
    deleteProfile,
  };
}