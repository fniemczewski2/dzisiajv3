// components/meetingPolls/MeetingPollList.tsx

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChartNoAxesCombined, Clock, ExternalLink, Hourglass, Link2, Timer } from "lucide-react";
import { useMeetingPolls } from "@/hooks/db/useMeetingPolls";
import { useAuth } from "@/providers/AuthProvider";
import { AddButton, DeleteButton, CopyButtonSmall, actionButton, actionIcon, ACTION_LABEL_CLASS } from "../ui/CommonButtons";
import NoResultsState from "../ui/NoResultsState";
import { effectivePollStatus } from "@/lib/meetingPollDeadline";
import { formatTime } from "@/lib/dateUtils";
import type { MeetingPoll } from "@/types/meetingPolls";

interface MeetingPollListProps {
  refreshToken?: number;
  onCreate?: () => void;
}

interface PollCounts {
  responses?: number;
  days?: number;
}

function pluralizeResponses(count: number): string {
  return count === 1 ? "odpowiedź" : "odpowiedzi";
}

function Meta({ icon: Icon, children }: Readonly<{ icon: React.ElementType; children: React.ReactNode }>) {
  return (
    <li className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
      <Icon aria-hidden="true" className="h-3.5 w-3.5 text-text-muted" />
      {children}
    </li>
  );
}

