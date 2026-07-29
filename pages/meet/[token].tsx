// pages/meet/[token].tsx
//
// PUBLICZNA strona (patrz proxy.ts: /meet/ jest na liście tras dostępnych
// bez logowania). Cała komunikacja idzie przez hooks/usePublicMeetingPoll.ts,
// które rozmawia wyłącznie z pages/api/meeting-polls/public/*, nigdy
// bezpośrednio z Supabase kluczem anon.
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Head from "next/head";

const PublicPollForm = dynamic(() => import("@/components/meetingPolls/PublicPollForm"), { ssr: false });

export default function PublicMeetingPollPage() {
  const router = useRouter();
  const { token } = router.query;

  if (typeof token !== "string") return null;

  return (
    <>
      <Head>
        <title>Ustal termin spotkania | Dzisiaj.Fun</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <PublicPollForm token={token} />
    </>
  );
}
