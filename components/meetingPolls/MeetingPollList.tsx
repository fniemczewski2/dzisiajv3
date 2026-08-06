// components/meetingPolls/MeetingPollList.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useMeetingPolls } from "@/hooks/db/useMeetingPolls";
import { DeleteButton, CopyButtonSmall, ShowResultsButton } from "../ui/CommonButtons";
import NoResultsState from "../ui/NoResultsState";
import { effectivePollStatus } from "@/lib/meetingPollDeadline";
import { formatTime } from "@/lib/dateUtils";

interface MeetingPollListProps {
  refreshToken?: number;
}

export default function MeetingPollList({ refreshToken }: Readonly<MeetingPollListProps>) {
  const { polls, deletePoll, setPollStatus, fetchPolls } = useMeetingPolls();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (refreshToken !== undefined) void fetchPolls();
  }, [refreshToken, fetchPolls]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const sorted = useMemo(
    () => [...polls].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [polls]
  );

  if (sorted.length === 0) {
    return <NoResultsState text="ankiet" isSearch={false} />;
  }

  return (
    <ul className="space-y-3 max-w-2xl mx-auto w-full">
      {sorted.map((poll) => {
        const link = origin ? `${origin}/meet/${poll.share_token}` : "";
        // Ankieta po terminie jest zamknięta, nawet jeśli w bazie wisi jeszcze "open".
        const otwarta = effectivePollStatus(poll) === "open";
        return (
          <li key={poll.id} className="card rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-text truncate">{poll.title}</p>
                <p className="text-xs text-textMuted mt-0.5">
                  {poll.time_start.slice(0, 5)}-{poll.time_end.slice(0, 5)} •{" "}
                  {otwarta ? "Otwarta" : "Zamknięta"}
                </p>
                {otwarta && poll.closes_at && (
                  <p className="text-xs text-textMuted mt-0.5">
                    Zamknie się: {formatTime(poll.closes_at, true)}
                  </p>
                )}
              </div>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-primary border border-primary rounded-md text-[10px] font-semibold uppercase tracking-wider shrink-0">
                {poll.slot_duration_minutes} min
              </span>
            </div>

            {link && (
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs bg-surface px-2 py-1 rounded-lg truncate max-w-[16rem]">{link}</code>
                <CopyButtonSmall text={link} label="link do ankiety" />
              </div>
            )}

            <div className="flex items-center gap-2 justify-between pt-1">
                <ShowResultsButton href={`/meetings/${poll.id}`} />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void setPollStatus(poll.id, otwarta ? "closed" : "open")}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-primary text-primary hover:bg-blue-50 dark:hover:bg-blue-950"
                  >
                    {otwarta ? "Zamknij odpowiedzi" : "Otwórz ponownie"}
                  </button>
                  <DeleteButton onClick={() => void deletePoll(poll.id)} />
                </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}