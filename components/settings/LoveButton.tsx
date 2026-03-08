"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../providers/AuthProvider";

export default function LoveButton() {
  const { user, supabase } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendLove = async () => {
    if (!user) {
      console.error("Brak zalogowanego użytkownika");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Nie można pobrać tokena dostępu");
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-love`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Edge function error:", errorData);
        return;
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
      disabled={loading || sent}
      className={`p-2.5 rounded-xl transition-colors border shadow-sm ${
        sent || loading
          ? "bg-pink-500 border-pink-500 text-white shadow-pink-500/20"
          : "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-900/50 hover:bg-pink-100 dark:hover:bg-pink-900/40 text-pink-500 dark:text-pink-400"
      }`}
      title="Wyślij serduszko twórcy <3"
    >
      <Heart 
        className={`w-5 h-5 ${sent ? "animate-pulse" : ""}`} 
        fill={sent ? "#fff" : "none"} 
      />
    </button>
  );
}