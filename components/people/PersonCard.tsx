// components/people/PersonCard.tsx

import { buildVCard } from "@/lib/vcard";
import React, { useState } from "react";
import { Phone, Mail, CheckCircle2, Clock, ChevronDown, ChevronUp, Cake, Gift } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Person } from "@/types/people";
import { EditButton, DeleteButton, ShareButton, CloseButton } from "../ui/CommonButtons";
import Modal from "../ui/Modal";

interface PersonCardProps {
  person: Person;
  onEdit: () => void;
  onDelete: () => void;
  onLogContact: () => void;
}

export const PersonCard = ({ person, onEdit, onDelete, onLogContact }: PersonCardProps) => {
  const [showQR, setShowQR] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const getVCardData = () =>
    buildVCard({
      fullName: [person.first_name, person.last_name].filter(Boolean).join(" "),
      familyName: person.last_name ?? "",
      givenName: person.first_name ?? "",
      phones: (person.phones ?? []).map((number) => ({ type: "CELL", number })),
      emails: (person.emails ?? []).map((email) => ({ type: "HOME", email })),
    });

  return (
    <>
      <div className="card relative flex flex-col rounded-xl p-4 shadow-sm transition-all">
        <div className="flex cursor-pointer items-center justify-between select-none">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-text">
              {person.first_name} {person.last_name}
            </h3>
            {isExpanded && person.relationship && <p className="text-sm text-primary">{person.relationship}</p>}
          </div>

          <button
            className="text-text-secondary"
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {isExpanded && (
          <div className="flex animate-in flex-col gap-3 border-t border-line pt-4 duration-200 fade-in slide-in-from-top-2">
            <div className="flex items-start justify-between">
              {person.last_contact_date && person.priority > 0 && person.priority < 5 && (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-info" />
                  {new Date(person.last_contact_date).toLocaleString("pl-PL", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              <div className="flex gap-1">
                <button
                  onClick={onLogContact}
                  type="button"
                  className="flex-1 flex-col items-center justify-center rounded-lg border border-success-line bg-success-soft p-1.5 text-success transition-colors hover:bg-success-soft sm:p-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <ShareButton onClick={() => setShowQR(true)} small />
                <EditButton onClick={onEdit} small />
                <DeleteButton onClick={onDelete} small />
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-2">
              {person.phones?.map((phone, _i) => (
                <a
                  key={phone}
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 text-sm text-info hover:underline"
                >
                  <Phone className="h-4 w-4" /> {phone}
                </a>
              ))}
              {person.emails?.map((email, _i) => (
                <a
                  key={email}
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 text-sm text-info hover:underline"
                >
                  <Mail className="h-4 w-4" /> {email}
                </a>
              ))}
            </div>

            {person.birthday && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Cake className="h-4 w-4 text-deco-violet" />
                {new Date(person.birthday).toLocaleDateString("pl-PL")}
              </div>
            )}

            {person.nameday && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Gift className="h-4 w-4 text-deco-violet" />
                {new Date(person.nameday).toLocaleDateString("pl-PL")}
              </div>
            )}

            {person.notes && (
              <p className="mt-2 border-t border-line pt-2 text-sm text-text-secondary italic">{person.notes}</p>
            )}
          </div>
        )}
      </div>

      <Modal open={showQR} onClose={() => setShowQR(false)} labelledBy="person-qr-modal-title">
        <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-card border border-line bg-surface p-6 shadow-xl">
          <h3 id="person-qr-modal-title" className="text-center text-lg font-bold text-text">
            Zeskanuj kod
          </h3>

          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={getVCardData()} size={220} level="M" />
          </div>

          <CloseButton onClick={() => setShowQR(false)} />
        </div>
      </Modal>
    </>
  );
};
