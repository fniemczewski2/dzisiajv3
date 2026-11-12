// components/settings/HealthConsentSection.tsx
//
// Zgoda na przekazywanie danych o zdrowiu ze Skrótów iOS i jej cofnięcie (z usunięciem danych).

import React, { useState, useSyncExternalStore } from "react";
import { HeartPulse, ShieldOff } from "lucide-react";
import { SecondaryFullButton } from "@/components/ui/CommonButtons";
import { useHealthConsent } from "@/hooks/useHealthConsent";
import { useToast } from "@/providers/ToastProvider";

const noSubscribe = () => () => {};

/**
 * Adres dla Skrótu z bieżącej domeny: przekierowanie (np. bez „www”) usuwa nagłówek Authorization,
 * więc Skrót musi wywoływać dokładnie domenę, na której działa aplikacja.
 */
function useOrigin(): string {
  return useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "https://www.dzisiaj.fun"
  );
}

export default function HealthConsentSection() {
  const origin = useOrigin();
  const { hasConsent, consentAt, consentVersion, grant, revoke } = useHealthConsent();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  const onGrant = async () => {
    setBusy(true);
    try {
      await grant();
      toast.success("Zgoda zapisana. Skrót może teraz przesyłać dane.");
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async () => {
    const ok = await toast.confirm(
      "Cofnąć zgodę? Wszystkie zapisane dane o krokach, tętnie, śnie i treningach zostaną usunięte.",
      {
        confirmLabel: "Cofnij i usuń",
        cancelLabel: "Anuluj",
      }
    );
    if (!ok) return;
    setBusy(true);
    try {
      if (await revoke()) toast.success("Zgodę cofnięto, dane usunięto.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="health-consent-heading" className="form-card mb-4 max-w-3xl space-y-3">
      <h2 id="health-consent-heading" className="section-title flex items-center gap-2">
        <HeartPulse className="h-5 w-5" aria-hidden="true" /> Zdrowie ze Skrótów iOS
      </h2>
      <p className="text-sm text-text-secondary">
        Skrót może przesyłać z Apple Zdrowie: liczbę kroków, pomiary tętna, fazy snu i treningi. Własne treningi możesz
        też dodawać ręcznie. To dane dotyczące zdrowia, zapisujemy je tylko za Twoją wyraźną zgodą, wyłącznie do
        wyświetlania w aplikacji. Zgodę możesz cofnąć w każdej chwili; dane zostaną wtedy usunięte.
      </p>
      {hasConsent ? (
        <>
          <p className="text-sm text-text">
            Zgoda udzielona {consentAt ? new Date(consentAt).toLocaleDateString("pl-PL") : ""} (wersja treści:{" "}
            {consentVersion}). Adres dla Skrótu: <code className="break-all">{origin}/api/health/shortcut</code>
          </p>
          <SecondaryFullButton Icon={ShieldOff} variant="danger" onClick={() => void onRevoke()} disabled={busy}>
            Cofnij zgodę i usuń dane
          </SecondaryFullButton>
        </>
      ) : (
        <>
          <label className="flex items-start gap-2 text-sm text-text">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />
            <span>
              Wyrażam zgodę na przetwarzanie moich danych dotyczących zdrowia (kroki, pomiary tętna, fazy snu, treningi)
              przesyłanych ze Skrótów iOS lub wpisywanych przeze mnie ręcznie, w celu ich wyświetlania w aplikacji (art.
              9 ust. 2 lit. a RODO).
            </span>
          </label>
          <SecondaryFullButton Icon={HeartPulse} onClick={() => void onGrant()} disabled={!checked || busy}>
            Udziel zgody
          </SecondaryFullButton>
        </>
      )}
    </section>
  );
}
