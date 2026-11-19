// components/transport/AddTrainWidget.tsx

import React, { useState } from "react";
import { ScanLine, Upload } from "lucide-react";
import { CancelButton, SaveButton } from "../ui/CommonButtons";
import { useTicketUpload } from "@/lib/trainTicketUtils";
import { TicketFormData } from "@/types/transport";

interface AddTrainWidgetProps {
  onTrainAdded: (train: TicketFormData) => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  /** Edycja istniejącego wpisu (np. biletu z poczty): wartości początkowe, bez wczytywania PDF. */
  initial?: TicketFormData;
  /** Prefiks identyfikatorów pól – kilka formularzy na jednej stronie. */
  idPrefix?: string;
}

const EMPTY: TicketFormData = {
  trainNumber: "",
  trainName: "",
  date: "",
  departureTime: "",
  from: "",
  to: "",
  wagon: "",
  seat: "",
};

export default function AddTrainForm({
  onTrainAdded,
  expanded,
  setExpanded,
  initial,
  idPrefix = "",
}: Readonly<AddTrainWidgetProps>) {
  const [formData, setFormData] = useState<TicketFormData>(initial ?? EMPTY);
  const isEdit = Boolean(initial);

  const { handleFileUpload, loading, missingFromTicket, clearTicketReview } = useTicketUpload({
    setFormData,
    setExpanded,
  });

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    onTrainAdded(formData);
    clearTicketReview();
    setFormData(initial ?? EMPTY);
    setExpanded(false);
  };

  if (!expanded) return null;

  return (
    <>
      {expanded && (
        <form onSubmit={handleSubmit} className="form-card" aria-busy={loading}>
          {missingFromTicket && (
            <output className="flex gap-3 rounded-xl border border-info-line bg-info-soft p-3 text-sm text-info">
              <ScanLine aria-hidden="true" className="h-5 w-5 shrink-0" />
              <div className="space-y-0.5">
                <p className="font-semibold">Dane odczytane automatycznie z biletu</p>
                <p className="text-info">
                  {missingFromTicket.length > 0
                    ? `Nie rozpoznano: ${missingFromTicket.join(", ")}. Uzupełnij je i sprawdź pozostałe pola przed zapisem.`
                    : "Sprawdź, czy wszystkie pola się zgadzają, zanim zapiszesz pociąg."}
                </p>
              </div>
            </output>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${idPrefix}trainNumber`} className="form-label">
                Nr pociągu
              </label>
              <input
                id={`${idPrefix}trainNumber`}
                type="text"
                value={formData.trainNumber}
                onChange={(e) => setFormData({ ...formData, trainNumber: e.target.value })}
                className="input-field w-full py-1.5"
                required
                placeholder="2137"
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}trainName`} className="form-label">
                Nazwa pociągu
              </label>
              <input
                id={`${idPrefix}trainName`}
                type="text"
                value={formData.trainName}
                onChange={(e) => setFormData({ ...formData, trainName: e.target.value })}
                className="input-field w-full py-1.5"
                required
                placeholder="Przemyślanin"
              />
            </div>
          </div>
          <div>
            <label htmlFor={`${idPrefix}trainDate`} className="form-label">
              Data i czas
            </label>
            <div className="flex gap-2">
              <input
                id={`${idPrefix}trainDate`}
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field w-full py-1.5"
                required
              />
              <input
                type="time"
                aria-label="Godzina odjazdu"
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                className="input-field w-24 py-1.5"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${idPrefix}stationFrom`} className="form-label">
                Stacja początkowa
              </label>
              <input
                id={`${idPrefix}stationFrom`}
                type="text"
                value={formData.from}
                onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                className="input-field w-full py-1.5"
                placeholder="np. Poznań Gł."
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}stationTo`} className="form-label">
                Stacja końcowa
              </label>
              <input
                id={`${idPrefix}stationTo`}
                type="text"
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                className="input-field w-full py-1.5"
                placeholder="np. Warszawa Centr."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${idPrefix}trainWagon`} className="form-label">
                Wagon
              </label>
              <input
                id={`${idPrefix}trainWagon`}
                type="text"
                value={formData.wagon}
                onChange={(e) => setFormData({ ...formData, wagon: e.target.value })}
                className="input-field w-full py-1.5"
                placeholder="13"
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}trainSeat`} className="form-label">
                Miejsce
              </label>
              <input
                id={`${idPrefix}trainSeat`}
                type="text"
                value={formData.seat}
                onChange={(e) => setFormData({ ...formData, seat: e.target.value })}
                className="input-field w-full py-1.5"
                placeholder="51"
              />
            </div>
          </div>

          <div className="mt-2 flex flex-col items-center justify-end gap-3 border-t border-line md:flex-row">
            <CancelButton
              onClick={() => {
                clearTicketReview();
                setExpanded(false);
              }}
            />
            {!isEdit && (
              <label
                className={`flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 md:flex-1`}
              >
                .pdf
                <Upload aria-hidden="true" className="h-4 w-4 text-text-secondary" />
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="hidden"
                />
              </label>
            )}

            <SaveButton disabled={loading} />
          </div>
        </form>
      )}
    </>
  );
}
