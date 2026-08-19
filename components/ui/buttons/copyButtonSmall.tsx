// components/ui/buttons/copyButtonSmall.tsx
// Split out of the former CommonButtons.tsx.

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
      className="p-1.5 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition flex items-center gap-1"
      title={`Skopiuj ${label || 'wartość'}`}
    >
      {copied ? (
        <Check className="text-green-600 w-4 h-4 sm:h-5 sm:w-5"/>
      ) : (
        <Copy className="text-blue-600 w-4 h-4 sm:h-5 sm:w-5" />
      )}
    </button>
  );
};
