// pages/api/send-daily-summary.ts
import type { NextApiRequest, NextApiResponse } from "next";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

type Setting = { user_name: string; notification_times: string };

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  "https://dzisiajv3.vercel.app",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  // current time in HH:mm Warsaw
  const now = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  });

  // fetch only users with notifications on, typed as Setting[]
  const { data: users, error: usrErr } = await supabase
    .from("settings")
    .select("user_name,notification_times")
    .eq("notification_enabled", true);

  if (usrErr) {
    console.error("Failed to load settings:", usrErr);
    return res.status(500).end();
  }

  // annotate `t` so it's not any
  const activeUsers = (users ?? []).filter(({ notification_times }) =>
    notification_times
      .split(",")
      .map((t: string) => t.trim())
      .includes(now)
  );

  if (activeUsers.length === 0) {
    return res.status(200).json({ message: "No pushes at this minute" });
  }

  // fetch subscriptions only for those users
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_email,subscription")
    .in(
      "user_email",
      activeUsers.map((u) => u.user_name)
    );

  await Promise.all(
    (subs ?? []).map(async ({ user_email, subscription }) => {
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from("tasks")
        .select("id", { head: true, count: "exact" })
        .eq("status", "pending")
        .eq("due_date", today)
        .eq("user_name", user_email);

      const body = `Masz ${count} zadanie${
        count === 1 ? "" : "ń"
      } do zrobienia dziś.`;

      return webpush.sendNotification(
        subscription as any,
        JSON.stringify({
          title: "🗒️ Twoje zadania",
          body,
          url: "/tasks?filter=pending",
        })
      );
    })
  );

  res.status(200).json({ pushed: activeUsers.length });
}
