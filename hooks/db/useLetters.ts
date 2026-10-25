// hooks/db/useLetters.ts

import { NotSignedInError } from "@/lib/errors";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useCrudResource } from "./useCrudResource";
import {
  CATEGORY_CODE_MAP,
  RESPONSE_DAYS_MAP,
  type Letter,
  type LetterAttachment,
  type LetterCategory,
  type LetterFileKind,
  type LetterInsert,
  type LetterUpdate,
} from "@/types/letters";
import { MAX_LETTER_ATTACHMENTS, MAX_LETTER_PDF_SIZE_MB } from "@/config/limits";
import { archiveEntryPaths, archiveFileName, buildLetterArchive, downloadBlob } from "@/lib/letterArchive";

const MESSAGES = {
  fetchError: "Błąd pobierania pism.",
  added: "Dodano pismo",
  addError: "Błąd dodawania pisma.",
  edited: "Zaktualizowano pismo",
  editError: "Błąd aktualizacji pisma.",
  deleted: "Usunięto pismo",
  deleteError: "Błąd usuwania pisma.",
  confirmDelete: "Czy na pewno chcesz usunąć to pismo wraz z załącznikami?",
};

export function suggestResponseDate(category: LetterCategory, issueDate: string): string | null {
  if (category === "Inne") return null;
  const days = RESPONSE_DAYS_MAP[category];
  const d = new Date(`${issueDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Każdy plik ma unikalną ścieżkę, więc kilka załączników tej samej sekcji nie nadpisuje się. */
function attachmentPath(userId: string, letterId: string, kind: LetterFileKind): string {
  return `${userId}/${letterId}/${kind}-${crypto.randomUUID()}.pdf`;
}

export function useLetters() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();

  const crud = useCrudResource<Letter, LetterInsert>({
    table: "letters",
    order: { column: "issue_date", ascending: false },
    insertPosition: "start",
    applyServerRowOnEdit: true,
    prepareInsert: (payload, userId) => ({
      user_id: userId,
      category: payload.category,
      category_other: payload.category === "Inne" ? (payload.category_other ?? null) : null,
      category_code: payload.category === "Inne" ? payload.category_code : null,
      issue_date: payload.issue_date,
      response_date: payload.response_date ?? null,
      recipient: payload.recipient,
      description: payload.description,
      license_plate_number: payload.category === "Wykroczenie drogowe" ? (payload.license_plate_number ?? null) : null,
      incident_date: payload.incident_date ?? null,
      incident_place: payload.incident_place ?? null,
    }),
    buildOptimistic: (payload, tempId, uId) => {
      const code = payload.category === "Inne" ? (payload.category_code ?? "?") : CATEGORY_CODE_MAP[payload.category];
      const d = new Date(`${payload.issue_date}T00:00:00`);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = String(d.getFullYear());
      return {
        id: tempId,
        user_id: uId,
        category: payload.category,
        category_other: payload.category === "Inne" ? (payload.category_other ?? null) : null,
        category_code: code,
        sequence_number: 0,
        sequence_year: d.getFullYear(),
        signature: `….${mm}.${yyyy}.${code}`,
        issue_date: payload.issue_date,
        response_date: payload.response_date ?? null,
        recipient: payload.recipient,
        description: payload.description,
        license_plate_number:
          payload.category === "Wykroczenie drogowe" ? (payload.license_plate_number ?? null) : null,
        incident_date: payload.incident_date ?? null,
        incident_place: payload.incident_place ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },
    messages: MESSAGES,
  });

  const [attachments, setAttachments] = useState<LetterAttachment[]>([]);
  const letterKey = crud.items.map((l) => l.id).join(",");

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("letter_attachments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("[useLetters] pobieranie załączników:", error.message);
        toast.error("Nie udało się pobrać załączników.");
        return;
      }
      setAttachments((data ?? []) as LetterAttachment[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, letterKey, supabase, toast]);

  const getAttachments = useCallback(
    (letterId: string, kind: LetterFileKind) => attachments.filter((a) => a.letter_id === letterId && a.kind === kind),
    [attachments]
  );

  const editLetter = useCallback((id: string, updates: LetterUpdate) => crud.patch(id, updates), [crud]);

  const deleteLetter = useCallback(
    async (id: string): Promise<void> => {
      // Ścieżki czytamy z bazy, nie ze stanu: stan może być niepełny (np. przed zakończeniem wczytywania).
      // Wiersze załączników znikają kaskadowo razem z pismem, pliki w Storage trzeba usunąć jawnie.
      const { data: rows, error: rowsError } = await supabase
        .from("letter_attachments")
        .select("storage_path")
        .eq("letter_id", id);
      if (rowsError) {
        console.error("[useLetters] odczyt załączników przed usunięciem:", rowsError.message);
        toast.error("Nie udało się odczytać załączników. Pismo nie zostało usunięte.");
        return;
      }
      const paths = (rows ?? []).map((r) => r.storage_path as string);

      const removed = await crud.remove(id);
      if (!removed) return;
      setAttachments((prev) => prev.filter((a) => a.letter_id !== id));

      if (paths.length > 0) {
        const { error } = await supabase.storage.from("letters").remove(paths);
        if (error) console.warn("[useLetters] Nie udało się usunąć plików pisma:", error.message);
      }
    },
    [crud, supabase, toast]
  );

  /** Dodaje pliki PDF do sekcji pisma lub odpowiedzi, nie przekraczając limitu. Zwraca liczbę dodanych. */
  const addLetterAttachments = useCallback(
    async (letterId: string, kind: LetterFileKind, files: File[]): Promise<number> => {
      if (!userId) throw new NotSignedInError();

      const current = attachments.filter((a) => a.letter_id === letterId && a.kind === kind).length;
      const room = MAX_LETTER_ATTACHMENTS - current;
      if (room <= 0) {
        toast.error(`Osiągnięto limit ${MAX_LETTER_ATTACHMENTS} plików w tej sekcji.`);
        return 0;
      }

      let added = 0;
      for (const file of files) {
        if (added >= room) {
          toast.error(`Dodano ${added} z ${files.length} plików. Limit to ${MAX_LETTER_ATTACHMENTS} plików w sekcji.`);
          break;
        }
        if (file.type !== "application/pdf") {
          toast.error(`„${file.name}” nie jest plikiem PDF.`);
          continue;
        }
        if (file.size > MAX_LETTER_PDF_SIZE_MB * 1024 * 1024) {
          toast.error(`„${file.name}” jest za duży (limit ${MAX_LETTER_PDF_SIZE_MB} MB).`);
          continue;
        }

        const path = attachmentPath(userId, letterId, kind);
        const { error: uploadError } = await supabase.storage
          .from("letters")
          .upload(path, file, { contentType: "application/pdf" });
        if (uploadError) {
          console.error("[useLetters] upload do bucketu 'letters' nie powiódł się:", uploadError.message);
          toast.error(`Błąd przesyłania pliku „${file.name}”.`);
          continue;
        }

        const { data, error } = await supabase
          .from("letter_attachments")
          .insert({
            letter_id: letterId,
            user_id: userId,
            kind,
            storage_path: path,
            file_name: file.name.slice(0, 200),
            size_bytes: file.size,
          })
          .select()
          .single();
        if (error || !data) {
          console.error("[useLetters] zapis załącznika w bazie nie powiódł się:", error?.message);
          await supabase.storage.from("letters").remove([path]);
          toast.error(`Plik „${file.name}” nie został zapisany.`);
          continue;
        }

        setAttachments((prev) => [...prev, data as LetterAttachment]);
        added++;
      }

      if (added > 0) toast.success(added === 1 ? "Dodano załącznik" : `Dodano załączniki: ${added}`);
      return added;
    },
    [userId, attachments, supabase, toast]
  );

  const removeLetterAttachment = useCallback(
    async (attachment: LetterAttachment): Promise<void> => {
      const { error } = await supabase.from("letter_attachments").delete().eq("id", attachment.id);
      if (error) {
        console.error("[useLetters] usuwanie załącznika:", error.message);
        toast.error("Błąd usuwania załącznika.");
        return;
      }
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));

      const { error: storageError } = await supabase.storage.from("letters").remove([attachment.storage_path]);
      if (storageError) console.warn("[useLetters] Nie udało się usunąć pliku:", storageError.message);
      toast.success("Usunięto załącznik");
    },
    [supabase, toast]
  );

  /** Pobiera wszystkie pliki (pismo i odpowiedź) do jednego archiwum ZIP. Przy błędzie nic nie pobiera. */
  const downloadLetterArchive = useCallback(
    async (letter: Letter): Promise<void> => {
      const sources = [...getAttachments(letter.id, "letter"), ...getAttachments(letter.id, "response")];
      if (sources.length === 0) {
        toast.error("Brak plików do pobrania.");
        return;
      }
      const paths = archiveEntryPaths(sources.map((a) => ({ kind: a.kind, file_name: a.file_name })));
      try {
        const files = await Promise.all(
          sources.map(async (a, i) => {
            const { data, error } = await supabase.storage.from("letters").createSignedUrl(a.storage_path, 300);
            if (error || !data) throw new Error(`Nie udało się przygotować pliku „${a.file_name}”.`);
            const res = await fetch(data.signedUrl);
            if (!res.ok) throw new Error(`Nie udało się pobrać pliku „${a.file_name}”.`);
            return { path: paths[i], data: new Uint8Array(await res.arrayBuffer()) };
          })
        );
        const zip = buildLetterArchive(letter.signature, files);
        downloadBlob(new Blob([new Uint8Array(zip)], { type: "application/zip" }), archiveFileName(letter.signature));
      } catch (err) {
        console.error("[useLetters] archiwum pisma:", err);
        toast.error(err instanceof Error ? err.message : "Nie udało się przygotować archiwum.");
      }
    },
    [getAttachments, supabase, toast]
  );

  const getLetterFileUrl = useCallback(
    async (path: string): Promise<string | null> => {
      const { data, error } = await supabase.storage.from("letters").createSignedUrl(path, 300);
      if (error || !data) {
        toast.error("Błąd generowania linku do pliku.");
        return null;
      }
      return data.signedUrl;
    },
    [supabase, toast]
  );

  return {
    letters: crud.items,
    loading: crud.loading,
    fetching: crud.fetching,
    fetchLetters: crud.refetch,
    addLetter: crud.add,
    editLetter,
    deleteLetter,
    getAttachments,
    addLetterAttachments,
    removeLetterAttachment,
    getLetterFileUrl,
    downloadLetterArchive,
  };
}
