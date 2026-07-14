// hooks/useDailyOverrides.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';

export type DailyOverride = {
  schema_id: string;
  new_time?: string | null;
  is_hidden: boolean;
};

export function useDailyOverrides(dateStr: string) {
  const { supabase, user } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<DailyOverride[]>([]);

  const fetchOverrides = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    
    const { data, error } = await supabase
      .from('daily_overrides')
      .select('schema_id, new_time, is_hidden')
      .eq('user_id', user.id)
      .eq('date', dateStr);

    if (!error && data) {
      setOverrides(data);
    }
  }, [supabase, user, dateStr]);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  const hideSchema = async (schemaId: string) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    const ok = await toast.confirm(
      `Czy ukryć rutynę?`
    );
    if (!ok) return;
    if (!user) return;
    
    setOverrides(prev => {
      const existing = prev.find(o => o.schema_id === schemaId);
      if (existing) {
        return prev.map(o => o.schema_id === schemaId ? { ...o, is_hidden: true } : o);
      }
      return [...prev, { schema_id: schemaId, is_hidden: true }];
    });

    const { data: existing } = await supabase
      .from('daily_overrides')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .eq('schema_id', schemaId)
      .maybeSingle();

    let error;
    if (existing) {
      const res = await supabase.from('daily_overrides').update({ is_hidden: true }).eq('id', existing.id);
      error = res.error;
    } else {
      const res = await supabase.from('daily_overrides').insert({ 
        user_id: user.id, 
        date: dateStr, 
        schema_id: schemaId, 
        is_hidden: true 
      });
      error = res.error;
    }

    if (error) {
      console.error("Błąd podczas ukrywania rutyny:", error);
      fetchOverrides();
    }
  };

  const moveSchema = async (schemaId: string, newTime: string) => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    };
    
    setOverrides(prev => {
      const existing = prev.find(o => o.schema_id === schemaId);
      if (existing) {
        return prev.map(o => o.schema_id === schemaId ? { ...o, new_time: newTime, is_hidden: false } : o);
      }
      return [...prev, { schema_id: schemaId, new_time: newTime, is_hidden: false }];
    });

    const { data: existing } = await supabase
      .from('daily_overrides')
      .select('id')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .eq('schema_id', schemaId)
      .maybeSingle();

    let error;
    if (existing) {
      const res = await supabase.from('daily_overrides').update({ new_time: newTime, is_hidden: false }).eq('id', existing.id);
      error = res.error;
    } else {
      const res = await supabase.from('daily_overrides').insert({ user_id: user.id, date: dateStr, schema_id: schemaId, new_time: newTime, is_hidden: false });
      error = res.error;
    }

    if (error) {
      console.error("Błąd podczas przenoszenia rutyny:", error);
      fetchOverrides();
    }
  };

  return { overrides, hideSchema, moveSchema };
}