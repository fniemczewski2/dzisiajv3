"use client";

import React from "react";
import { Calendar, ListTodo } from "lucide-react";

export const DraggingTaskItem = ({ title }: { title: string }) => (
  <div className="p-3 w-full min-w-[260px] max-w-[400px] bg-card border border-primary shadow-2xl rounded-xl opacity-90 cursor-grabbing z-50 text-text flex items-center gap-3">
    <ListTodo className="w-4 h-4 text-primary" /> {title}
  </div>
);

export const DraggingEventItem = ({ title }: { title: string }) => (
  <div className="p-3 w-full min-w-[260px] max-w-[400px] bg-card border border-primary shadow-2xl rounded-xl opacity-90 cursor-grabbing z-50 text-text flex items-center gap-3">
    <Calendar className="w-4 h-4 text-primary" /> {title}
  </div>
);