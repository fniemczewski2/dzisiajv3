// pages/api/meeting-polls/[id]/finalize.ts

import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateTimeSlots } from "@/lib/meetingPollGrid";
import { validateFinalizeSlot, type FinalizeSlotValidated } from "@/lib/sanitize";
import type { FinalizeRequest, FinalizeResponse, FinalizeResultSlot } from "@/types/meetingPolls";
import { mapPool } from "@/lib/asyncPool";

const MAX_SLOTS_PER_FINALIZE = 20;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

interface FinalizeContext {
  user: { id: string };
  supabase: ReturnType<typeof createServerSupabase>;
  poll: { id: string; user_id: string; title: string; slot_duration_minutes: number };
  slots: FinalizeSlotValidated[];
  responses: { id: string; user_id: string | null }[];
  availabilitySet: Set<string>;
}

/**
 * Loads and validates everything finalize needs, replying with the
 * appropriate error status itself and returning null on any failure - this
 * is what used to be a long chain of sequential `if (...) return res...`
 * checks directly in the handler.
 */
async function loadFinalizeContext(req: NextApiRequest, res: NextApiResponse): Promise<FinalizeContext | null> {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "Brak id ankiety." });
    return null;
  }

  const supabase = createServerSupabase(req, res);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    res.status(401).json({ error: "Brak autoryzacji." });
    return null;
  }

  const { data: poll, error: pollError } = await supabase
    .from("meeting_polls")
    .select("id, user_id, title, slot_duration_minutes")
    .eq("id", id)
    .maybeSingle();
  if (pollError || !poll) {
    res.status(404).json({ error: "Ankieta nie istnieje." });
    return null;
  }
  if (poll.user_id !== user.id) {
    res.status(403).json({ error: "To nie Twoja ankieta." });
    return null;
  }

  const body = req.body as Partial<FinalizeRequest> | undefined;
  const rawSlots = Array.isArray(body?.slots) ? body.slots : [];
  if (rawSlots.length === 0) {
    res.status(400).json({ error: "Podaj przynajmniej jeden termin do finalizacji." });
    return null;
  }
  if (rawSlots.length > MAX_SLOTS_PER_FINALIZE) {
    res.status(400).json({ error: "Zbyt wiele terminów w jednej finalizacji." });
    return null;
  }

  const validatedSlots = rawSlots.map(validateFinalizeSlot);
  if (validatedSlots.includes(null)) {
    res.status(400).json({ error: "Nieprawidłowy format jednego z terminów." });
    return null;
  }
  const slots = validatedSlots as NonNullable<(typeof validatedSlots)[number]>[];

  const { data: responses, error: responsesError } = await supabase
    .from("meeting_poll_responses")
    .select("id, user_id")
    .eq("poll_id", poll.id);
  if (responsesError) {
    res.status(500).json({ error: "Błąd pobierania odpowiedzi." });
    return null;
  }

  const responseIds = (responses ?? []).map((r) => r.id);
  const { data: availabilities, error: availError } =
    responseIds.length > 0
      ? await supabase
          .from("meeting_poll_availabilities")
          .select("response_id, date, start_time")
          .in("response_id", responseIds)
      : { data: [], error: null };
  if (availError) {
    res.status(500).json({ error: "Błąd pobierania dostępności." });
    return null;
  }

  const availabilitySet = new Set(
    (availabilities ?? []).map((a) => `${a.response_id}|${a.date}|${(a.start_time as string).slice(0, 5)}`)
  );

  return { user, supabase, poll, slots, responses: responses ?? [], availabilitySet };
}

/** Id wydarzeń utworzonych w tym wywołaniu – do wycofania przy błędzie. */
type CreatedEvents = string[];

async function inviteParticipants(
  ctx: FinalizeContext,
  slot: FinalizeSlotValidated,
  title: string,
  created: CreatedEvents
): Promise<number> {
  const requiredTimes = generateTimeSlots(slot.start_time, slot.end_time, ctx.poll.slot_duration_minutes);
  let invitedParticipants = 0;

  await mapPool(ctx.responses, 5, async (response) => {
    if (!response.user_id || response.user_id === ctx.user.id) return;

    const isFullyAvailable = requiredTimes.every((t) =>
      ctx.availabilitySet.has(`${response.id}|${slot.date}|${t}`)
    );
    if (!isFullyAvailable) return;

    const { data: participantEvent, error: participantEventError } = await supabaseAdmin
      .from("events")
      .insert({
        user_id: response.user_id,
        title,
        description: `Ustalone na podstawie ankiety „${ctx.poll.title}".`,
        start_time: `${slot.date}T${slot.start_time}:00`,
        end_time: `${slot.date}T${slot.end_time}:00`,
        place: slot.place ?? "",
        repeat: "none",
      })
      .select("id")
      .single();

    if (!participantEventError && participantEvent) {
      created.push(participantEvent.id as string);
      invitedParticipants++;
    }
  });
  return invitedParticipants;
}

async function finalizeOneSlot(
  ctx: FinalizeContext,
  slot: FinalizeSlotValidated,
  created: CreatedEvents
): Promise<{ error: string } | { slot: FinalizeResultSlot }> {
  const title = slot.title?.trim() || ctx.poll.title;

  const { data: organizerEvent, error: organizerEventError } = await ctx.supabase
    .from("events")
    .insert({
      user_id: ctx.user.id,
      title,
      description: `Ustalone na podstawie ankiety „${ctx.poll.title}".`,
      start_time: `${slot.date}T${slot.start_time}:00`,
      end_time: `${slot.date}T${slot.end_time}:00`,
      place: slot.place ?? "",
      repeat: "none",
    })
    .select("id")
    .single();

  if (organizerEventError || !organizerEvent) {
    return { error: `Błąd tworzenia wydarzenia dla terminu ${slot.date} ${slot.start_time}.` };
  }

  created.push(organizerEvent.id as string);
  const invitedParticipants = await inviteParticipants(ctx, slot, title, created);

  return {
    slot: {
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      organizerEventId: organizerEvent.id,
      invitedParticipants,
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Metoda niedozwolona." });

  const ctx = await loadFinalizeContext(req, res);
  if (!ctx) return;

  const { data: claimed, error: claimError } = await ctx.supabase
    .from("meeting_polls")
    .update({ finalized_at: new Date().toISOString() })
    .eq("id", ctx.poll.id)
    .eq("user_id", ctx.user.id)
    .is("finalized_at", null)
    .select("id");
  if (claimError) {
    console.error("[meeting-polls/finalize] claim:", claimError.message);
    return res.status(500).json({ error: "Błąd finalizacji ankiety." });
  }
  if (!claimed || claimed.length === 0) {
    return res.status(409).json({ error: "Ta ankieta została już sfinalizowana." });
  }

  const created: CreatedEvents = [];
  const results: FinalizeResultSlot[] = [];
  let failure: string | null = null;
  for (const slot of ctx.slots) {
    const outcome = await finalizeOneSlot(ctx, slot, created); // NOSONAR
    if ("error" in outcome) {
      failure = outcome.error;
      break;
    }
    results.push(outcome.slot);
  }

  if (failure !== null) {
    if (created.length > 0) {
      await supabaseAdmin.from("events").delete().in("id", created);
    }
    await ctx.supabase.from("meeting_polls").update({ finalized_at: null }).eq("id", ctx.poll.id);
    return res.status(500).json({ error: failure });
  }

  const response: FinalizeResponse = { results };
  return res.status(200).json(response);
}
