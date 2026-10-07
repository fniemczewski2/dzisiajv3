// components/meetingPolls/MeetingPollRespondents.tsx

import React, { useMemo, useState } from "react";
import { Users, Mail, UserCheck, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { ACTION_LABEL_CLASS, actionButton, CopyButtonSmall } from "../ui/CommonButtons";
import { formatDurationMinutes } from "@/lib/meetingPollGrid";
import type { MeetingPollResponseRow, MeetingPollAvailabilityRow } from "@/types/meetingPolls";

interface MeetingPollRespondentsProps {
  responses: MeetingPollResponseRow[];
  availabilities: MeetingPollAvailabilityRow[];
  slotDurationMinutes: number;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

function formatSubmittedAt(value: string): string {
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]);
  return (letters.join("") || "?").toLocaleUpperCase("pl-PL");
}

function availabilitySummary(slots: number, slotDurationMinutes: number): string {
  return slots > 0
    ? `dostępność ${formatDurationMinutes(slots * slotDurationMinutes)}`
    : "brak zaznaczonych terminów";
}

export default function MeetingPollRespondents({
  responses,
  availabilities,
  slotDurationMinutes,
  selectedId = null,
  onSelect,
}: Readonly<MeetingPollRespondentsProps>) {
  const [expanded, setExpanded] = useState(true);

  const slotCountByResponse = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of availabilities) {
      map.set(a.response_id, (map.get(a.response_id) ?? 0) + 1);
    }
    return map;
  }, [availabilities]);

  const sortedResponses = useMemo(
    () => [...responses].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [responses]
  );

  const emails = useMemo(
    () => sortedResponses.map((r) => r.respondent_email).filter((e): e is string => Boolean(e)),
    [sortedResponses]
  );

  if (responses.length === 0) return null;

  return (
    <section className="card max-w-none rounded-card p-4 sm:p-5" aria-labelledby="respondents-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="respondents-heading" className="flex items-center gap-2 font-display text-lg font-bold text-text">
          <Users className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          Uczestnicy ({responses.length})
        </h2>
        <button
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface"
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="respondents-list"
          aria-label={expanded ? "Zwiń listę uczestników" : "Rozwiń listę uczestników"}
        >
          {expanded ? (
            <ChevronUp className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded && (
        <div id="respondents-list">
          <ul className="mt-3 space-y-2">
            {sortedResponses.map((response) => {
              const slots = slotCountByResponse.get(response.id) ?? 0;
              const isSelected = selectedId === response.id;
              return (
                <li
                  key={response.id}
                  className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border p-3 transition-colors ${
                    isSelected ? "border-primary/50 bg-primary/10" : "border-line bg-surface/50"
                  }`}
                >
                  <div className="flex min-w-0 items-center justify-between w-full gap-3">
                    <div className="min-w-0 w-[80%]">
                      <p className="flex items-center gap-1.5 font-semibold text-text">
                        <span className="truncate">{response.respondent_name}</span>
                        {response.user_id && (
                          <UserCheck
                            className="h-4 w-4 shrink-0 text-primary"
                            aria-label="Uczestnik ma konto w aplikacji"
                          />
                        )}
                      </p>
                      {response.respondent_email && (
                        <p className="flex items-center gap-1.5 break-all text-xs text-text-secondary">
                          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {response.respondent_email}
                        </p>
                      )}
                      <p className="text-xs text-text-muted">
                        Odpowiedź: {formatSubmittedAt(response.created_at)} • {availabilitySummary(slots, slotDurationMinutes)}
                      </p>
                    </div>
                  

                  {onSelect && (
                    <button
                      type="button"
                      onClick={() => onSelect(isSelected ? null : response.id)}
                      aria-pressed={isSelected}
                      className={actionButton({ color: "blue", size: "default" })}
                    >
                      {isSelected ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span className={ACTION_LABEL_CLASS}>{isSelected ? "Ukryj": "Pokaż"}</span>
                    </button>
                    
                  )}
                  </div>
                </li>
              );
            })}
          </ul>

          {emails.length > 0 && (
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
              <span className="text-xs text-text-muted">Adresy e-mail ({emails.length}):</span>
              <CopyButtonSmall text={emails.join(", ")} label="adresy e-mail" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
