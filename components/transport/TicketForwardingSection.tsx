// components/transport/TicketForwardingSection.tsx
//
// Adres do przekierowania maili z biletami (b-<token>@…). Bilety PKP Intercity w PDF trafiają do „Pociągów”
// z oznaczeniem do sprawdzenia. Adres jest pokazywany jednorazowo po utworzeniu (w bazie tylko skrót tokenu).

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Mail } from "lucide-react";
import { createMailClient, type ForwardingAddress } from "@/lib/mail/client";
import { useToast } from "@/providers/ToastProvider";
import { CopyButtonSmall, IconActionButton, SecondaryFullButton } from "@/components/ui/CommonButtons";

const mail = createMailClient();
const NO_ADDRESSES: ForwardingAddress[] = [];

export default function TicketForwardingSection() {
  const { toast } = useToast();
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: addresses = NO_ADDRESSES, refetch } = useQuery({
    queryKey: ["ticket-forwarding"],
    queryFn: () => mail.listForwarding("tickets"),
  });
  const active = addresses.filter((a) => a.revoked_at === null);
  const load = async () => {
    await refetch();
  };

  const create = async () => {
    setBusy(true);
    try {
      const out = await mail.createForwarding("Bilety", "tickets");
      setCreated(out.address);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się utworzyć adresu.", { cause: err });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    const ok = await toast.confirm("Odwołać adres? Maile wysłane na niego wrócą do nadawcy.", {
      confirmLabel: "Odwołaj",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await mail.revokeForwarding(id);
      setCreated(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się odwołać adresu.", { cause: err });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="ticket-forwarding-heading" className="card space-y-3 p-4">
      <h2 id="ticket-forwarding-heading" className="section-title">
        Bilety z poczty
      </h2>
      <p className="text-sm text-text-secondary">
        Przekieruj mail z biletem PKP Intercity (PDF) na adres poniżej – każdy odcinek podróży pojawi się na liście z
        oznaczeniem do sprawdzenia. Treść maila i PDF nie są zapisywane. Mail bez rozpoznanego biletu wraca do nadawcy.
      </p>
      {created && (
        <div className="flex items-center gap-2 rounded-lg border border-warning-line bg-warning-soft p-3">
          <p className="flex-1 text-sm break-all text-text">
            Adres (pokazany jednorazowo): <strong>{created}</strong>
          </p>
          <CopyButtonSmall text={created} label="adres" />
        </div>
      )}
      {active.length > 0 && (
        <ul className="space-y-2">
          {active.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-sm text-text-secondary">
              <span className="flex-1">
                Adres aktywny od {new Date(a.created_at).toLocaleDateString("pl-PL", { dateStyle: "medium" })}
              </span>
              <IconActionButton
                Icon={Trash2}
                title="Odwołaj adres biletów"
                variant="danger"
                onClick={() => void revoke(a.id)}
                disabled={busy}
              />
            </li>
          ))}
        </ul>
      )}
      <SecondaryFullButton Icon={Mail} onClick={() => void create()} disabled={busy} ariaBusy={busy}>
        {active.length > 0 ? "Utwórz nowy adres" : "Utwórz adres"}
      </SecondaryFullButton>
    </section>
  );
}
