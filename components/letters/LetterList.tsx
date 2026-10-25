// components/letters/LetterList.tsx

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Download, Upload, Eye, Trash2 } from "lucide-react";
import { useLetters } from "@/hooks/db/useLetters";
import { EditButton, DeleteButton, FormButtons, CopyButtonSmall } from "../ui/CommonButtons";
import NoResultsState from "../ui/NoResultsState";
import SearchBar from "../ui/SearchBar";
import { generateLetterBody } from "@/lib/letterTemplates";
import type { Letter, LetterAttachment, LetterFileKind } from "@/types/letters";
import { MAX_LETTER_ATTACHMENTS } from "@/config/limits";

interface LetterListProps {
  refreshToken?: number;
}
export function AttachmentSlot({
  label,
  kind,
  letterId,
  attachments,
}: Readonly<{
  label: string;
  kind: LetterFileKind;
  letterId: string;
  attachments: LetterAttachment[];
}>) {
  const { addLetterAttachments, removeLetterAttachment, getLetterFileUrl } = useLetters();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const full = attachments.length >= MAX_LETTER_ATTACHMENTS;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    try {
      await addLetterAttachments(letterId, kind, files);
    } finally {
      setBusy(false);
    }
  };

  const handleView = async (path: string) => {
    // Kartę otwieramy przed pobraniem linku, bez noopener – inaczej window.open zwróci null.
    const preview = window.open("", "_blank");
    if (preview) preview.opener = null;
    setBusy(true);
    try {
      const url = await getLetterFileUrl(path);
      if (url && preview) {
        preview.location.href = url;
      } else {
        preview?.close();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (attachment: LetterAttachment) => {
    setBusy(true);
    try {
      await removeLetterAttachment(attachment);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 shrink-0 text-xs font-bold text-text-muted">{label}:</span>
        <span className="text-xs text-text-muted">
          {attachments.length}/{MAX_LETTER_ATTACHMENTS}
        </span>
        {!full && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" /> Dodaj PDF
            </button>
          </>
        )}
      </div>

      {attachments.length > 0 && (
        <ul className="ml-22 space-y-1">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 truncate text-text" title={a.file_name}>
                {a.file_name}
              </span>
              <button
                type="button"
                aria-label={`Podgląd: ${a.file_name}`}
                onClick={() => void handleView(a.storage_path)}
                disabled={busy}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-surface px-2 py-0.5 font-semibold text-text-secondary transition-colors hover:bg-info-soft hover:text-info disabled:opacity-50"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Podgląd
              </button>
              <button
                type="button"
                aria-label={`Usuń załącznik: ${a.file_name}`}
                onClick={() => void handleRemove(a)}
                disabled={busy}
                className="flex shrink-0 items-center rounded-lg p-1 text-text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {full && <p className="ml-22 text-xs text-text-muted">Osiągnięto limit {MAX_LETTER_ATTACHMENTS} plików.</p>}
    </div>
  );
}

export default function LetterList({ refreshToken }: Readonly<LetterListProps>) {
  const { letters, editLetter, deleteLetter, fetchLetters, loading, getAttachments, downloadLetterArchive } =
    useLetters();
  const [qText, setQText] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edited, setEdited] = useState<Letter | null>(null);

  useEffect(() => {
    if (refreshToken !== undefined) void fetchLetters();
  }, [refreshToken, fetchLetters]);

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return letters;
    return letters.filter(
      (l) =>
        l.signature.toLowerCase().includes(t) ||
        l.recipient.toLowerCase().includes(t) ||
        l.description.toLowerCase().includes(t) ||
        (l.category_other ?? "").toLowerCase().includes(t)
    );
  }, [letters, qText]);

  const toggleOpen = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  const handleEdit = (letter: Letter) => {
    setEditingId(letter.id);
    setEdited({ ...letter });
    setOpenId(letter.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEdited(null);
  };

  const handleSaveEdit = async () => {
    if (!edited) return;
    await editLetter(edited.id, {
      issue_date: edited.issue_date,
      response_date: edited.response_date,
      recipient: edited.recipient,
      description: edited.description,
      license_plate_number: edited.license_plate_number,
      incident_date: edited.incident_date,
      incident_place: edited.incident_place,
    });
    setEditingId(null);
    setEdited(null);
  };

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-2xl">
        <SearchBar
          value={qText}
          onChange={setQText}
          placeholder="Szukaj po sygnaturze, adresacie, opisie..."
          className="w-full"
        />
      </div>

      <ul className="mx-auto w-full max-w-2xl space-y-4">
        {filtered.map((l) => {
          const open = openId === l.id;
          const isEditing = editingId === l.id;
          const editPrefix = `edit-letter-${l.id}`;
          const letterBody = open ? generateLetterBody(l) : "";

          if (isEditing && edited) {
            const isTrafficViolation = edited.category === "Wykroczenie drogowe";
            return (
              <li
                key={l.id}
                className="animate-in rounded-card border border-primary bg-card p-5 shadow-lg fade-in dark:border-primary"
              >
                <div className="space-y-4">
                  <p className="text-xs font-bold text-text-muted">
                    Sygnatura {edited.signature} - kategorii i sygnatury nie można zmienić po utworzeniu.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`${editPrefix}-issue`} className="form-label">
                        Data wystawienia:
                      </label>
                      <input
                        id={`${editPrefix}-issue`}
                        type="date"
                        value={edited.issue_date}
                        onChange={(e) => setEdited({ ...edited, issue_date: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${editPrefix}-response`} className="form-label">
                        Termin odpowiedzi:
                      </label>
                      <input
                        id={`${editPrefix}-response`}
                        type="date"
                        value={edited.response_date ?? ""}
                        onChange={(e) => setEdited({ ...edited, response_date: e.target.value || null })}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${editPrefix}-recipient`} className="form-label">
                      Adresat:
                    </label>
                    <input
                      id={`${editPrefix}-recipient`}
                      value={edited.recipient}
                      onChange={(e) => setEdited({ ...edited, recipient: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${editPrefix}-description`} className="form-label">
                      Opis:
                    </label>
                    <textarea
                      id={`${editPrefix}-description`}
                      value={edited.description}
                      onChange={(e) => setEdited({ ...edited, description: e.target.value })}
                      className="input-field"
                      rows={4}
                    />
                  </div>
                  {isTrafficViolation && (
                    <div>
                      <label htmlFor={`${editPrefix}-plate`} className="form-label">
                        Numer rejestracyjny:
                      </label>
                      <input
                        id={`${editPrefix}-plate`}
                        value={edited.license_plate_number ?? ""}
                        onChange={(e) => setEdited({ ...edited, license_plate_number: e.target.value.toUpperCase() })}
                        className="input-field uppercase"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`${editPrefix}-incident-date`} className="form-label">
                        Data zdarzenia:
                      </label>
                      <input
                        id={`${editPrefix}-incident-date`}
                        type="date"
                        value={edited.incident_date ?? ""}
                        onChange={(e) => setEdited({ ...edited, incident_date: e.target.value || null })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${editPrefix}-incident-place`} className="form-label">
                        Miejsce zdarzenia:
                      </label>
                      <input
                        id={`${editPrefix}-incident-place`}
                        value={edited.incident_place ?? ""}
                        onChange={(e) => setEdited({ ...edited, incident_place: e.target.value || null })}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <FormButtons onClickSave={handleSaveEdit} onClickClose={handleCancelEdit} loading={loading} />
                </div>
              </li>
            );
          }

          return (
            <li
              key={l.id}
              className="card group overflow-hidden shadow-sm transition-all duration-200 hover:border-primary"
            >
              <div className="flex items-center justify-between gap-2 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-text">{l.signature}</span>
                    <CopyButtonSmall text={l.signature} label="sygnaturę" />
                    <button
                      type="button"
                      onClick={() => void downloadLetterArchive(l)}
                      disabled={getAttachments(l.id, "letter").length + getAttachments(l.id, "response").length === 0}
                      aria-label={`Pobierz wszystkie pliki sygnatury ${l.signature} (ZIP)`}
                      className="flex items-center gap-1 rounded-lg bg-surface px-2 py-0.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" /> ZIP
                    </button>
                    <span className="rounded-lg border border-primary bg-info-soft px-2 py-0.5 text-xs font-semibold text-primary">
                      {l.category === "Inne" ? l.category_other : l.category}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-text-secondary">{l.recipient}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg bg-surface p-2 text-text-secondary transition-colors"
                  onClick={() => toggleOpen(l.id)}
                  aria-label={open ? "Zwiń" : "Rozwiń"}
                >
                  <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                </button>
              </div>

              {open && (
                <div className="space-y-4 border-t border-line bg-card px-4 pt-1 pb-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 text-sm">
                    <div>
                      <dt className="text-xs font-bold text-text-muted">Wystawiono</dt>
                      <dd className="text-text">{l.issue_date}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-text-muted">Termin odpowiedzi</dt>
                      <dd className="text-text">{l.response_date ?? "-"}</dd>
                    </div>
                    {l.license_plate_number && (
                      <div>
                        <dt className="text-xs font-bold text-text-muted">Nr rejestracyjny</dt>
                        <dd className="font-mono text-text">{l.license_plate_number}</dd>
                      </div>
                    )}
                    {l.incident_date && (
                      <div>
                        <dt className="text-xs font-bold text-text-muted">Data zdarzenia</dt>
                        <dd className="text-text">{l.incident_date}</dd>
                      </div>
                    )}
                    {l.incident_place && (
                      <div className="col-span-2">
                        <dt className="text-xs font-bold text-text-muted">Miejsce zdarzenia</dt>
                        <dd className="text-text">{l.incident_place}</dd>
                      </div>
                    )}
                  </dl>

                  {l.description && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-text-secondary">{l.description}</p>
                  )}

                  <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-text-muted">Treść (przykład)</span>
                      <CopyButtonSmall text={letterBody} label="treść pisma" />
                    </div>
                    <pre className="font-sans text-xs leading-relaxed whitespace-pre-wrap text-text-secondary">
                      {letterBody}
                    </pre>
                  </div>

                  <div className="space-y-2 border-y border-line py-2">
                    <AttachmentSlot
                      label="Pismo"
                      kind="letter"
                      letterId={l.id}
                      attachments={getAttachments(l.id, "letter")}
                    />
                    <AttachmentSlot
                      label="Odpowiedź"
                      kind="response"
                      letterId={l.id}
                      attachments={getAttachments(l.id, "response")}
                    />
                  </div>

                  <div className="flex w-full justify-end gap-1.5 pt-2">
                    <EditButton onClick={() => handleEdit(l)} />
                    <DeleteButton onClick={() => void deleteLetter(l.id)} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && <NoResultsState text="pism" isSearch={qText.trim().length > 0} />}
      </ul>
    </div>
  );
}
