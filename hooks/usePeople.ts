// hooks/usePeople.ts
import { useState, useEffect, useCallback } from "react";
import { Person, PersonInsert } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

export function usePeople() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [people, setPeople] = useState<Person[]>([]);
  const [fetching, setFetching] = useState(false);  
  const [loading, setLoading] = useState(false);  
  const { toast } = useToast();

  useEffect(() => {
    let toastId: string | undefined;
    if (fetching  && toast.loading) toastId = toast.loading("Ładowanie celów...");
    return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
  }, [fetching, toast]);

  const fetchPeople = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .eq("user_id", userId)
        .order("first_name", { ascending: true });

      if (error) throw error;
      setPeople(data || []);
    } catch {
      toast.error("Błąd pobierania kontaktów");
    } finally {
      setFetching(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const addPerson = async (person: PersonInsert) => {
    if (!userId) return;
    setLoading(true)
    try {
      const { data, error } = await supabase.from("people").insert({ ...person, user_id: userId }).select().single();
      toast.success("Dodano kontakt")
      setPeople((prev) => [...prev, data].sort((a, b) => a.first_name.localeCompare(b.first_name)));
    } catch {
      toast.error("Błąd dodawania kontaktu");
    } finally {
      setLoading(false);
    }  
  };

  const editPerson = async (id: string, updates: Partial<Person>) => {
    if (!userId) return;
    setLoading(true);
    try {
      setPeople((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
      await supabase.from("people").update(updates).eq("id", id);
      toast.success("Zaaktulizowano kontakt")
    } catch {
      fetchPeople()
      toast.error("Błąd aktualizacji kontaktu");
    } finally {
      setLoading(false);
    }
  };

  const deletePerson = async (id: string) => {
    if (!userId) return;
    setLoading(true);
    const ok = await toast.confirm("Czy na pewno chcesz usunąć kontakt?");
    if (ok) {
      try {
        setPeople((prev) => prev.filter((p) => p.id !== id));
        await supabase.from("people").delete().eq("id", id);
        toast.success("Usunięto kontakt");
      } catch {
        toast.error("Błąd usuwania kontaktu");
      } finally {
        setLoading(false);
      }
    };
  };

  const logContact = async (id: string) => {
    await editPerson(id, { last_contact_date: new Date().toISOString() });
  };

  const getPeopleToContact = () => {
    const now = new Date();
    return people.filter(p => {
      if (p.priority === 0 || p.priority === 5) return false;
      if (!p.last_contact_date) return true; // Jeśli nigdy, trzeba się skontaktować

      const lastContact = new Date(p.last_contact_date);
      const diffTime = Math.abs(now.getTime() - lastContact.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (p.priority) {
        case 1: return diffDays >= 14; 
        case 2: return diffDays >= 30; 
        case 3: return diffDays >= 61;
        case 4: return diffDays >= 365; 
        default: return false;
      }
    });
  };

  return { people, loading, addPerson, editPerson, deletePerson, logContact, getPeopleToContact, fetchPeople };
}