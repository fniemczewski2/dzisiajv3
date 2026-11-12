// components/meetingPolls/MeetingPollBookings.tsx
//
// Widok organizatora ankiety zapisów: link do udostępnienia, zapisy pogrupowane według slotów (z zajętością),
// usuwanie zapisu i eksport CSV.

import React, { useMemo } from "react";
import { Users } from "lucide-react";
import { useOrigin } from "@/hooks/useIsClient";
import { useMeetingPollBookings } from "@/hooks/db/useMeetingPollBookings";
import { useToast } from "@/providers/ToastProvider";
import { bookingsToCsv, groupBookings } from "@/lib/meetingPollSignup";
import { downloadBlob, safeName } from "@/lib/letterArchive";
import { formatPollDay } from "@/lib/meetingPollGrid";
import type { MeetingPoll } from "@/types/meetingPolls";
import { CopyButtonSmall, DeleteButton, DownloadButton } from "../ui/CommonButtons";
import NoResultsState from "../ui/NoResultsState";
import { SkeletonList } from "../ui/Skeleton";

export default function MeetingPollBookings({ poll }: Readonly<{ poll: MeetingPoll }>) {
  const origin = useOrigin();
  const { toast } = useToast();
  const { bookings, loading, error, deleteBooking, deleting } = useMeetingPollBookings(poll.id);
  const groups = useMemo(
    () => groupBookings(bookings, poll.slot_duration_minutes),
    [bookings, poll.slot_duration_minutes]
  );
  const link = origin ? `${origin}/meet/${poll.share_token}` : "";

  const handleCsv = () => {
    const blob = new Blob([bookingsToCsv(bookings, poll.slot_duration_minutes)], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `zapisy-${safeName(poll.title, 60)}.csv`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!(await toast.confirm(`Usunąć zapis osoby ${name}? Miejsce zostanie zwolnione.`))) return;
    await deleteBooking(id).catch(() => undefined);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="page-title">{poll.title}</h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4" aria-hidden="true" />
            Zapisy: {poll.slot_capacity} {poll.slot_capacity === 1 ? "miejsce" : "miejsc"} w slocie, do{" "}
            {poll.max_slots_per_person} na osobę
          </span>
          <span>Zapisanych osób: {new Set(bookings.map((b) => b.email ?? b.name.toLowerCase())).size}</span>
          <span>Zajętych miejsc: {bookings.length}</span>
        </p>
        {link && (
          <div className="flex items-center gap-2 rounded-xl bg-surface p-2 pl-3">
            <code className="min-w-0 flex-1 truncate text-xs text-text-secondary">{link}</code>
            <CopyButtonSmall text={link} label="link do zapisów" />
          </div>
        )}
        {bookings.length > 0 && (
          <div className="flex justify-end">
            <DownloadButton onClick={handleCsv} fileFormat=".csv" />
          </div>
        )}
      </header>

      {loading && <SkeletonList count={4} variant="row" />}
      {!loading && error && (
        <p role="alert" className="text-sm text-danger">
          Nie udało się pobrać zapisów.
        </p>
      )}
      {!loading && !error && groups.length === 0 && (
        <NoResultsState text="zapisów" hint="Nikt jeszcze się nie zapisał. Udostępnij link uczestnikom." />
      )}

      <ul className="space-y-3">
        {groups.map((group) => {
          const { weekday, day } = formatPollDay(group.date);
          return (
            <li key={`${group.date}|${group.start_time}`} className="card space-y-2 p-4">
              <h2 className="text-sm font-semibold text-text">
                {weekday} {day}, {group.start_time}-{group.end_time}{" "}
                <span className="font-normal text-text-secondary">
                  ({group.bookings.length}/{poll.slot_capacity})
                </span>
              </h2>
              <ul className="divide-y divide-line">
                {group.bookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text">{b.name}</span>
                      {b.email && <span className="block truncate text-xs text-text-secondary">{b.email}</span>}
                    </span>
                    <DeleteButton
                      onClick={() => void handleDelete(b.id, b.name)}
                      small
                      disabled={deleting}
                      ariaLabel={`Usuń zapis ${b.name}`}
                    />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
