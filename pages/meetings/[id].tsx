import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Seo from "@/components/ui/SEO";
import { SkeletonSlotGrid } from "@/components/ui/Skeleton";

const MeetingPollDetails = dynamic(() => import("@/components/meetingPolls/MeetingPollDetails"), {
  ssr: false,
  loading: () => <SkeletonSlotGrid />,
});

export default function MeetingPollResultsPage() {
  const router = useRouter();
  const { id } = router.query;

  if (typeof id !== "string") return null;

  return (
    <>
      <Seo
        title="Wyniki ankiety"
        description="Wyniki ankiety dostępności i zapisy na terminy, widoczne tylko dla organizatora."
        canonical="https://www.dzisiaj.fun/meetings"
        noindex={true}
      />
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/meetings"
          className="mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg pr-3 text-sm font-medium text-text-secondary transition-colors hover:text-text"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Wróć do listy ankiet
        </Link>
        <MeetingPollDetails pollId={id} />
      </div>
    </>
  );
}
