"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoveButton() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendLove = async () => {
    setLoading(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Brak sesji użytkownika");
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-love`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        console.error("Edge function error:", err);
      }

      setSent(true);
      setTimeout(() => setSent(false), 60000);

    } catch (error) {
      console.error("Error sending love:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={sendLove}
      disabled={loading}
      className={`p-2 text-white rounded-lg transition-colors ${
        loading
          ? "bg-pink-500"
          : "bg-pink-100 hover:bg-pink-300 active:bg-pink-800"
      }`}
    >
      {sent
        ? <Heart className="w-4 h-4" fill="#fff"/>
        : <Heart className="w-4 h-4"/>}
    </button>
  );
}
