import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/providers/ToastProvider';

export interface PhoneItem { type: string; number: string; }
export interface EmailItem { type: string; email: string; }
export interface AddressItem { type: string; address: string; }
export interface SocialLinkItem { platform: string; url: string; }
export interface BusinessData { nip?: string; krs?: string; bank_account?: string; }

export interface VCardProfile {
  id: string;
  user_id: string;
  profile_name: string;
  full_name?: string;
  avatar_url?: string;
  organization?: string;
  phones: PhoneItem[];
  emails: EmailItem[];
  addresses: AddressItem[];
  color_light: string;         
  color_dark: string;
  social_links: SocialLinkItem[];
  business_data: BusinessData;
  is_public: boolean;
  public_slug?: string;
}

export type NewVCardProfile = Omit<VCardProfile, 'id' | 'user_id'>;

export function useProfiles() {
  const supabase = createClient();
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
    setFetching(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Zaloguj się");
        return;
      }
      const { data, error: fetchError } = await supabase
        .from('vcard_profiles')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setProfiles(data || []);
    } catch (err: any) {
      toast.error('Błąd pobierania profili');
    } finally {
      setFetching(false);
    }
  }, [supabase]);

  const addProfile = async (profileData: NewVCardProfile) => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Brak zalogowanego użytkownika");
      if (profiles.length >= 5) throw new Error("Osiągnięto limit 5 wizytówek.");

      const { data, error } = await supabase
        .from('vcard_profiles')
        .insert([{ ...profileData, user_id: userData.user.id }]) 
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
    setLoading(true);
    try {
      const { error } = await supabase
        .from('vcard_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      return { success: true };
    } catch (err: any) {
      console.error('Błąd usuwania profilu:', err);
      return { success: false, error: err.message };
    }
    finally {
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