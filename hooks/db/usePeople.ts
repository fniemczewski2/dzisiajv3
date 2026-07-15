// hooks/usePeople.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { Person, PersonInsert } from "@/types/people";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useRetry } from "@/lib/withRetry";

export function usePeople() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [people, setPeople] = useState<Person[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const withRetry = useRetry();

  const fetchPeople = useCallback(async () => {
    if (!userId) {
      toast.error("Zaloguj się!");
      throw new Error("Unauthorized");
    }
    setFetching(true);
    try {
      const { data, error } = await withRetry(async () =>
        supabase.from("people").select("*").eq("user_id", userId).order("first_name", { ascending: true })
      );

      if (error) throw error;
      setPeople(data || []);
    } catch {
      toast.error("Błąd pobierania kontaktów.");
    } finally {
      setFetching(false);
    }
  }, [supabase, userId, toast, withRetry]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const addPerson = useCallback(
    async (person: PersonInsert) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const tempId = `temp-${Date.now()}`;
      const optimisticPerson = { ...person, id: tempId, user_id: userId } as Person;
      setPeople((prev) =>
        [...prev, optimisticPerson].sort((a, b) => a.first_name.localeCompare(b.first_name))
      );

      try {
        const { data, error } = await withRetry(async () =>
          supabase.from("people").insert({ ...person, user_id: userId }).select().single()
        );
        if (error) throw error;
        setPeople((prev) =>
          prev.map((p) => (p.id === tempId ? data : p)).sort((a, b) => a.first_name.localeCompare(b.first_name))
        );
        toast.success("Dodano kontakt");
      } catch {
        setPeople((prev) => prev.filter((p) => p.id !== tempId));
        toast.error("Błąd dodawania kontaktu.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, toast, withRetry]
  );

  const editPerson = useCallback(
    async (id: string, updates: Partial<Person>) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      setLoading(true);
      const previous = people;
      setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));

      try {
        const { error } = await withRetry(async () => supabase.from("people").update(updates).eq("id", id));
        if (error) throw error;
        toast.success("Zaktualizowano kontakt");
      } catch {
        setPeople(previous);
        toast.error("Błąd aktualizacji kontaktu.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, people, toast, withRetry]
  );

  const deletePerson = useCallback(
    async (id: string) => {
      if (!userId) {
        toast.error("Zaloguj się!");
        throw new Error("Unauthorized");
      }
      const ok = await toast.confirm("Czy na pewno chcesz usunąć kontakt?");
      if (!ok) return;

      setLoading(true);
      const previous = people;
      setPeople((prev) => prev.filter((p) => p.id !== id));

      try {
        const { error } = await withRetry(async () => supabase.from("people").delete().eq("id", id));
        if (error) throw error;
        toast.success("Usunięto kontakt");
      } catch {
        setPeople(previous);
        toast.error("Błąd usuwania kontaktu.");
      } finally {
        setLoading(false);
      }
    },
    [userId, supabase, people, toast, withRetry]
  );

  const logContact = useCallback(
    async (id: string) => {
      await editPerson(id, { last_contact_date: new Date().toISOString() });
    },
    [editPerson]
  );

  // Zmienione z funkcji wywoływanej przy każdym renderze na wartość memoizowaną
  // przeliczaną tylko wtedy, gdy zmieni się lista kontaktów.
  const getPeopleToContact = useMemo(() => {
    const now = new Date();
    return people.filter((p) => {
      if (p.priority === 0 || p.priority === 5) return false;
      if (!p.last_contact_date) return true;

      const lastContact = new Date(p.last_contact_date);
      const diffDays = Math.ceil(Math.abs(now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

      switch (p.priority) {
        case 1: return diffDays >= 14;
        case 2: return diffDays >= 30;
        case 3: return diffDays >= 61;
        case 4: return diffDays >= 365;
        default: return false;
      }
    });
  }, [people]);

  return {
    people,
    loading,
    fetching,
    addPerson,
    editPerson,
    deletePerson,
    logContact,
    getPeopleToContact,
    fetchPeople,
  };
}
