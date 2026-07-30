// lib/abortUtils.ts

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export function createAbortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}
