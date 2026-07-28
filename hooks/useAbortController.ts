// hooks/useAbortController.ts
//
// Jeden AbortController na hook, zamiast powielania ref+effect w każdym
// z ~25 hooków hooks/db/*. Wzorzec użycia w funkcji fetchującej:
//
//   const signal = getSignal();
//   try {
//     const { data, error } = await withRetry(
//       async () => supabase.from("table").select("*").abortSignal(signal),
//       signal
//     );
//     ...
//   } catch (err) {
//     if (isAbortError(err)) return;   // przerwane celowo — cicho
//     toast.error("...");
//   } finally {
//     if (!signal.aborted) setFetching(false); // stary wywołanie nie nadpisuje stanu
//   }
//
// getSignal() przerywa POPRZEDNIE żądanie tego hooka (superseded — np. szybka
// zmiana parametrów zapytania) i zwraca sygnał nowego. Unmount przerywa
// ostatnie w locie automatycznie.
import { useCallback, useEffect, useRef } from "react";

export function useAbortController() {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const getSignal = useCallback((): AbortSignal => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller.signal;
  }, []);

  return { getSignal };
}
