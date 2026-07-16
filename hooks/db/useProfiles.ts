// hooks/useProfiles.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { useRetry } from '@/hooks/useRetry';
import { NewVCardProfile, VCardProfile } from '@/types/profiles';

export function useProfiles() {
  const { user, supabase } = useAuth();
  const userId = user?.id;

  const [profiles, setProfiles] = useState<VCardProfile[]>([]);
  const [fetching, setFetching] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const withRetry = useRetry();

  const fetchProfiles = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const { data, error: fetchError } = await withRetry(async () =>
        supabase
          .from('vcard_profiles')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
      );

      if (fetchError) throw fetchError;
      setProfiles(data || []);
    } catch {
      toast.error('Błąd pobierania profili.');
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, toast, withRetry]);

  const addProfile = useCallback(
    async (profileData: NewVCardProfile) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      if (profiles.length >= 5) {
        toast.error("Osiągnięto limit 5 wizytówek.");
        return { success: false, error: 'Osiągnięto limit 5 wizytówek.' };
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimisticProfile = { ...profileData, id: tempId, user_id: userId } as VCardProfile;
      setProfiles((prev) => [...prev, optimisticProfile]);

      try {
        const { data, error: insertError } = await withRetry(async () =>
          supabase.from('vcard_profiles').insert([{ ...profileData, user_id: userId }]).select().single()
        );

        if (insertError) throw insertError;
        setProfiles((prev) => prev.map((p) => (p.id === tempId ? data : p)));
        toast.success("Dodano wizytówkę");
        return { success: true, data };
      } catch (err: any) {
        setProfiles((prev) => prev.filter((p) => p.id !== tempId));
        const message = err.code === '23505' ? 'Ten publiczny link jest już zajęty.' : err.message;
        toast.error(message || 'Błąd dodawania wizytówki.');
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [userId, profiles.length, supabase, toast, withRetry]
  );

  const updateProfile = useCallback(
    async (id: string, updates: Partial<VCardProfile>) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = profiles;
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));

      try {
        const { data, error: updateError } = await withRetry(async () =>
          supabase.from('vcard_profiles').update(updates).eq('id', id).select().single()
        );

        if (updateError) throw updateError;
        setProfiles((prev) => prev.map((p) => (p.id === id ? data : p)));
        toast.success("Zaktualizowano wizytówkę");
        return { success: true, data };
      } catch (err: any) {
        setProfiles(previous);
        const message = err.code === '23505' ? 'Ten publiczny link jest już zajęty.' : err.message;
        toast.error(message || 'Błąd edycji wizytówki.');
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, profiles, toast, withRetry]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm(`Czy chcesz usunąć profil?`);
      if (!ok) return;

      setLoading(true);
      const previous = profiles;
      setProfiles((prev) => prev.filter((p) => p.id !== id));

      try {
        const { error: deleteError } = await withRetry(async () =>
          supabase.from('vcard_profiles').delete().eq('id', id)
        );
        if (deleteError) throw deleteError;
        toast.success("Usunięto wizytówkę");
      } catch {
        setProfiles(previous);
        toast.error("Błąd usuwania wizytówki.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, profiles, toast, withRetry]
  );

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
