// pages/notes/letters.tsx

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { SkeletonList } from "@/components/ui/Skeleton";
import { AddButton } from "@/components/ui/CommonButtons";
import { useLetters } from "@/hooks/db/useLetters";
import Seo from "@/components/ui/SEO";
import type { LetterProposal } from "@/components/letters/LetterNoticeScan";

const LetterForm = dynamic(() => import("@/components/letters/LetterForm"), { ssr: false });
const LetterList = dynamic(() => import("@/components/letters/LetterList"), { ssr: false });
const LetterNoticeScan = dynamic(() => import("@/components/letters/LetterNoticeScan"), { ssr: false });

export default function LettersPage() {
  const [showForm, setShowForm] = useState(false);
  const [proposal, setProposal] = useState<LetterProposal | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshToken((t) => t + 1), []);
  const { fetching } = useLetters();

  return (
    <>
      <Seo
        title="Pisma urzędowe"
        description="Śledź wnioski o udostępnienie informacji publicznej, skargi, zgłoszenia wykroczeń i inną korespondencję urzędową razem z terminami odpowiedzi i załącznikami."
        canonical="https://www.dzisiaj.fun/notes/letters"
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="page-title">Pisma</h1>
        {!showForm && <AddButton onClick={() => setShowForm(true)} />}
      </div>

      {showForm && (
        <section className="mb-6">
          <LetterForm
            key={proposal ? `${proposal.issueDate}-${proposal.description}` : "new"}
            initial={proposal ?? undefined}
            onCancel={() => {
              setShowForm(false);
              setProposal(null);
            }}
            onChange={() => {
              setShowForm(false);
              setProposal(null);
              triggerRefresh();
            }}
          />
        </section>
      )}

      <LetterNoticeScan
        onPropose={(p) => {
          setProposal(p);
          setShowForm(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      <section>
        {fetching ? <SkeletonList count={4} variant="card" /> : <LetterList refreshToken={refreshToken} />}
      </section>
    </>
  );
}
