// hooks/usePeople.ts
import { useState, useEffect, useCallback } from "react";
import { Person, PersonInsert } from "@/types";
import { useAuth } from "@/providers/AuthProvider";

export function usePeople() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPeople = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .eq("user_id", userId)
        .order("first_name", { ascending: true });

      if (error) throw error;
      setPeople(data || []);
    } catch (error) {
      console.error("Błąd pobierania kontaktów:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const addPerson = async (person: PersonInsert) => {
    if (!userId) return;
    const { data, error } = await supabase.from("people").insert({ ...person, user_id: userId }).select().single();

    if (error) throw error;

    setPeople((prev) => [...prev, data].sort((a, b) => a.first_name.localeCompare(b.first_name)));
  };

  const editPerson = async (id: string, updates: Partial<Person>) => {
    if (!userId) return;

    setPeople((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));

    const { error } = await supabase.from("people").update(updates).eq("id", id);
    if (error) {
      fetchPeople(); 
      throw error;
    }
  };

  const deletePerson = async (id: string) => {
    if (!userId) return;

    setPeople((prev) => prev.filter((p) => p.id !== id));

    const { error } = await supabase.from("people").delete().eq("id", id);
    if (error) {
      fetchPeople(); 
      throw error;
    }
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