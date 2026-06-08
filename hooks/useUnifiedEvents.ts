import { useState, useEffect } from 'react';
import { UnifiedEvent } from '../lib/calendarAggregator';

export function useUnifiedEvents(timeMin: string, timeMax: string, refreshTrigger?: any) {
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [timeMin, timeMax, refreshTrigger]); 

  return { events, loading };
}