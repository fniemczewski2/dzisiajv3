// components/dashboard/DraggingItem.tsx

import React from "react";
import { Calendar, ListTodo } from "lucide-react";

export const DraggingTaskItem = ({ title }: { title: string }) => (
  <div className="z-50 flex w-full max-w-100 min-w-65 cursor-grabbing items-center gap-3 rounded-xl border border-primary bg-card p-3 text-text opacity-90 shadow-2xl">
    <ListTodo className="h-4 w-4 text-primary" /> {title}
  </div>
);

export const DraggingEventItem = ({ title }: { title: string }) => (
  <div className="z-50 flex w-full max-w-100 min-w-65 cursor-grabbing items-center gap-3 rounded-xl border border-primary bg-card p-3 text-text opacity-90 shadow-2xl">
    <Calendar className="h-4 w-4 text-primary" /> {title}
  </div>
);
