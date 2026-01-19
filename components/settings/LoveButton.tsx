"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

export default function LoveButton() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendLove = async () => {

    setLoading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-love`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });

      setSent(true)
      setTimeout(() => setSent(false), 60000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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
