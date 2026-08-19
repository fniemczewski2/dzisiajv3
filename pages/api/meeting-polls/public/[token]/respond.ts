// pages/api/meeting-polls/public/[token]/respond.ts

import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { buildAllowedSlotSet, slotKey } from "@/lib/meetingPollGrid";
import { checkRateLimit, clientIp } from "@/lib/server/rateLimit";
import { validateEmail, validateSlot } from "@/lib/sanitize";
import type {
  MeetingPollResponsePayload,
  MeetingPollResponseSubmitResult,
  MeetingPollSlot,
} from "@/types/meetingPolls";

const MAX_RESPONDENT_NAME_LENGTH = 100;
const MAX_SLOTS_PER_RESPONSE = 500;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

type ValidatedSlot = NonNullable<ReturnType<typeof validateSlot>>;

interface PollForResponse {
  id: string;
  status: string;
  slot_duration_minutes: number;
  time_start: string;
  time_end: string;
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, token: string) {
  const editToken = req.query.edit_token;
  if (!editToken || typeof editToken !== "string") {
    return res.status(400).json({ error: "Brak tokenu edycji." });
  }

  const { data: poll } = await supabaseAdmin
    .from("meeting_polls")
    .select("id")
    .eq("share_token", token)
    .maybeSingle();
  if (!poll) return res.status(404).json({ error: "Ankieta nie istnieje." });

  const { data: existing } = await supabaseAdmin
    .from("meeting_poll_responses")
    .select("id, respondent_name, respondent_email")
    .eq("poll_id", poll.id)
    .eq("edit_token", editToken)
    .maybeSingle();
  if (!existing) return res.status(404).json({ error: "Nie znaleziono odpowiedzi." });

  const { data: availRows } = await supabaseAdmin
    .from("meeting_poll_availabilities")
    .select("date, start_time")
    .eq("response_id", existing.id);

  const slots: MeetingPollSlot[] = (availRows ?? []).map((a) => ({
    date: a.date,
    start_time: (a.start_time as string).slice(0, 5),
  }));

  return res.status(200).json({
    respondent_name: existing.respondent_name,
    respondent_email: existing.respondent_email,
    slots,
  });
}

interface ValidatedResponsePayload {
  respondentName: string;
  respondentEmail: string | null;
  slots: ValidatedSlot[];
  editToken?: string;
}

function validateResponsePayload(
  body: Partial<MeetingPollResponsePayload> | undefined
): ValidatedResponsePayload | { error: string } {
  const respondentName = body?.respondent_name?.trim();
  const editToken = typeof body?.edit_token === "string" ? body.edit_token : undefined;

  const rawEmail = body?.respondent_email;
  const respondentEmail = rawEmail == null || rawEmail === "" ? null : validateEmail(rawEmail);
  if (rawEmail && !respondentEmail) return { error: "Podaj poprawny adres e-mail." };

  const rawSlots = (Array.isArray(body?.slots) ? body.slots : []).map(validateSlot);
  if (rawSlots.includes(null)) return { error: "Nieprawidłowy format terminu." };
  const slots = rawSlots as ValidatedSlot[];

  if (!respondentName || respondentName.length > MAX_RESPONDENT_NAME_LENGTH) {
    return { error: "Podaj poprawne imię (do 100 znaków)." };
  }
  if (slots.length === 0) return { error: "Zaznacz przynajmniej jeden dostępny termin." };
  if (slots.length > MAX_SLOTS_PER_RESPONSE) return { error: "Zbyt wiele zaznaczonych terminów." };

  return { respondentName, respondentEmail, slots, editToken };
}

async function loadOpenPoll(token: string): Promise<{ poll: PollForResponse } | { error: string; status: number }> {
  const { data: poll, error: pollError } = await supabaseAdmin
    .from("meeting_polls")
    .select("id, status, slot_duration_minutes, time_start, time_end")
    .eq("share_token", token)
    .maybeSingle();

  if (pollError || !poll) return { error: "Ankieta nie istnieje.", status: 404 };
  if (poll.status !== "open") return { error: "Ta ankieta nie przyjmuje już odpowiedzi.", status: 409 };
  return { poll };
}

