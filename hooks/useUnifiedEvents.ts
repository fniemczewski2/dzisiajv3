import { useState, useEffect } from 'react';
import { UnifiedEvent } from '../lib/calendarAggregator';

export function useUnifiedEvents(timeMin: Date, timeMax: Date) {
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/calendar/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [timeMin, timeMax]);

  return { events, loading };
}