function PollCard({
  poll,
  open,
  counts,
  origin,
  onToggle,
  onDelete,
}: Readonly<{
  poll: MeetingPoll;
  open: boolean;
  counts?: PollCounts;
  origin: string;
  onToggle: () => void;
  onDelete: () => void;
}>) {
  const link = origin ? `${origin}/meet/${poll.share_token}` : "";
  const resultsHref = `/meetings/${poll.id}`;

  return (
    <li className="card max-w-none space-y-4 rounded-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <Link
            href={resultsHref}
            className="block truncate font-display text-lg font-bold text-text underline-offset-4 hover:text-primary hover:underline"
          >
            {poll.title}
          </Link>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {counts?.days !== undefined && (
              <Meta icon={CalendarDays}>
                {counts.days} {counts.days === 1 ? "dzień" : "dni"}
              </Meta>
            )}
            <Meta icon={Clock}>
              {poll.time_start.slice(0, 5)}–{poll.time_end.slice(0, 5)}
            </Meta>
            <Meta icon={Timer}>{poll.slot_duration_minutes} min</Meta>
            {open && poll.closes_at && <Meta icon={Hourglass}>do {formatTime(poll.closes_at, true)}</Meta>}
          </ul>
        </div>

        <div className="shrink-0 text-right">
          {counts?.responses !== undefined ? (
            <>
              <p className="font-display text-3xl font-bold leading-none text-text tabular-nums">{counts.responses}</p>
              <p className="mt-1 text-xs text-text-muted">{pluralizeResponses(counts.responses)}</p>
            </>
          ) : null}
        </div>
      </div>

      {link && (
        <div className="flex items-center gap-2 rounded-xl bg-surface p-2 pl-3">
          <Link2 aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />
          <code className="min-w-0 flex-1 truncate text-xs text-text-secondary">{link}</code>
          <CopyButtonSmall text={link} label="link do ankiety" />
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Otwórz ankietę w nowej karcie"
            title="Otwórz ankietę w nowej karcie"
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          className={actionButton({ color: "blue", size: "default" })}
          href={resultsHref}
          title="Pokaż wyniki ankiety"
        >
          <ChartNoAxesCombined aria-hidden="true" className={actionIcon(false)}  />
          <span className={ACTION_LABEL_CLASS}>Wyniki</span>
        </Link>
          <button
            type="button"
            onClick={onToggle}
            className={actionButton({ color: "blue", size: "default" })}
          >
            {open ? (
              <Clock aria-hidden="true" className={actionIcon(false)} />
            ) : (
              <Hourglass aria-hidden="true" className={actionIcon(false)} />
            )}
            <span className={ACTION_LABEL_CLASS}>{open ? "Zamknij" : "Otwórz"}</span>
          </button>
          <DeleteButton onClick={onDelete} />
      </div>
    </li>
  );
}

function PollSection({
  title,
  polls,
  ...card
}: Readonly<{
  title: string;
  polls: MeetingPoll[];
  open: boolean;
  counts: Record<string, PollCounts>;
  origin: string;
  onToggle: (poll: MeetingPoll, open: boolean) => void;
  onDelete: (poll: MeetingPoll) => void;
}>) {
  if (polls.length === 0) return null;
  const headingId = `polls-${card.open ? "open" : "closed"}`;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-sm font-semibold text-text-secondary">
        {title} ({polls.length})
      </h2>
      <ul className="space-y-3">
        {polls.map((poll) => (
          <PollCard
            key={poll.id}
            poll={poll}
            open={card.open}
            counts={card.counts[poll.id]}
            origin={card.origin}
            onToggle={() => card.onToggle(poll, card.open)}
            onDelete={() => card.onDelete(poll)}
          />
        ))}
      </ul>
    </section>
  );
}

export default function MeetingPollList({ refreshToken, onCreate }: Readonly<MeetingPollListProps>) {
  const { polls, deletePoll, setPollStatus, fetchPolls } = useMeetingPolls();
  const { supabase } = useAuth();
  const [origin, setOrigin] = useState("");
  const [counts, setCounts] = useState<Record<string, PollCounts>>({});

  useEffect(() => {
    if (refreshToken !== undefined) void fetchPolls();
  }, [refreshToken, fetchPolls]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const idsKey = useMemo(
    () => polls.map((p) => p.id).sort((a, b) => a.localeCompare(b)).join(","),
    [polls]
  );
  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(",");
    let cancelled = false;
    void (async () => {
      try {
        const [responses, days] = await Promise.all([
          supabase.from("meeting_poll_responses").select("poll_id").in("poll_id", ids),
          supabase.from("meeting_poll_dates").select("poll_id").in("poll_id", ids),
        ]);
        if (cancelled) return;
        const next: Record<string, PollCounts> = {};
        for (const id of ids) next[id] = {};
        const tally = (rows: { poll_id: string }[], field: keyof PollCounts) => {
          for (const id of ids) next[id][field] = 0;
          for (const row of rows) {
            const entry = next[row.poll_id];
            if (entry) entry[field] = (entry[field] ?? 0) + 1;
          }
        };
        if (!responses.error) tally((responses.data ?? []) as { poll_id: string }[], "responses");
        if (!days.error) tally((days.data ?? []) as { poll_id: string }[], "days");
        setCounts(next);
      } catch {
        /* liczby są opcjonalne */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey, supabase]);

  const { openPolls, closedPolls } = useMemo(() => {
    const sorted = [...polls].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return {
      openPolls: sorted.filter((p) => effectivePollStatus(p) === "open"),
      closedPolls: sorted.filter((p) => effectivePollStatus(p) !== "open"),
    };
  }, [polls]);

  if (polls.length === 0) {
    return (
      <NoResultsState
        text="ankiet"
        isSearch={false}
        hint="Utwórz ankietę, wyślij link i sprawdź, kiedy pasuje wszystkim."
        action={onCreate ? <AddButton onClick={onCreate} /> : undefined}
      />
    );
  }

  const handleToggle = (poll: MeetingPoll, open: boolean) => void setPollStatus(poll.id, open ? "closed" : "open");
  const handleDelete = (poll: MeetingPoll) => void deletePoll(poll.id);

  return (
    <div className="space-y-8">
      <PollSection
        title="Otwarte"
        polls={openPolls}
        open
        counts={counts}
        origin={origin}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
      <PollSection
        title="Zamknięte"
        polls={closedPolls}
        open={false}
        counts={counts}
        origin={origin}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
    </div>
  );
}
