import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { SkeletonList } from "@/components/ui/Skeleton";
import { AddButton } from "@/components/ui/CommonButtons";
import { useLetters } from "@/hooks/db/useLetters";
import Seo from "@/components/ui/SEO";

const LetterForm = dynamic(() => import("@/components/letters/LetterForm"), { ssr: false });
const LetterList = dynamic(() => import("@/components/letters/LetterList"), { ssr: false });

export default function LettersPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshToken((t) => t + 1), []);
  const { fetching } = useLetters();

  return (
    <>
      <Seo
        title="Pisma urzędowe | Dzisiaj.Fun"
        description="Śledź wnioski UDIP, skargi, wykroczenia i inną korespondencję urzędową wraz z terminami odpowiedzi i załącznikami."
        canonical="https://dzisiaj.fun/notes/letters"
        keywords="UDIP, wniosek, skarga, wykroczenie, pismo urzędowe, korespondencja"
      />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text">Pisma</h2>
        {!showForm && <AddButton onClick={() => setShowForm(true)} />}
      </div>

      {showForm && (
        <section className="mb-6">
          <LetterForm
            onCancel={() => setShowForm(false)}
            onChange={() => {
              setShowForm(false);
              triggerRefresh();
            }}
          />
        </section>
      )}

      <section>
        {fetching
          ? <SkeletonList count={4} variant="card" />
          : <LetterList refreshToken={refreshToken} />
        }
      </section>
    </>
  );
}
