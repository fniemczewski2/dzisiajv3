"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../providers/AuthProvider";

export default function LoveCat() {
  const { user, supabase } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;

    const triggerCat = () => {
      setShow(true);
      setTimeout(() => setShow(false), 4000);
    };

    let isTriggering = false;

const handleTrigger = () => {
  if (isTriggering) return;
  isTriggering = true;
  triggerCat();
  
  setTimeout(() => { isTriggering = false; }, 2000); 
};

const channel = supabase
  .channel(`love_channel_${user.id}`)
  .on(
    "broadcast",
    { event: "love_received" },
    () => handleTrigger()
  )
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${user.id}`,
    },
    (payload: any) => {
      const type = payload.new?.type || "";
      const title = payload.new?.title || "";

      if (type === "love_message" || title.toLowerCase().includes("love")) {
        handleTrigger();
      }
    }
  )
  .subscribe((status: string) => {
    if (status === "SUBSCRIBED") {
      console.log("Pomyślnie podłączono nasłuchiwanie serduszek!");
    } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
      console.warn("Problem z kanałem Supabase Realtime:", status);
    }
  });


    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === "love" || data?.title?.toLowerCase().includes("love") || data?.title?.includes("serduszko")) {
        triggerCat();
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleMessage);

    return () => {
      supabase.removeChannel(channel);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [user, supabase]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100000] pointer-events-none flex flex-col items-center justify-center overflow-hidden">

      <div className="relative animate-in zoom-in slide-in-from-bottom-10 fade-in duration-500 ease-out">

        <div className="text-[120px] sm:text-[150px] animate-bounce drop-shadow-2xl">
          😻
        </div>

        <div className="absolute -top-10 -left-10 text-4xl animate-pulse text-pink-500">💖</div>
        <div className="absolute top-10 -right-12 text-5xl animate-bounce text-red-500 delay-100">❤️</div>
        <div className="absolute -bottom-4 left-1/2 text-3xl animate-ping text-pink-400 delay-200">💕</div>
      </div>
    </div>
  );
}