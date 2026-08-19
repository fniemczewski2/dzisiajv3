// hooks/db/useLetters.ts

import { useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useCrudResource } from "./useCrudResource";
import {
  CATEGORY_CODE_MAP,
  RESPONSE_DAYS_MAP,
  type Letter,
  type LetterCategory,
  type LetterFileKind,
  type LetterInsert,
  type LetterUpdate,
} from "@/types/letters";
import { MAX_LETTER_PDF_SIZE_MB } from "@/config/limits";

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

function getLetterType(category: LetterCategory, kind: LetterFileKind): string {
  if (kind === "letter") {
    switch(category){
      case "Wykroczenie": 
      case "Wykroczenie drogowe":
      case "Przestępstwo": 
        return "zawiadomienie"
      case "Wniosek":
      case "UDIP": 
        return "wniosek"
      case "Skarga":
        return "skarga"
      default: return "pismo"
    }
  } 
  if (kind === "response") {
    return "odpowiedz"
  }
  return "inne"
}

function storagePath(userId: string, letterId: string, category: LetterCategory, kind: LetterFileKind): string {
  // Must be `${userId}/...` (a real path segment), not a dot-separated
  // prefix: the "letters" bucket's storage.objects RLS policies check
  // (storage.foldername(name))[1] = auth.uid(), which only matches a
  // folder segment before a "/" — a flat "userId.letterId..." filename
  // has no folder at all, so every upload was silently rejected by RLS.
  return `${userId}/${letterId}.${getLetterType(category, kind)}.pdf`;
}

export function useLetters() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();

  const crud = useCrudResource<Letter, LetterInsert>({
    table: "letters",
    order: { column: "issue_date", ascending: false },
    insertPosition: "start",
    // uploadLetterFile below uses crud.patch()'s return value to decide
    // whether to roll back the just-uploaded file. Without this flag,
    // patch() returns `undefined` on BOTH success and failure (see
    // useCrudResource.ts), so that check always looked like a failure and
    // deleted every file right after it was successfully uploaded.
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
      const code =
        payload.category === "Inne" ? (payload.category_code ?? "?") : CATEGORY_CODE_MAP[payload.category];
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
        letter_file_path: null,
        response_file_path: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },
    messages: MESSAGES,
  });

  const editLetter = useCallback(
    async (id: string, updates: LetterUpdate) => crud.patch(id, updates),
    [crud]
  );
  const deleteLetter = useCallback(
    async (id: string): Promise<void> => {
      const letter = crud.items.find((l) => l.id === id);
      const paths = [letter?.letter_file_path, letter?.response_file_path].filter(
        (p): p is string => Boolean(p)
      );

      const removed = await crud.remove(id);
      if (!removed) return;

      if (paths.length > 0) {
        const { error } = await supabase.storage.from("letters").remove(paths);
        if (error) {
          console.warn("[useLetters] Nie udało się usunąć załączników:", error.message);
        }
      }
    },
    [crud, supabase]
  );

  const uploadLetterFile = useCallback(
    async (letterId: string, category: LetterCategory, kind: LetterFileKind, file: File): Promise<void> => {
      if (!userId) throw new Error("Unauthorized");

      if (file.type !== "application/pdf") {
        toast.error("Załącznik musi być plikiem PDF.");
        return;
      }
      if (file.size > MAX_LETTER_PDF_SIZE_MB * 1024 * 1024) {
        toast.error(`Plik jest za duży (limit ${MAX_LETTER_PDF_SIZE_MB} MB).`);
        return;
      }

      const path = storagePath(userId, letterId, category, kind);
      const { error: uploadError } = await supabase.storage
        .from("letters")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });

      if (uploadError) {
        // Storage errors (missing bucket, RLS policy rejection, etc.) were
        // previously swallowed into one generic message with no way to tell
        // them apart — log the real cause for debugging.
        console.error("[useLetters] upload do bucketu 'letters' nie powiodło się:", uploadError.message);
        toast.error("Błąd przesyłania pliku.");
        return;
      }

      const update: Partial<Letter> =
        kind === "letter" ? { letter_file_path: path } : { response_file_path: path };
      const result = await crud.patch(
        letterId,
        update,
        {
          successMessage: kind === "letter" ? "Wgrano pismo" : "Wgrano odpowiedź",
          errorMessage: "Plik wgrany, ale nie udało się zapisać w bazie.",
        }
      );
      if (!result) {
        await supabase.storage.from("letters").remove([path]);
      }
    },
    [userId, supabase, toast, crud]
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
    uploadLetterFile,
    getLetterFileUrl,
  };
}
