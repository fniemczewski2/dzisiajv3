// components/settings/LoveButton.tsx

import { LOVE_COOLDOWN_MS } from "@/config/timing";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
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
      const result = await invokeEdgeFunction<{ success?: boolean; message?: string }>(supabase, "send-love", {});
      const body = result.data as { success?: boolean; message?: string; error?: string } | null;
      if (!result.ok || !body?.success) {
        toast.error(body?.message ?? body?.error ?? "Nie udało się wysłać serduszka.");
        return;
      }

      setSent(true);
      setTimeout(() => setSent(false), LOVE_COOLDOWN_MS);
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
