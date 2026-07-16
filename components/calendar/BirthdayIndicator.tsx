// components/calendar/BirthdayIndicator.tsx
import { useMemo } from "react";
import { useEvents, useVirtualBirthdayEvents } from "@/hooks/db/useEvents";
import { format } from "date-fns";
import { eventSpansDate, getAppDate } from "@/lib/dateUtils";
import { Cake, Star, Gift, Heart } from "lucide-react";
import { getPolishHolidays } from "@/lib/holidays"; 
import { useAuth } from "@/providers/AuthProvider";

const SPECIAL_KEYWORDS = ["birthday", "urodziny", "imieniny", "rocznica"];

function HolidayIndicator({ dateStr, dateObj }: { readonly dateStr: string, readonly dateObj: Date }) {
  const holiday = useMemo(() => {
    const holidaysMap = getPolishHolidays(dateObj.getFullYear());
    return holidaysMap[dateStr] || null;
  }, [dateObj, dateStr]);

  if (!holiday) return null;

  return (
    <div className="space-y-1">
      <span
        className="text-red-500 dark:text-red-400 font-bold text-[10px] sm:text-sm text-right flex items-center justify-start uppercase tracking-wider px-1 py-0.5"
        title={holiday}
      >
        <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 shrink-0" /> 
        <span className="truncate">{holiday}</span>
      </span>
    </div>
  );
}

function AuthenticatedBirthdayIndicator({ dateStr, dateObj }: { readonly dateStr: string, readonly dateObj: Date }) {
  const monthStart = useMemo(() => 
    format(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1), "yyyy-MM-dd"),
    [dateObj]
  );
  
  const monthEnd = useMemo(() => 
    format(new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0), "yyyy-MM-dd"),
    [dateObj]
  );
  const virtualEvents = useVirtualBirthdayEvents();
  const { events, loading } = useEvents(monthStart, monthEnd, virtualEvents);

  const specialEvents = useMemo(() => {
    return events.filter((event) => {
      if (!eventSpansDate(event, dateObj)) return false;

      const searchText = `${event.title} ${event.description || ""}`.toLowerCase();
      return SPECIAL_KEYWORDS.some(keyword => searchText.includes(keyword));
    });
  }, [events, dateObj]);

  const holiday = useMemo(() => {
    const holidaysMap = getPolishHolidays(dateObj.getFullYear());
    return holidaysMap[dateStr] || null;
  }, [dateObj, dateStr]);

  const getEventIcon = (title: string, description: string = "") => {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes("imieniny")) return <Gift className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 shrink-0" />;
    if (text.includes("rocznica")) return <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 shrink-0" />;
    return <Cake className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 shrink-0" />;
  };

  if (loading || (specialEvents.length === 0 && !holiday)) return null;

  return (
    <div className="space-y-1">
      {holiday && (
        <span
          className="text-red-500 dark:text-red-400 font-bold text-[10px] sm:text-sm text-right flex items-center justify-start uppercase tracking-wider px-1 py-0.5"
          title={holiday}
        >
          <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 shrink-0" /> 
          <span className="truncate">{holiday}</span>
        </span>
      )}

      {specialEvents.map((event) => (
        <span
          key={event.id}
          className="text-red-500 dark:text-red-400 font-bold text-[10px] sm:text-sm text-right flex items-center justify-start uppercase py-0.5"
          title={event.description || event.title}
        >
          {getEventIcon(event.title, event.description)}
          <span className="truncate">
             {event.title.replace(/🎂 |🎉 /g, '')}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function BirthdayIndicator({ date }: {readonly date?: string}) {
  const dateStr = date || getAppDate(); 
  const { user } = useAuth();
  const dateObj = useMemo(() => new Date(`${dateStr}T00:00:00`), [dateStr]);
  
  if (!user) {
    return <HolidayIndicator dateStr={dateStr} dateObj={dateObj} />;
  }

  return <AuthenticatedBirthdayIndicator dateStr={dateStr} dateObj={dateObj} />;
}