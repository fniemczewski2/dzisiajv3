// components/ui/buttons/copyButtonSmall.tsx

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/providers/ToastProvider";

export const CopyButtonSmall = ({ text, label }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Skopiowano!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nie udało się skopiować.");
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="flex items-center gap-1 rounded-lg p-1.5 text-text-muted transition hover:bg-primary/10 hover:text-primary"
      title={`Skopiuj ${label || "wartość"}`}
      aria-label={`Skopiuj ${label || "wartość"}`}
    >
      {copied ? (
        <Check className="h-4 w-4 text-success sm:h-5 sm:w-5" />
      ) : (
        <Copy className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
      )}
    </button>
  );
};
