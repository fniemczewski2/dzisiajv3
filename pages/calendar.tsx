import dynamic from "next/dynamic";
import Head from "next/head";
import Layout from "../components/Layout";
import { Loader2 } from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";

const CustomCalendar = dynamic(() => import("../components/CustomCalendar"), {
  ssr: false,
});

export default function CalendarPage() {
  const session = useSession();
  if (session === undefined) return <Loader2 className="animate-spin m-auto" />;
  return (
    <>
      <Head>
        <title>Kalendarz – Dzisiaj v3</title>
      </Head>
      <Layout>
        <h1 className="text-2xl font-bold mb-4">Kalendarz</h1>
        <CustomCalendar />
      </Layout>
    </>
  );
}
CalendarPage.auth = true;
