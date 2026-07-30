// components/letters/LetterForm.tsx

import React, { useState, SyntheticEvent, useMemo } from "react";
import { useLetters, suggestResponseDate } from "@/hooks/db/useLetters";
import { FormButtons } from "../ui/CommonButtons";
import { getAppDate } from "@/lib/dateUtils";
import { LETTER_CATEGORIES, type LetterCategory, type LetterInsert } from "@/types/letters";

interface LetterFormProps {
  onChange: () => void;
  onCancel?: () => void;
}

export default function LetterForm({ onChange, onCancel }: Readonly<LetterFormProps>) {
  const { addLetter, loading } = useLetters();

  const today = useMemo(() => getAppDate(), []);

  const [category, setCategory] = useState<LetterCategory>("UDIP");
  const [categoryOther, setCategoryOther] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [responseDate, setResponseDate] = useState<string>(() => suggestResponseDate("UDIP", today) ?? "");
  const [responseDateTouched, setResponseDateTouched] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [description, setDescription] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentPlace, setIncidentPlace] = useState("");

  const isTrafficViolation = category === "Wykroczenie drogowe";
  const isOtherCategory = category === "Inne";

  const applyCategory = (next: LetterCategory) => {
    setCategory(next);
    if (!responseDateTouched) {
      setResponseDate(suggestResponseDate(next, issueDate) ?? "");
    }
  };

  const applyIssueDate = (next: string) => {
    setIssueDate(next);
    if (!responseDateTouched) {
      setResponseDate(suggestResponseDate(category, next) ?? "");
    }
  };

  const resetForm = () => {
    setCategory("UDIP");
    setCategoryOther("");
    setCategoryCode("");
    setIssueDate(today);
    setResponseDate(suggestResponseDate("UDIP", today) ?? "");
    setResponseDateTouched(false);
    setRecipient("");
    setDescription("");
    setLicensePlate("");
    setIncidentDate("");
    setIncidentPlace("");
  };

  const canSave =
    recipient.trim().length > 0 &&
    issueDate.length > 0 &&
    (!isOtherCategory || (categoryOther.trim().length > 0 && categoryCode.trim().length > 0));

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSave) return;

    const payload: LetterInsert = {
      category,
      category_other: isOtherCategory ? categoryOther.trim() : null,
      category_code: isOtherCategory ? categoryCode.trim().toUpperCase() : undefined,
      issue_date: issueDate,
      response_date: responseDate || null,
      recipient: recipient.trim(),
      description: description.trim(),
      license_plate_number: isTrafficViolation ? licensePlate.trim() || null : null,
      incident_date: incidentDate || null,
      incident_place: incidentPlace.trim() || null,
    };

    await addLetter(payload);
    resetForm();
    onChange();
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="form-card max-w-2xl">
      <div>
        <label htmlFor="lf-category" className="form-label">Kategoria:</label>
        <select
          id="lf-category"
          value={category}
          onChange={(e) => applyCategory(e.target.value as LetterCategory)}
          className="input-field"
          disabled={loading}
        >
          {LETTER_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {isOtherCategory && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <div>
            <label htmlFor="lf-cat-other" className="form-label">Nazwa kategorii:</label>
            <input
              id="lf-cat-other"
              value={categoryOther}
              onChange={(e) => setCategoryOther(e.target.value)}
              className="input-field"
              placeholder="np. Odwołanie"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label htmlFor="lf-cat-code" className="form-label">Kod (do sygnatury):</label>
            <input
              id="lf-cat-code"
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value.toUpperCase().slice(0, 3))}
              className="input-field uppercase sm:w-24"
              placeholder="np. OD"
              maxLength={3}
              disabled={loading}
              required
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="lf-issue-date" className="form-label">Data wystawienia:</label>
          <input
            id="lf-issue-date"
            type="date"
            value={issueDate}
            onChange={(e) => applyIssueDate(e.target.value)}
            className="input-field"
            disabled={loading}
            required
          />
        </div>
        <div>
          <label htmlFor="lf-response-date" className="form-label">
            Termin odpowiedzi{!isOtherCategory && !responseDateTouched && " (sugerowany)"}:
          </label>
          <input
            id="lf-response-date"
            type="date"
            value={responseDate}
            onChange={(e) => { setResponseDate(e.target.value); setResponseDateTouched(true); }}
            className="input-field"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="lf-recipient" className="form-label">Adresat:</label>
        <input
          id="lf-recipient"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="input-field"
          placeholder="np. Urząd Miasta w Warszawie"
          disabled={loading}
          required
        />
      </div>

      <div>
        <label htmlFor="lf-description" className="form-label">Opis:</label>
        <textarea
          id="lf-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field"
          rows={4}
          placeholder="Czego dotyczy pismo..."
          disabled={loading}
        />
      </div>

      {isTrafficViolation && (
        <div>
          <label htmlFor="lf-plate" className="form-label">Numer rejestracyjny:</label>
          <input
            id="lf-plate"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
            className="input-field uppercase"
            placeholder="np. WA 12345"
            disabled={loading}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="lf-incident-date" className="form-label">Data zdarzenia (opcjonalnie):</label>
          <input
            id="lf-incident-date"
            type="date"
            value={incidentDate}
            onChange={(e) => setIncidentDate(e.target.value)}
            className="input-field"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="lf-incident-place" className="form-label">Miejsce zdarzenia (opcjonalnie):</label>
          <input
            id="lf-incident-place"
            value={incidentPlace}
            onChange={(e) => setIncidentPlace(e.target.value)}
            className="input-field"
            placeholder="np. ul. Polna, Warszawa"
            disabled={loading}
          />
        </div>
      </div>

      <FormButtons
        onClickClose={() => onCancel?.()}
        loading={loading}
        disabled={!canSave}
      />
    </form>
  );
}
