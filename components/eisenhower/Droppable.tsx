"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";

const CATEGORY_COLORS = {
  "Pilne i ważne": {
    bg: "bg-red-50",
    border: "border-red-200",
    hoverBorder: "border-red-400",
    text: "text-red-800",
  },
  "Niepilne, ale ważne": {
    bg: "bg-blue-50",
    border: "border-blue-200",
    hoverBorder: "border-blue-400",
    text: "text-blue-800",
  },
  "Pilne, ale nieważne": {
    bg: "bg-orange-50",
    border: "border-orange-200",
    hoverBorder: "border-orange-400",
    text: "text-orange-800",
  },
  "Niepilne i nieważne": {
    bg: "bg-gray-50",
    border: "border-gray-200",
    hoverBorder: "border-gray-400",
    text: "text-gray-800",
  },
} as const;

export default function Droppable({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const colors = CATEGORY_COLORS[id as keyof typeof CATEGORY_COLORS] || {
    bg: "bg-zinc-50",
    border: "border-zinc-200",
    hoverBorder: "border-zinc-400",
    text: "text-zinc-800",
  };

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[250px] ${colors.bg} rounded-xl p-4 shadow-md border-2 transition-all duration-200 ease-out
        ${isOver 
          ? `${colors.hoverBorder} shadow-lg scale-[1.02] bg-opacity-80` 
          : `${colors.border} hover:shadow-lg`
        }`}
    >
      <h3 className={`text-base font-bold mb-3 ${colors.text} flex items-center gap-2`}>
        <span className="text-lg">
          {id === "Pilne i ważne"}
          {id === "Niepilne, ale ważne"}
          {id === "Pilne, ale nieważne"}
          {id === "Niepilne i nieważne"}
        </span>
        {title}
      </h3>
      <ul className="space-y-2 min-h-[150px]">
        {children}
      </ul>
    </div>
  );
}
