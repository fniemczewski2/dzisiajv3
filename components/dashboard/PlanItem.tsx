"use client";

import React from "react";
import { X, Trash2, Calendar, Dumbbell, ShoppingCart, Clapperboard, ScrollText, Trash } from "lucide-react";
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
  onMarkAsDone: (taskId: string) => void; // Tylko dla zachowania API z eventów (jeśli było używane)
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
    return { path: '/notes/reports', icon: <ScrollText size={15} />, label: 'Sprawozdania' };
  }
  if (lowerTitle.includes('film')) {
    return { path: '/notes/movies', icon: <Clapperboard size={15} />, label: 'Filmy' };
  }
  
  return null;
};

export const PlanItem: React.FC<PlanItemProps> = ({ 
  item, 
  onMarkAsDone, // nie używane bezpośrednio przez task, bo DraggableTask obsługuje sam mark as done
  onRemoveFromSchedule, 
  onDeleteEvent 
}) => {
  const quickLink = getQuickLink(item.title);
  if (item.type === 'task') {
    return (
      <div className="mb-2 relative group">
        <DraggableScheduledTask task={item.data}>
          {/* Przekazujemy pustą funkcję do onTasksChange, bo z poziomu planu usunięcie odbywa się inaczej */}
          <DraggableTask 
            task={item.data} 
            onTasksChange={() => {}} 
          />
        </DraggableScheduledTask>
        
        {/* Przycisk usuwania z samego harmonogramu (nie usunięcie z bazy, a jedynie wyczyszczenie scheduled_time) */}
        <button 
          onClick={() => onRemoveFromSchedule(item.id)} 
          className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 p-1.5 rounded-full shadow-sm hover:scale-110 transition-transform z-10 opacity-0 group-hover:opacity-100"
          title="Odczep z planu dnia (Zadanie wróci na listę)"
        >
          <X size={14} strokeWidth={3} />
        </button>

        {quickLink && (
           <Link 
             href={quickLink.path} 
             className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 rounded-full shadow-sm hover:scale-110 transition-transform z-10 opacity-0 group-hover:opacity-100"
             title={`Przejdź do: ${quickLink.label}`}
           >
             {quickLink.icon}
           </Link>
        )}
      </div>
    );
  }

  // --- WIDOK DLA RUTYN I WYDARZEŃ (Wąski, bez drag&drop) ---

  const deleteBtnClass = "p-1.5 bg-surface hover:bg-red-50 dark:hover:bg-red-900/20 text-textMuted hover:text-red-500 rounded transition-colors";
  const linkClass = "p-1.5 bg-surface hover:bg-primary/10 text-textMuted hover:text-primary rounded transition-colors";

  return (
    <div className={`mb-2 p-2.5 rounded-xl border text-sm shadow-sm flex justify-between items-center group transition-colors ${item.color}`}>
      <div className="flex-1 min-w-0 pr-2">
        <p className="font-bold text-[13px] leading-tight truncate">{item.title}</p>
        <p className="text-[9px] font-semibold uppercase tracking-wider mt-0.5 opacity-80">
          {item.type === 'schema' && 'Rutyna'}
          {item.type === 'event' && 'Wydarzenie'}
        </p>
      </div>
      
      <div className="flex gap-1 items-center shrink-0">
        {quickLink && (
          <Link href={quickLink.path} title={quickLink.label} className={linkClass}>
            {quickLink.icon}
          </Link>
        )}
        
        {item.type === 'event' && (
          <>
            <Link href="/calendar" title="Pokaż w kalendarzu" className={linkClass}>
              <Calendar size={15} />
            </Link>
            <button 
              type="button"
              onClick={() => onDeleteEvent(item.id)} 
              className={deleteBtnClass}
              title="Usuń całkowicie"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};