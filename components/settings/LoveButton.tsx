"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

export default function LoveButton() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendLove = async () => {
    try {
      setLoading(true);

      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-love`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error("Error sending love:", err);
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
