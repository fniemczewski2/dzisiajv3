// supabase/functions/process-reminders/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { verifyCronSecret, corsHeaders, jsonHeaders, unauthorized } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!verifyCronSecret(req)) {
    return unauthorized();
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Warsaw"
    }).format(new Date());

    const { data: reminders, error: fetchError } = await supabase
      .from("reminders")
      .select("*");

    if (fetchError) throw fetchError;

    const processed = [];

    for (const r of reminders || []) {
      if (!r.data_poczatkowa || !r.powtarzanie) continue;

      const referenceDateStr = r.done ? r.done : r.data_poczatkowa;

      const referenceDate = new Date(`${referenceDateStr}T00:00:00Z`);
      const nextExecutionDate = new Date(referenceDate);

      nextExecutionDate.setUTCDate(referenceDate.getUTCDate() + r.powtarzanie);
      const nextExecutionStr = nextExecutionDate.toISOString().split("T")[0];

      if (nextExecutionStr <= todayStr && r.done !== todayStr) {

        const { error: updError } = await supabase
          .from("reminders")
          .update({ done: todayStr })
          .eq("id", r.id);

        if (updError) {
          console.error(`Błąd aktualizacji przypomnienia ${r.id}:`, updError);
          continue;
        }

        const { error: insError } = await supabase.from("tasks").insert({
          title: r.tytul,
          due_date: todayStr,
          category: "cykliczne",
          priority: 1,
          user_id: r.user_id,
          for_user_id: r.user_id,
          status: "pending"
        });

        if (insError) {
          console.error(`Błąd tworzenia zadania dla przypomnienia ${r.id}:`, insError);
        } else {
          processed.push(r.tytul);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed_count: processed.length,
      processed_titles: processed
    }), {
      status: 200,
      headers: jsonHeaders,
    });

  } catch (err) {
    console.error("Krytyczny błąd w process-reminders:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
