// components/dashboard/PlanItem.tsx
import React from "react";
import { Check, X, Calendar, Dumbbell, ShoppingCart, Clapperboard, ScrollText } from "lucide-react";
import { NextRouter } from "next/router";
import { DraggableScheduledTask } from "./DraggableScheduledTask";

interface PlanItemData {
  id: string;
  title: string;
  type: 'event' | 'schema' | 'task';
  color: string;
  data?: any;
}

interface PlanItemProps {
  item: PlanItemData;
  router: NextRouter;
  onMarkAsDone: (taskId: string) => void;
  onRemoveFromSchedule: (taskId: string) => void;
  onDeleteEvent: (eventId: string) => void;
}

const getQuickLink = (title: string): { path: string; icon: React.ReactNode; label: string } | null => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('trening')) {
    return { path: '/training', icon: <Dumbbell size={14} />, label: 'Trening' };
  }
  if (lowerTitle.includes('zakupy')) {
    return { path: '/notes/shopping', icon: <ShoppingCart size={14} />, label: 'Zakupy' };
  }
  if (lowerTitle.includes('spotkanie')) {
    return { path: '/notes/reports', icon: <ScrollText size={14} />, label: 'Sprawozdania' };
  }
  if (lowerTitle.includes('film')) {
    return { path: '/notes/movies', icon: <Clapperboard size={14} />, label: 'Filmy' };
  }
  
  return null;
};

export const PlanItem: React.FC<PlanItemProps> = ({ 
  item, 
  router, 
  onMarkAsDone, 
  onRemoveFromSchedule, 
  onDeleteEvent 
}) => {
  const quickLink = getQuickLink(item.title);

  if (item.type === 'task') {
    return (
      <DraggableScheduledTask task={item.data}>
        <div className={`mb-2 p-3 rounded-lg border text-sm shadow-sm flex justify-between items-start group bg-white ${item.color}`}>
          <div className="flex-1">
            <p className="font-semibold">{item.title}</p>
            <p className="text-[10px] opacity-70 uppercase">Zadanie</p>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => onMarkAsDone(item.id)} 
              className="p-1 hover:bg-green-100 text-green-600 rounded transition-opacity"
              title="Zrobione"
            >
              <Check size={14} />
            </button>
            <button 
              onClick={() => onRemoveFromSchedule(item.id)} 
              className="p-1 hover:bg-red-100 text-red-500 rounded transition-opacity"
              title="Usuń z planu"
            >
              <X size={14} />
            </button>
            {quickLink && (
              <button
                onClick={() => router.push(quickLink.path)}
                title={quickLink.label}
                className="p-1 text-gray-600"
              >
                {quickLink.icon}
              </button>
            )}
          </div>
        </div>
      </DraggableScheduledTask>
    );
  }

  return (
    <div className={`mb-2 p-3 rounded-lg border text-sm shadow-sm flex justify-between items-start group bg-white ${item.color}`}>
      <div className="flex-1">
        <p className="font-semibold">{item.title}</p>
        <p className="text-[10px] opacity-70 uppercase">
          {item.type === 'schema' && 'Rutyna'}
          {item.type === 'event' && 'Wydarzenie'}
        </p>
      </div>
      <div className="flex gap-1">
        {quickLink && (
          <button
            onClick={() => router.push(quickLink.path)}
            title={quickLink.label}
            className="p-1"
          >
            {quickLink.icon}
          </button>
        )}
        {item.type === 'event' && (
          <>
            <button 
              onClick={() => onDeleteEvent(item.id)} 
              className="p-1 hover:bg-red-100 text-red-500 rounded transition-opacity"
            >
              <X size={14} />
            </button>
            <button
              onClick={() => router.push("/calendar")}
              title="Kalendarz"
              className="p-1 text-gray-600"
            >
              <Calendar size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};