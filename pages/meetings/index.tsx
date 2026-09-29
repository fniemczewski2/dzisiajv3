// pages/meetings/index.tsx

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { SkeletonList } from "@/components/ui/Skeleton";
import { AddButton } from "@/components/ui/CommonButtons";
import { useMeetingPolls } from "@/hooks/db/useMeetingPolls";
import Seo from "@/components/ui/SEO";

const MeetingPollForm = dynamic(() => import("@/components/meetingPolls/MeetingPollForm"), { ssr: false });
const MeetingPollList = dynamic(() => import("@/components/meetingPolls/MeetingPollList"), {
  ssr: false,
  loading: () => <SkeletonList count={3} variant="card" />,
});

export default function MeetingsPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshToken((t) => t + 1), []);
  const { fetching } = useMeetingPolls();

  return (
    <>
      <Seo
        title="Zespołowe ustalanie terminów | Dzisiaj.Fun"
        description="Twórz ankiety dostępności zespołu, wysyłaj link uczestnikom bez konieczności logowania i finalizuj termin bezpośrednio w kalendarzu."
        canonical="https://dzisiaj.fun/meetings"
        keywords="ustalanie terminu, ankieta dostępności, spotkanie zespołu, planowanie spotkań"
      />
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Terminy</h1>
          </div>
          {!showForm && <AddButton onClick={() => setShowForm(true)} />}
        </header>

        {showForm && (
          <section className="mb-8" aria-label="Nowa ankieta">
            <MeetingPollForm
              onCancel={() => setShowForm(false)}
              onChange={() => {
                setShowForm(false);
                triggerRefresh();
              }}
            />
          </section>
        )}

        <section aria-label="Lista ankiet">
          {fetching ? (
            <SkeletonList count={3} variant="card" />
          ) : (
            <MeetingPollList refreshToken={refreshToken} onCreate={() => setShowForm(true)} />
          )}
        </section>
      </div>
    </>
  );
}
