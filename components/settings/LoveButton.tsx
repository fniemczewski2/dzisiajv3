// components/settings/LoveButton.tsx

import { Heart } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

export default function LoveButton() {
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendLove = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Nie można pobrać tokena dostępu");

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-love`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const body = (await response.json().catch(() => ({}))) as { success?: boolean; message?: string; error?: string };
      if (!response.ok || !body.success) {
        toast.error(body.message ?? body.error ?? "Nie udało się wysłać serduszka.");
        return;
      }

      setSent(true);
      setTimeout(() => setSent(false), 60000);
    } catch {
      toast.error("Nie udało się wysłać serduszka.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={sendLove}
      type="button"
      disabled={loading || sent}
      className={`rounded-xl border p-2.5 shadow-sm transition-colors ${
        sent || loading
          ? "border-deco-pink bg-deco-pink-solid text-white"
          : "border-deco-pink-line bg-deco-pink-soft text-deco-pink hover:bg-deco-pink-line"
      }`}
      title="Wyślij serduszko"
      aria-label="Wyślij serduszko"
    >
      <Heart className={`h-5 w-5 ${sent ? "animate-pulse" : ""}`} fill={sent ? "#fff" : "none"} />
    </button>
  );
}
