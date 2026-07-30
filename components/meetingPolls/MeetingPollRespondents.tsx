// components/meetingPolls/MeetingPollRespondents.tsx

import React, { useMemo, useState } from "react";
import { Users, Mail, UserCheck, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { CopyButtonSmall } from "../ui/CommonButtons";
import type { MeetingPollResponseRow, MeetingPollAvailabilityRow } from "@/types/meetingPolls";

interface MeetingPollRespondentsProps {
  responses: MeetingPollResponseRow[];
  availabilities: MeetingPollAvailabilityRow[];
  slotDurationMinutes: number;
}

function formatSubmittedAt(value: string): string {
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export default function MeetingPollRespondents({
  responses,
  availabilities,
  slotDurationMinutes,
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
    <section className="card rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-bold text-text">
          <Users className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
          Użytkownicy ({responses.length})
        </h4>
          <button className="text-textSecondary" type='button' onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
      </div>

      {expanded && (
        <>
          <ul className="mt-3 divide-y divide-gray-200 dark:divide-gray-800">
            {sortedResponses.map((response) => {
              const slots = slotCountByResponse.get(response.id) ?? 0;
              return (
                <li key={response.id} className="py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium text-text">
                      {response.respondent_name}
                      {response.user_id && (
                        <UserCheck
                          className="w-4 h-4 text-primary flex-shrink-0"
                          aria-label="Uczestnik ma konto w aplikacji"
                        />
                      )}
                    </p>
                    {response.respondent_email && (
                      <p className="flex items-center gap-1.5 text-xs text-textSecondary break-all">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                        {response.respondent_email}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 items-center text-right text-xs text-textMuted whitespace-nowrap">
                    <Calendar className="w-4 h-4"/><p>{formatSubmittedAt(response.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {emails.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <span className="text-xs text-textMuted">
                Adresy e-mail ({emails.length}):
              </span>
              <CopyButtonSmall text={emails.join(", ")} label="adresy e-mail" />
            </div>
          )}
        </>
      )}
    </section>
  );
}
