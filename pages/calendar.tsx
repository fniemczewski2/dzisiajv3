import dynamic from "next/dynamic";
import Head from "next/head";
import Layout from "../components/Layout";
import { Loader2, PlusCircleIcon } from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";
import { useCallback, useState } from "react";
import type { Event } from "../types";

const CustomCalendar = dynamic(() => import("../components/calendar/CustomCalendar"), {
  ssr: false,
});

const EventForm = dynamic(() => import("../components/calendar/EventForm"), {
  loading: () => <Loader2 className="animate-spin w-5 h-5" />,
  ssr: false,
});


export default function CalendarPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const session = useSession();
  const userEmail = session?.user?.email || "";

  const openAdd = useCallback(() => {
    setEditingEvent(null);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((event: Event) => {
    setEditingEvent(event);
    setShowForm(true);
  }, []);

  return (
    <>
      <Head>
        <title>Kalendarz – Dzisiaj v3</title>
      </Head>
      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Kalendarz</h2>
          {!showForm && (
            <button
              onClick={openAdd}
              className="px-3 py-1.5 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
            >
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        {showForm && (
          <EventForm
            userEmail={userEmail}
            initialEvent={editingEvent}
            onEventsChange={() => {
              setShowForm(false);
              setEditingEvent(null);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        <CustomCalendar onEdit={openEdit} userEmail={userEmail} />
      </Layout>
    </>
  );
}

CalendarPage.auth = true;
