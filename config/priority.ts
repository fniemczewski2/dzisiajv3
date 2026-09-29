// config/priority.ts

export interface PriorityColors {
  backgroundColor: string;
  color: string;
}

export function getPriorityColors(priority: number): PriorityColors {
  const level = priority >= 1 && priority <= 5 ? Math.round(priority) : 5;
  return {
    backgroundColor: `var(--prio-${level}-bg)`,
    color: `var(--prio-${level}-fg)`,
  };
}
