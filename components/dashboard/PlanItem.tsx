"use client";

import React from "react";
import { X, Calendar, Dumbbell, ShoppingCart, Clapperboard, ScrollText, Trash2, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { DeleteButton } from "../CommonButtons";
import TimeContextBadge from "../tasks/TimeContextBadge";

interface PlanItemData {
  id: string;
  title: string;
  type: 'event' | 'schema' | 'task';
  color: string;
  data?: any;
}

interface PlanItemProps {
  item: PlanItemData;
  onMarkAsDoneTask?: (taskId: string) => void; 
  onDeleteTask?: (taskId: string) => void;
  onRemoveFromSchedule?: (taskId: string) => void;
  onDeleteEvent: (eventId: string) => void;
}

const getQuickLink = (title: string): { path: string; icon: React.ReactNode; label: string } | null => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('trening')) {
    return { path: '/training', icon: <Dumbbell className="w-4 h-4" />, label: 'Trening' };
  }
  if (lowerTitle.includes('zakupy')) {
    return { path: '/notes/shopping', icon: <ShoppingCart className="w-4 h-4" />, label: 'Zakupy' };
  }
  if (lowerTitle.includes('spotkanie')) {
    return { path: '/notes/reports', icon: <ScrollText className="w-4 h-4" />, label: 'Raporty' };
  }
  if (lowerTitle.includes('film')) {
    return { path: '/notes/movies', icon: <Clapperboard className="w-4 h-4" />, label: 'Filmy' };
  }
  
  return null;
};

export const PlanItem: React.FC<PlanItemProps> = ({ 
  item, 
  onMarkAsDoneTask, 
  onRemoveFromSchedule, 
}) => {
  const quickLink = getQuickLink(item.title);

  const priorityColors = {
    1: { bg: "#fca5a5", text: "#B91C1C" },
    2: { bg: "#fdba74", text: "#B91C1C" },
    3: { bg: "#fde68a", text: "#A16207" },
    4: { bg: "#a7f3d0", text: "#15803D" },
    5: { bg: "#bbf7d0", text: "#15803D" },
  };

  const colors = priorityColors[item.data?.priority as 1 | 2 | 3 | 4 | 5] || priorityColors[3];

  const getLabel = (item: PlanItemData) => {
    switch(item.type) {
      case 'event': return 'Wydarzenie';  
      case 'schema': return 'Rutyna';
      case 'task': return item.data?.category ? item.data.category : 'Zadanie';
      default: return '';
    }
  };
  
  return (
    <div className={`mb-2 p-3 rounded-xl border shadow-sm flex justify-between items-center group transition-colors ${item.color}`}>
      
      {/* Lewa strona - Tytuł */}
      <div className="flex-1 min-w-0 pr-2">
        <p className="flex items-center gap-2 font-bold text-sm leading-tight truncate">
          {item.type === 'task' && (      
            <span
              className="w-5 h-5 text-[10px] font-bold rounded flex items-center justify-center shadow-sm shrink-0"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
              }}
            >
              {item.data?.priority}
            </span>
          )}
          {item.title}
          
        </p>

        <p className="flex items-center flex-wrap gap-2 mt-2">
          {item.type === 'task' && (
            <TimeContextBadge dueDate={item.data.due_date} small/>

          )}
          <span className="text-[9px] font-semibold uppercase tracking-wider text-textMuted">
            {getLabel(item)}
          </span>
        </p>
      </div>
      
      {/* Prawa strona - Małe przyciski z onPointerDown blokującym kolizje z DnD */}
      <div className="flex items-center gap-1.5 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
        {quickLink && (
          <Link 
            href={quickLink.path} 
            title={quickLink.label} 
            className="flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-surface hover:bg-primary/10 text-textSecondary hover:text-primary transition-colors border"
          >
            {quickLink.icon}
          </Link>
        )}
        
        {item.type === 'event' && (
          <>
            <Link 
              href="/calendar" 
              title="Pokaż w kalendarzu" 
              className="flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-surface hover:bg-primary/10 text-textSecondary hover:text-primary transition-colors border"
            >
              <Calendar className="w-4 h-4" />
            </Link>
          </>
        )}
        
        {item.type === 'task' && onMarkAsDoneTask && onRemoveFromSchedule && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); onMarkAsDoneTask(item.id); }}
              className="flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/30 transition-colors border border-green-200 dark:border-green-500/30"
              title="Zrobione"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); onRemoveFromSchedule(item.id); }} 
              title="Odczep z planu dnia"
              className="flex items-center justify-center w-[30px] h-[30px] rounded-lg bg-surface hover:bg-orange-50 dark:hover:bg-orange-900/20 text-textMuted hover:text-orange-500 transition-colors border hover:border-orange-200 dark:hover:border-orange-900/30"
            >
              <X className="w-4 h-4" strokeWidth={3} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};