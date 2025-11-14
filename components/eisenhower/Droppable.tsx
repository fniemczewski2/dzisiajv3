"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";

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

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] bg-zinc-100 rounded-xl p-4 shadow border ${
        isOver ? "border-blue-400" : "border-zinc-200"
      }`}
    >
      <h3 className="text-md font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
