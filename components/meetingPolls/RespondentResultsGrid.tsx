// components/meetingPolls/RespondentResultsGrid.tsx

import React, { useMemo } from "react";
import type { PublicMeetingPoll, RespondentPollResults } from "@/types/meetingPolls";
import { bestRanges, formatPollDay, generateTimeSlots, pluralPl, slotKey } from "@/lib/meetingPollGrid";

interface RespondentResultsGridProps {
  poll: PublicMeetingPoll;
  results: RespondentPollResults;
}

/**
 * Siatka wyników dla uczestnika: ten sam układ co u organizatora (dni × godziny, najlepsze przedziały),
 * tylko do odczytu i bez imion, adresów oraz akcji. Pokazuje wyłącznie liczby osób dla każdego terminu.
 */
export default function RespondentResultsGrid({ poll, results }: Readonly<RespondentResultsGridProps>) {
  const respondents = typeof results?.respondents === "number" ? results.respondents : 0;
  const slotList = useMemo(() => (Array.isArray(results?.slots) ? results.slots : []), [results]);

  const times = useMemo(
    () => generateTimeSlots(poll.time_start, poll.time_end, poll.slot_duration_minutes),
    [poll.time_start, poll.time_end, poll.slot_duration_minutes]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of slotList) map[slotKey(s.date, s.start_time)] = s.count;
    return map;
  }, [slotList]);

  const best = useMemo(
    () => bestRanges(poll.dates, times, poll.slot_duration_minutes, counts),
    [poll.dates, times, poll.slot_duration_minutes, counts]
  );

  return (
    <section aria-labelledby="respondent-results-heading" className="space-y-4 text-left">
      <h2 id="respondent-results-heading" className="section-title">
        Wyniki ankiety
      </h2>
      <p className="text-sm text-text-secondary">
        Odpowiedziało: {respondents} {pluralPl(respondents, "osoba", "osoby", "osób")}
      </p>

      {slotList.length === 0 ? (
        <p className="text-sm text-text-secondary">Nikt jeszcze nie zaznaczył terminów.</p>
      ) : (
        <>
          {best.ranges.length > 0 && (
            <div className="rounded-xl bg-surface p-3 text-sm">
              <p className="font-semibold text-text">
                Najwięcej osób ({best.count} z {respondents}):
              </p>
              <ul className="mt-1 space-y-1 text-text-secondary">
                {best.ranges.map((r) => {
                  const { weekday, day } = formatPollDay(r.date);
                  return (
                    <li key={`${r.date}-${r.startIndex}`}>
                      {weekday} {day}, {r.start}–{r.end}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="border-collapse text-xs">
              <caption className="sr-only">Liczba osób dostępnych w każdym terminie</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 bg-card p-1 text-left font-normal text-text-muted">
                    <span className="sr-only">Godzina</span>
                  </th>
                  {poll.dates.map((d) => {
                    const { weekday, day } = formatPollDay(d);
                    return (
                      <th scope="col" key={d} className="min-w-16 p-1 font-semibold text-text-muted">
                        {weekday}
                        <br />
                        {day}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {times.map((time) => (
                  <tr key={time}>
                    <th
                      scope="row"
                      className="sticky left-0 bg-card p-1 pr-2 text-left font-normal whitespace-nowrap text-text-muted"
                    >
                      {time}
                    </th>
                    {poll.dates.map((date) => {
                      const count = counts[slotKey(date, time)] ?? 0;
                      const intensity = respondents > 0 ? count / respondents : 0;
                      return (
                        <td key={date} className="h-8 w-14 border border-card bg-surface p-0 text-center">
                          <div className="relative flex h-full w-full items-center justify-center">
                            {count > 0 && (
                              <span
                                aria-hidden="true"
                                className="absolute inset-0 bg-primary"
                                style={{ opacity: 0.15 + 0.5 * intensity }}
                              />
                            )}
                            <span className="relative font-semibold text-text">
                              {count > 0 ? count : ""}
                              <span className="sr-only">
                                {" "}
                                {date}, {time}: {count} z {respondents} osób
                              </span>
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
