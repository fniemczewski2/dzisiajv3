"use client";

import React from "react";
import { X, Calendar, Dumbbell, ShoppingCart, Clapperboard, ScrollText, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { DraggableScheduledTask } from "./DraggableScheduledTask";
import DraggableTask from "./DraggableTask";

interface PlanItemData {
  id: string;
  title: string;
  type: 'event' | 'schema' | 'task';
  color: string;
  data?: any;
}

interface PlanItemProps {
  item: PlanItemData;
  onMarkAsDone: (taskId: string) => void; 
  onRemoveFromSchedule: (taskId: string) => void;
  onDeleteEvent: (eventId: string) => void;
}

const getQuickLink = (title: string): { path: string; icon: React.ReactNode; label: string } | null => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('trening')) {
    return { path: '/training', icon: <Dumbbell size={15} />, label: 'Trening' };
  }
  if (lowerTitle.includes('zakupy')) {
    return { path: '/notes/shopping', icon: <ShoppingCart size={15} />, label: 'Zakupy' };
  }
  if (lowerTitle.includes('spotkanie')) {
    return { path: '/notes/reports', icon: <ScrollText size={15} />, label: 'Raporty' };
  }
  if (lowerTitle.includes('film')) {
    return { path: '/notes/movies', icon: <Clapperboard size={15} />, label: 'Filmy' };
  }
  
  return null;
};

export const PlanItem: React.FC<PlanItemProps> = ({ 
  item, 
  onMarkAsDone, 
  onRemoveFromSchedule, 
  onDeleteEvent 
}) => {
  const quickLink = getQuickLink(item.title);

  // --- ZADANIE (DRAGGABLE) ---
  if (item.type === 'task') {
    return (
      <div className="mb-2 relative group">
        <DraggableScheduledTask task={item.data}>
          {/* Wewnątrz ładuje się nasz zaktualizowany, kompaktowy DraggableTask */}
          <DraggableTask 
            task={item.data} 
            onTasksChange={() => {}} 
          />
        </DraggableScheduledTask>
        
        {/* Przycisk odczepienia (mały badge na rogu) */}
        <button 
          onClick={() => onRemoveFromSchedule(item.id)} 
          className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-1.5 rounded-full shadow-md hover:scale-110 transition-transform z-10 opacity-0 group-hover:opacity-100 border border-red-200 dark:border-red-800"
          title="Odczep z planu dnia"
        >
          <X size={14} strokeWidth={3} />
        </button>

        {quickLink && (
           <Link 
             href={quickLink.path} 
             className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 rounded-full shadow-md hover:scale-110 transition-transform z-10 opacity-0 group-hover:opacity-100"
             title={`Przejdź do: ${quickLink.label}`}
           >
             <ArrowRight size={14} strokeWidth={3} />
           </Link>
        )}
      </div>
    );
  }

  // --- WYDARZENIE / RUTYNA (Kompaktowe, wszystko w 1 linii) ---
  return (
    <div className={`mb-2 p-3 rounded-xl border shadow-sm flex justify-between items-center group transition-colors ${item.color}`}>
      
      {/* Lewa strona - Tytuł */}
      <div className="flex-1 min-w-0 pr-2">
        <p className="font-bold text-[13px] leading-tight truncate">{item.title}</p>
        <p className="text-[9px] font-semibold uppercase tracking-wider mt-0.5 text-textMuted">
          {item.type === 'schema' && 'Rutyna'}
          {item.type === 'event' && 'Wydarzenie'}
        </p>
      </div>
      
      {/* Prawa strona - Małe przyciski */}
      <div className="flex items-center gap-1.5 shrink-0">
        {quickLink && (
          <Link 
            href={quickLink.path} 
            title={quickLink.label} 
            className="flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-surface hover:bg-primary/10 text-textSecondary hover:text-primary transition-colors border border-transparent"
          >
            {quickLink.icon}
          </Link>
        )}
        
        {item.type === 'event' && (
          <>
            <Link 
              href="/calendar" 
              title="Pokaż w kalendarzu" 
              className="flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-surface hover:bg-primary/10 text-textSecondary hover:text-primary transition-colors border border-transparent"
            >
              <Calendar size={15} />
            </Link>
            <button 
              type="button"
              onClick={() => onDeleteEvent(item.id)} 
              title="Usuń wydarzenie"
              className="flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-surface hover:bg-red-50 dark:hover:bg-red-900/20 text-textMuted hover:text-red-500 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};