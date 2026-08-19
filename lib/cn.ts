// lib/cn.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines conditional classes (clsx) and resolves conflicting Tailwind
 * utilities in favor of the last one (tailwind-merge) — e.g. an override
 * `className` prop appended after a component's own classes will actually
 * take effect instead of losing to source-order in the compiled CSS.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
