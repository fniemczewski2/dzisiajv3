import dynamic from "next/dynamic";
import Head from "next/head";
import Layout from "../components/Layout";
import { Loader2, PlusCircleIcon } from "lucide-react";
import { useSession } from "@supabase/auth-helpers-react";
import { useState } from "react";
import EventForm from "../components/EventForm";
import type { Event } from "../types";

const CustomCalendar = dynamic(() => import("../components/CustomCalendar"), {
  ssr: false,
});

export default function CalendarPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const session = useSession();
  const userEmail = session?.user?.email || "";

  if (session === undefined) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
      </div>
    );
  }

  const openAdd = () => {
    setEditingEvent(null);
    setShowForm(true);
  };

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEvent(null);
  };

  const handleEventsChange = () => {
    // You can call calendar refresh here if needed
    closeForm();
  };

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
              className="px-4 py-2 flex items-center bg-primary hover:bg-secondary text-white rounded-lg"
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
