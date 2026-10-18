// lib/server/fetchWithTimeout.ts

import { TIMEOUTS_MS } from "@/config/server";
export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs: number = TIMEOUTS_MS.default
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
