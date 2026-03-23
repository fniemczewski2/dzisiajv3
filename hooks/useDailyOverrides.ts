// hooks/useDailyOverrides.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';

export function useDailyOverrides(dateStr: string) {
  const { supabase, user } = useAuth();
  const [hiddenSchemas, setHiddenSchemas] = useState<string[]>([]);

  const fetchOverrides = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('daily_overrides')
      .select('schema_id')
      .eq('user_id', user.id)
      .eq('date', dateStr);

    if (!error && data) {
      setHiddenSchemas(data.map(d => d.schema_id));
    }
  }, [supabase, user, dateStr]);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  const hideSchema = async (schemaId: string) => {
    if (!user) return;
    
    setHiddenSchemas(prev => [...prev, schemaId]);

    const { error } = await supabase
      .from('daily_overrides')
      .insert({
        user_id: user.id,
        date: dateStr,
        schema_id: schemaId
      });

    if (error) {
      console.error("Błąd podczas ukrywania rutyny:", error);
      fetchOverrides();
    }
  };

  return { hiddenSchemas, hideSchema };
}