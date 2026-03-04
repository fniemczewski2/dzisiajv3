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
      disabled={loading || sent} // Blokujemy też po wysłaniu
      className={`p-2 rounded-lg transition-colors ${
        sent || loading
          ? "bg-pink-500 text-white"
          : "bg-pink-100 hover:bg-pink-200 text-pink-500"
      }`}
    >
      <Heart 
        className={`w-4 h-4 ${sent ? "animate-pulse" : ""}`} 
        fill={sent ? "#fff" : "none"} 
      />
    </button>
  );
}