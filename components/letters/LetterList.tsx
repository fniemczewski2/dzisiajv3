// components/letters/LetterList.tsx

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Upload, Eye } from "lucide-react";
import { useLetters } from "@/hooks/db/useLetters";
import { EditButton, DeleteButton, FormButtons, CopyButtonSmall } from "../ui/CommonButtons";
import NoResultsState from "../ui/NoResultsState";
import SearchBar from "../ui/SearchBar";
import { generateLetterBody } from "@/lib/letterTemplates";
import type { Letter, LetterCategory, LetterFileKind } from "@/types/letters";

interface LetterListProps {
  refreshToken?: number;
}
export function FileSlot({
  label,
  path,
  letterId,
  category,
  kind,
}: Readonly<{ label: string; path: string | null; letterId: string; category: LetterCategory, kind: LetterFileKind }>) {
  const { uploadLetterFile, getLetterFileUrl } = useLetters();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await uploadLetterFile(letterId, category, kind, file);
    } finally {
      setBusy(false);
    }
  };

  const handleView = async () => {
    if (!path) return;
    // Open the tab synchronously, inside the click handler, before the
    // `await` below — browsers drop the "user activation" that permits
    // window.open() once an async gap (the signed-URL request) has passed,
    // so opening it after the await was silently blocked as a popup with no
    // error surfaced anywhere. Navigate the already-open tab once the URL
    // is ready instead.
    //
    // Must NOT pass "noopener"/"noreferrer" here: both make window.open()
    // return null instead of a window reference (that's the whole point of
    // those flags), which would make it impossible to navigate the tab
    // below — the previous version of this fix opened a tab that could
    // never be pointed anywhere. Null out `.opener` manually afterwards for
    // the same isolation, now that we still hold a usable reference.
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

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
      <span className="text-xs font-bold uppercase tracking-wide text-textMuted w-20 shrink-0">{label}:</span>
      {path ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleView}
            disabled={busy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 text-textSecondary hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Eye className="w-3.5 h-3.5" /> Podgląd
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surfaceHover text-textMuted hover:text-text text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Zamień
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-blue-50 dark:hover:bg-blue-900/20 text-textSecondary hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" /> Wgraj PDF
        </button>
      )}
    </div>
  );
}