async function ensureSlotsMatchGrid(poll: PollForResponse, slots: ValidatedSlot[]): Promise<{ error: string } | null> {
  const { data: dateRows, error: datesError } = await supabaseAdmin
    .from("meeting_poll_dates")
    .select("date")
    .eq("poll_id", poll.id);
  if (datesError) return { error: "Błąd walidacji terminów ankiety." };

  const allowed = buildAllowedSlotSet(
    (dateRows ?? []).map((d) => d.date as string),
    poll.time_start,
    poll.time_end,
    poll.slot_duration_minutes
  );
  const hasInvalidSlot = slots.some((s) => !allowed.has(slotKey(s?.date || "", s?.start_time || "")));
  if (hasInvalidSlot) return { error: "Co najmniej jeden zaznaczony termin jest spoza siatki ankiety." };
  return null;
}

async function resolveSessionUserId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  try {
    const sessionClient = createServerSupabase(req, res);
    const { data: { user } } = await sessionClient.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function upsertResponseRecord(
  pollId: string,
  editToken: string | undefined,
  respondentName: string,
  respondentEmail: string | null,
  sessionUserId: string | null
): Promise<{ responseId: string; responseEditToken: string } | { error: string; status: number }> {
  if (editToken) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("meeting_poll_responses")
      .select("id")
      .eq("poll_id", pollId)
      .eq("edit_token", editToken)
      .maybeSingle();
    if (existingError || !existing) return { error: "Nieprawidłowy token edycji odpowiedzi.", status: 403 };

    const { error: updateError } = await supabaseAdmin
      .from("meeting_poll_responses")
      .update({ respondent_name: respondentName, respondent_email: respondentEmail, user_id: sessionUserId })
      .eq("id", existing.id);
    if (updateError) return { error: "Błąd zapisu odpowiedzi.", status: 500 };

    const { error: deleteError } = await supabaseAdmin
      .from("meeting_poll_availabilities")
      .delete()
      .eq("response_id", existing.id);
    if (deleteError) return { error: "Błąd aktualizacji dostępności.", status: 500 };

    return { responseId: existing.id, responseEditToken: editToken };
  }

  const newEditToken = crypto.randomUUID();
  const { data: created, error: insertError } = await supabaseAdmin
    .from("meeting_poll_responses")
    .insert({
      poll_id: pollId,
      respondent_name: respondentName,
      respondent_email: respondentEmail,
      user_id: sessionUserId,
      edit_token: newEditToken,
    })
    .select("id")
    .single();

  if (insertError || !created) return { error: "Błąd zapisu odpowiedzi.", status: 500 };
  return { responseId: created.id, responseEditToken: newEditToken };
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, token: string) {
  const body = req.body as Partial<MeetingPollResponsePayload> | undefined;
  const validated = validateResponsePayload(body);
  if ("error" in validated) return res.status(400).json({ error: validated.error });
  const { respondentName, respondentEmail, slots, editToken } = validated;

  const pollResult = await loadOpenPoll(token);
  if ("error" in pollResult) return res.status(pollResult.status).json({ error: pollResult.error });
  const { poll } = pollResult;

  const gridError = await ensureSlotsMatchGrid(poll, slots);
  if (gridError) return res.status(400).json({ error: gridError.error });

  const sessionUserId = await resolveSessionUserId(req, res);

  const upsertResult = await upsertResponseRecord(poll.id, editToken, respondentName, respondentEmail, sessionUserId);
  if ("error" in upsertResult) return res.status(upsertResult.status).json({ error: upsertResult.error });
  const { responseId, responseEditToken } = upsertResult;

  const rows = slots.map((s) => ({
    response_id: responseId,
    date: s?.date,
    start_time: s?.start_time,
  }));

  const { error: availError } = await supabaseAdmin.from("meeting_poll_availabilities").insert(rows);
  if (availError) {
    if (!editToken) {
      await supabaseAdmin.from("meeting_poll_responses").delete().eq("id", responseId);
    }
    return res.status(500).json({ error: "Błąd zapisu dostępności." });
  }

  const result: MeetingPollResponseSubmitResult = { edit_token: responseEditToken };
  return res.status(200).json(result);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Brak tokenu ankiety." });
  }

  if (req.method === "POST") {
    if (!checkRateLimit(`poll:${token}:${clientIp(req)}`, 5, 10 * 60_000)) {
      res.setHeader("Retry-After", "600");
      return res.status(429).json({ error: "Zbyt wiele odpowiedzi. Spróbuj ponownie za kilka minut." });
    }
    return handlePost(req, res, token);
  }

  if (req.method === "GET") return handleGet(req, res, token);
  return res.status(405).json({ error: "Method not allowed" });
}
