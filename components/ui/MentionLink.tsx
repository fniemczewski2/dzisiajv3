// components/ui/MentionLink.tsx
//
// Klikalne powiązanie w treści (@Osoba, !Zadanie, $Rachunek): po kliknięciu wyszukuje wpis i otwiera go na stronie
// modułu (`?focus=<id>`). Bez dopasowania – komunikat; tekst powiązania zostaje widoczny bez zmian.

import React, { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import type { Mention } from "@/lib/mentions";
import { MENTION_HREF, MENTION_LABEL, resolveMention } from "@/lib/mentionTargets";

export default function MentionLink({ mention }: Readonly<{ mention: Mention }>) {
  const router = useRouter();
  const { supabase } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const href = MENTION_HREF[mention.kind];

  const open = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const id = await resolveMention(supabase, mention.kind, mention.name);
      if (!id) {
        toast.info(`Nie znaleziono: ${mention.name}.`);
        return;
      }
      await router.push({ pathname: href, query: { focus: id } });
    } catch (err) {
      toast.error("Nie udało się otworzyć powiązania.", { cause: err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <a
      href={href}
      onClick={(e) => void open(e)}
      aria-busy={busy}
      aria-label={`Otwórz ${MENTION_LABEL[mention.kind]}: ${mention.name}`}
      className="rounded-sm font-medium text-primary underline decoration-dotted underline-offset-2 transition-colors hover:text-primary-strong focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none"
    >
      {mention.raw}
    </a>
  );
}
