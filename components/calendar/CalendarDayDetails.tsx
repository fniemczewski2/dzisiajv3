// components/calendar/CalendarDayDetails.tsx
import React, { useMemo } from "react";
import DayView from "../dashboard/DayView";

interface Props {
  selectedDate: string;
  onBack: () => void;
}

export default function CalendarDayDetails({ selectedDate, onBack }: Readonly<Props>) {
  const dateObject = useMemo(() => new Date(selectedDate), [selectedDate]);

  return (
    <div className="w-full">
      <DayView 
        date={dateObject} 
        onBack={onBack} 
        isMain={false} 
      />
    </div>
  );
}