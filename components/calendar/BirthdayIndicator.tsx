import { useMemo } from "react";
import { useEvents } from "../../hooks/useEvents";
import { format } from "date-fns";
import { eventSpansDate, getAppDate } from "../../lib/dateUtils";
import { Cake } from "lucide-react";

interface Props {
  date?: string; // Format: "YYYY-MM-DD"
}

const SPECIAL_KEYWORDS = ["birthday", "urodziny", "imieniny", "rocznica"];

export default function BirthdayIndicator({ date }: Props) {
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

  const specialEvents = useMemo(() => {
    return events.filter((event) => {
      if (!eventSpansDate(event, dateObj)) return false;

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
          className="text-red-600 dark:text-red-400 font-bold text-[10px] sm:text-sm text-right flex items-center justify-start uppercase tracking-wider px-1 py-0.5"
          title={event.description || event.title}
        >
          <Cake className="w-3 h-3 mr-1 shrink-0" /> 
          <span className="truncate">{event.title}</span>
        </span>
      ))}
    </div>
  );
}