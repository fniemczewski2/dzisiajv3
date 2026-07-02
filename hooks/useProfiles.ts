import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Brak zalogowanego użytkownika");

      const { data, error: fetchError } = await supabase
        .from('vcard_profiles')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setProfiles(data || []);
    } catch (err: any) {
      console.error('Błąd pobierania profili:', err);
      setError(err.message || 'Nie udało się pobrać profili');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const addProfile = async (profileData: NewVCardProfile) => {
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
    }
  };

  const updateProfile = async (id: string, updates: Partial<VCardProfile>) => {
    try {
      const { data, error } = await supabase
        .from('vcard_profiles')
        .update(updates) // slug przyjdzie w updates
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
    }
  };

  const deleteProfile = async (id: string) => {
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
  };

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return {
    profiles,
    isLoading,
    error,
    refetch: fetchProfiles,
    addProfile,
    updateProfile,
    deleteProfile,
  };
}