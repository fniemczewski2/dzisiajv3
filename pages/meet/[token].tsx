// pages/meet/[token].tsx

import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Head from "next/head";
import { SkeletonSlotGrid } from "@/components/ui/Skeleton";

const PublicPollForm = dynamic(() => import("@/components/meetingPolls/PublicPollForm"), {
  ssr: false,
  loading: () => <SkeletonSlotGrid />,
});

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
