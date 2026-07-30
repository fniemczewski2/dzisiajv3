import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function findUserByEmail(supabase: ReturnType<typeof createClient>, email: string) {
  const perPage = 1000;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) break;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Brak nagłówka Authorization");
    const jwt = authHeader.replace("Bearer ", "");

    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) throw new Error("Nieautoryzowany dostęp");

    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("users")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) throw settingsError;
    if (!settings) throw new Error("Nie znaleziono ustawień użytkownika");

    const rawRecipientList: string[] = settings.users ?? [];

    if (rawRecipientList.length === 0) {
      return new Response(JSON.stringify({ success: false, message: "Brak odbiorców" }), { headers: corsHeaders });
    }
    const firstEmail = rawRecipientList[0].trim().toLowerCase();

    const targetUser = await findUserByEmail(supabase, firstEmail);

    if (!targetUser) {
      console.error("Nie znaleziono użytkownika o e-mailu:", firstEmail);
      return new Response(
        JSON.stringify({ success: false, message: `Brak konta dla: ${firstEmail}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUserId = targetUser.id;

    const title = "Kocham Cię ❤️";
    const message = "Ktoś przesyła Ci dużo miłości! ❤️❤️❤️";

    const { error: insertError } = await supabase.from("notifications").insert({
      user_id: targetUserId,
      type: "love_message",
      title,
      message,
      data: { sender_id: user.id },
    });

    if (insertError) throw new Error("Błąd zapisu notyfikacji: " + insertError.message);

    const pushRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: targetUserId,
          title,
          message,
          url: "/",
          data: { type: "love_message", from: user.id },
        }),
      }
    );

    if (!pushRes.ok) {
      console.error("[send-love] send-push failed:", await pushRes.text());
    }

    await supabase
      .channel(`love_channel_${targetUserId}`)
      .send({
        type: "broadcast",
        event: "love_received",
        payload: { message: "Ktoś przesłał Ci serduszko!" },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Wysłano do pierwszego odbiorcy",
        sentTo: firstEmail,
        targetId: targetUserId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Błąd funkcji send-love:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
