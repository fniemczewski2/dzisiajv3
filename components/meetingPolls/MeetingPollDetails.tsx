// components/meetingPolls/MeetingPollDetails.tsx
//
// Strona wyników ankiety: dla ankiety zapisów widok zapisów, dla ankiety dostępności siatka wyników.

import React from "react";
import { useMeetingPolls } from "@/hooks/db/useMeetingPolls";
import MeetingPollResults from "./MeetingPollResults";
import MeetingPollBookings from "./MeetingPollBookings";
import { SkeletonSlotGrid } from "../ui/Skeleton";

export default function MeetingPollDetails({ pollId }: Readonly<{ pollId: string }>) {
  const { polls, fetching } = useMeetingPolls();
  const poll = polls.find((p) => p.id === pollId);
  if (!poll && fetching) return <SkeletonSlotGrid />;
  if (poll?.mode === "signup") return <MeetingPollBookings poll={poll} />;
  return <MeetingPollResults pollId={pollId} />;
}
