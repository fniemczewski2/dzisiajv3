// hooks/useDailyOverrides.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';

export type DailyOverride = {
  schema_id: string;
  new_time?: string | null;
};

export function useDailyOverrides(dateStr: string) {
  const { supabase, user } = useAuth();
  const [overrides, setOverrides] = useState<DailyOverride[]>([]);

  const fetchOverrides = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('daily_overrides')
      .select('schema_id, new_time')
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
    if (!user) return;
    
    setOverrides(prev => {
      const existing = prev.find(o => o.schema_id === schemaId);
      if (existing) {
        return prev.map(o => o.schema_id === schemaId ? { ...o, new_time: null } : o);
      }
      return [...prev, { schema_id: schemaId, new_time: null }];
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
      const res = await supabase.from('daily_overrides').update({ new_time: null }).eq('id', existing.id);
      error = res.error;
    } else {
      const res = await supabase.from('daily_overrides').insert({ user_id: user.id, date: dateStr, schema_id: schemaId, new_time: null });
      error = res.error;
    }

    if (error) {
      console.error("Błąd podczas ukrywania rutyny:", error);
      fetchOverrides();
    }
  };

  const moveSchema = async (schemaId: string, newTime: string) => {
    if (!user) return;
    
    setOverrides(prev => {
      const existing = prev.find(o => o.schema_id === schemaId);
      if (existing) {
        return prev.map(o => o.schema_id === schemaId ? { ...o, new_time: newTime } : o);
      }
      return [...prev, { schema_id: schemaId, new_time: newTime }];
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
      const res = await supabase.from('daily_overrides').update({ new_time: newTime }).eq('id', existing.id);
      error = res.error;
    } else {
      const res = await supabase.from('daily_overrides').insert({ user_id: user.id, date: dateStr, schema_id: schemaId, new_time: newTime });
      error = res.error;
    }

    if (error) {
      console.error("Błąd podczas przenoszenia rutyny:", error);
      fetchOverrides();
    }
  };

  return { overrides, hideSchema, moveSchema };
}