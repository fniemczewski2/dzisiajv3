// pages/meet/[token].tsx

import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Seo from "@/components/ui/SEO";
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
      <Seo
        title="Ustal termin spotkania"
        description="Zaznacz, kiedy masz czas – organizator zobaczy wspólną dostępność wszystkich uczestników."
        canonical={`https://dzisiaj.fun/meet/${token}`}
        noindex={true}
        nofollow={true}
      />
      <PublicPollForm token={token} />
    </>
  );
}
