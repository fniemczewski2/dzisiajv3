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
      toast.success('Skopiowano!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nie udało się skopiować.');
    }
  };

  return (
    <button
      onClick={handleCopy}
      type='button'
      className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition flex items-center gap-1"
      title={`Skopiuj ${label || 'wartość'}`}
      aria-label={`Skopiuj ${label || 'wartość'}`}
    >
      {copied ? (
        <Check className="text-green-700 dark:text-green-300 w-4 h-4 sm:h-5 sm:w-5"/>
      ) : (
        <Copy className="text-primary w-4 h-4 sm:h-5 sm:w-5" />
      )}
    </button>
  );
};