export default function LetterList({ refreshToken }: Readonly<LetterListProps>) {
  const { letters, editLetter, deleteLetter, fetchLetters, loading } = useLetters();
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

  const handleCancelEdit = () => { setEditingId(null); setEdited(null); };

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
      <div className="max-w-2xl mx-auto w-full">
        <SearchBar
          value={qText}
          onChange={setQText}
          placeholder="Szukaj po sygnaturze, adresacie, opisie..."
          className="w-full"
        />
      </div>

      <ul className="space-y-4 max-w-2xl mx-auto w-full">
        {filtered.map((l) => {
          const open = openId === l.id;
          const isEditing = editingId === l.id;
          const editPrefix = `edit-letter-${l.id}`;
          // Only build the template text for the currently expanded letter —
          // no need to generate it for every collapsed row on each render.
          const letterBody = open ? generateLetterBody(l) : "";

          if (isEditing && edited) {
            const isTrafficViolation = edited.category === "Wykroczenie drogowe";
            return (
              <li key={l.id} className="bg-card border border-primary dark:border-primary rounded-2xl shadow-lg p-5 animate-in fade-in">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-textMuted">
                    Sygnatura {edited.signature} - kategorii i sygnatury nie można zmienić po utworzeniu.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`${editPrefix}-issue`} className="form-label">Data wystawienia:</label>
                      <input
                        id={`${editPrefix}-issue`}
                        type="date"
                        value={edited.issue_date}
                        onChange={(e) => setEdited({ ...edited, issue_date: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${editPrefix}-response`} className="form-label">Termin odpowiedzi:</label>
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
                    <label htmlFor={`${editPrefix}-recipient`} className="form-label">Adresat:</label>
                    <input
                      id={`${editPrefix}-recipient`}
                      value={edited.recipient}
                      onChange={(e) => setEdited({ ...edited, recipient: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${editPrefix}-description`} className="form-label">Opis:</label>
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
                      <label htmlFor={`${editPrefix}-plate`} className="form-label">Numer rejestracyjny:</label>
                      <input
                        id={`${editPrefix}-plate`}
                        value={edited.license_plate_number ?? ""}
                        onChange={(e) => setEdited({ ...edited, license_plate_number: e.target.value.toUpperCase() })}
                        className="input-field uppercase"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`${editPrefix}-incident-date`} className="form-label">Data zdarzenia:</label>
                      <input
                        id={`${editPrefix}-incident-date`}
                        type="date"
                        value={edited.incident_date ?? ""}
                        onChange={(e) => setEdited({ ...edited, incident_date: e.target.value || null })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${editPrefix}-incident-place`} className="form-label">Miejsce zdarzenia:</label>
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
            <li key={l.id} className="card rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:border-primary group">
              <div className="flex items-center justify-between p-4 gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-text">{l.signature}</span>
                    <CopyButtonSmall text={l.signature} label="sygnaturę" />
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-primary border border-primary rounded-md text-[10px] font-semibold uppercase tracking-wider">
                      {l.category === "Inne" ? l.category_other : l.category}
                    </span>
                  </div>
                  <p className="text-sm text-textSecondary mt-1 truncate">{l.recipient}</p>
                </div>
                <button
                  type='button'
                  className="p-2 bg-surface text-textSecondary rounded-lg transition-colors shrink-0"
                  onClick={() => toggleOpen(l.id)}
                  aria-label={open ? "Zwiń" : "Rozwiń"}
                >
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                </button>
              </div>

              {open && (
                <div className="px-4 pb-4 pt-1 bg-card border-t border-gray-100 dark:border-gray-800 space-y-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-3">
                    <div>
                      <dt className="text-[10px] font-bold text-textMuted uppercase tracking-widest">Wystawiono</dt>
                      <dd className="text-text">{l.issue_date}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold text-textMuted uppercase tracking-widest">Termin odpowiedzi</dt>
                      <dd className="text-text">{l.response_date ?? "-"}</dd>
                    </div>
                    {l.license_plate_number && (
                      <div>
                        <dt className="text-[10px] font-bold text-textMuted uppercase tracking-widest">Nr rejestracyjny</dt>
                        <dd className="text-text font-mono">{l.license_plate_number}</dd>
                      </div>
                    )}
                    {l.incident_date && (
                      <div>
                        <dt className="text-[10px] font-bold text-textMuted uppercase tracking-widest">Data zdarzenia</dt>
                        <dd className="text-text">{l.incident_date}</dd>
                      </div>
                    )}
                    {l.incident_place && (
                      <div className="col-span-2">
                        <dt className="text-[10px] font-bold text-textMuted uppercase tracking-widest">Miejsce zdarzenia</dt>
                        <dd className="text-text">{l.incident_place}</dd>
                      </div>
                    )}
                  </dl>

                  {l.description && (
                    <p className="text-sm text-textSecondary leading-relaxed whitespace-pre-wrap">{l.description}</p>
                  )}

                  <div className="bg-surface border border-gray-200 dark:border-gray-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-textMuted uppercase tracking-widest">
                        Treść (przykład)
                      </span>
                      <CopyButtonSmall text={letterBody} label="treść pisma" />
                    </div>
                    <pre className="text-xs text-textSecondary leading-relaxed whitespace-pre-wrap font-sans">
                      {letterBody}
                    </pre>
                  </div>

                  <div className="space-y-2 py-2 border-y border-gray-100 dark:border-gray-800">
                    <FileSlot label="Pismo" path={l.letter_file_path} letterId={l.id} category={l.category} kind="letter" />
                    <FileSlot label="Odpowiedź" path={l.response_file_path} letterId={l.id} category={l.category} kind="response" />
                  </div>

                  <div className="flex justify-end w-full gap-1.5 pt-2">
                    <EditButton onClick={() => handleEdit(l)} />
                    <DeleteButton onClick={() => void deleteLetter(l.id)} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <NoResultsState text="pism" isSearch={qText.trim().length > 0} />
        )}
      </ul>
    </div>
  );
}
