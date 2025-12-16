// components/calendar/BirthdayIndicator.tsx
import { useMemo } from "react";
import { useEvents } from "../../hooks/useEvents";
import { format } from "date-fns";
import { eventSpansDate, getAppDate } from "../../lib/dateUtils";
import { Cake } from "lucide-react";

interface Props {
  date?: string; // Format: "YYYY-MM-DD"
}

// Keywords to search for (case-insensitive)
const SPECIAL_KEYWORDS = ["birthday", "urodziny", "imieniny", "rocznica"];

export default function BirthdayIndicator({ date }: Props) {
  // Fetch events for the month containing this date
  const dateObj = useMemo(() => new Date(date? date + "T00:00:00" : getAppDate() + "T00:00:00"), [date]);
  
  const monthStart = useMemo(() => 
    format(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1), "yyyy-MM-dd"),
    [dateObj]
  );
  
  const monthEnd = useMemo(() => 
    format(new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0), "yyyy-MM-dd"),
    [dateObj]
  );
  
  const { events, loading } = useEvents(monthStart, monthEnd);

  // Filter and memoize special events
  const specialEvents = useMemo(() => {
    return events.filter((event) => {
      // Check if event spans the selected date
      if (!eventSpansDate(event, dateObj)) return false;

      // Check if title or description contains any special keyword
      const searchText = `${event.title} ${event.description}`.toLowerCase();
      return SPECIAL_KEYWORDS.some(keyword => searchText.includes(keyword));
    });
  }, [events, dateObj]);

  if (loading || specialEvents.length === 0) return null;

  return (
    <div className="space-y-1">
      {specialEvents.map((event) => (
        <span
          key={event.id}
          className="text-red-700 text-[11px] sm:text-sm text-right flex items-center no-wrap justify-start"
          title={event.description || event.title}
        >
        <Cake className="w-3 h-3 mr-1"/> {event.title}
        </span>
      ))}
    </div>
  );
}
