import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Seo from "@/components/ui/SEO";

const MeetingPollResults = dynamic(() => import("@/components/meetingPolls/MeetingPollResults"), { ssr: false });

export default function MeetingPollResultsPage() {
  const router = useRouter();
  const { id } = router.query;

  if (typeof id !== "string") return null;

  return (
    <>
      <Seo
        title="Wyniki ankiety | Dzisiaj.Fun"
        description="Wyniki ankiety dostępności zespołu — widoczne wyłącznie dla organizatora."
        canonical="https://dzisiaj.fun/meetings"
      />
      <Link
        href="/meetings"
        className="inline-flex items-center gap-1.5 text-sm text-textSecondary hover:text-text mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Wróć do listy ankiet
      </Link>
      <MeetingPollResults pollId={id} />
    </>
  );
}
