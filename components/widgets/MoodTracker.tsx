// components/widgets/MoodTracker.tsx

import { useMoodConsent } from "@/hooks/useMoodConsent";
import { readableTextColor } from "@/lib/contrast";
import { DEFAULT_MOODS } from "@/config/defaults";
import React from "react";
import Link from "next/link";
import { useMoods } from "@/hooks/db/useMoods";
import { Check, CheckCircle, Smile } from "lucide-react";
import { useSettings } from "@/hooks/db/useSettings";
import { SecondaryFullButton } from "../ui/CommonButtons";

interface MoodWidgetProps {
  date: string;
}

export default function MoodWidget({ date }: Readonly<MoodWidgetProps>) {
  const { settings } = useSettings();
  const { moods, logMood, loading, fetching } = useMoods(date, date);
  const { status: consentStatus, grant } = useMoodConsent();
  const todayMood = moods.find((m) => m.date === date);

  if (!settings?.show_mood_tracker || fetching || consentStatus === "loading") return null;

  const options = settings?.mood_options?.length ? settings.mood_options : DEFAULT_MOODS;

  const handleClick = (mood_id: string) => {
    if (loading) return;
    const next = todayMood?.mood_id === mood_id ? null : mood_id;
    logMood(date, next).catch(console.error);
  };

  if (consentStatus === "missing") {
    return (
      <section className="widget space-y-3 px-4 py-3" aria-labelledby="mood-consent-heading">
        <h3 id="mood-consent-heading" className="flex items-center font-medium text-text">
          <Smile className="mr-3 h-5 w-5 text-primary sm:h-6 sm:w-6" aria-hidden="true" />
          Nastrój – potrzebna zgoda
        </h3>
        <p className="text-sm text-text-secondary">
          Wpisy nastroju mogą ujawniać informacje o Twoim zdrowiu. Zapisujemy je tylko za Twoją wyraźną zgodą (art. 9
          RODO), wyłącznie w Twoim koncie. Zgodę cofniesz w Ustawieniach – wpisy zostaną wtedy usunięte.{" "}
          <Link href="/privacy" className="font-semibold text-primary underline-offset-4 hover:underline">
            Polityka prywatności
          </Link>
        </p>
        <SecondaryFullButton onClick={() => void grant()} Icon={CheckCircle}>
          {"Wyrażam zgodę"}
        </SecondaryFullButton>
      </section>
    );
  }

  return (
    <div className="widget flex items-center justify-between px-4 py-3" aria-busy={loading}>
      <div className="mr-1 text-primary">
        <Smile className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="flex flex-nowrap gap-1 md:gap-2">
        {options.map((opt) => {
          const isSelected = todayMood?.mood_id === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleClick(opt.id)}
              type="button"
              aria-pressed={isSelected}
              aria-label={`Nastrój: ${opt.label}`}
              className={`${!isSelected && "opacity-60"} flex min-h-6 min-w-6 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold transition md:px-3`}
              style={{ backgroundColor: opt.color, color: readableTextColor(opt.color) }}
              title={opt.label}
            >
              {isSelected && (
                <>
                  <span className="mr-1">{opt.label}</span>
                  <Check className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
