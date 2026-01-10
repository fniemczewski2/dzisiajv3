import { useRouter } from "next/router";
import { useSession } from "@supabase/auth-helpers-react";
import { useEffect } from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { Backpack, Bell, Brain, Calendar, ChartColumnBig, CheckCircle, Clock, Coins, CookingPot, Dumbbell, FileText, ListTodo, Luggage, Pen, Settings, Shield, ShoppingCart, Star, Sun, Timer, UsersRound } from "lucide-react";

export default function Home() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/tasks");
    }
  }, [session, router]);


  const homepageStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Dzisiaj v3",
    description: "Kompleksowa aplikacja do zarządzania czasem i produktywnością. Organizuj zadania, notatki, rachunki i kalendarz w jednym miejscu.",
    url: "https://dzisiajv3.vercel.app",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web Browser, iOS, Android",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    softwareVersion: "3.0",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "PLN",
    },
    featureList: [
      "Zarządzanie zadaniami z priorytetami",
      "Kalendarz wydarzeń",
      "Notatki i listy",
      "Śledzenie rachunków i budżetu",
      "Technika Pomodoro",
      "Macierz Eisenhowera",
      "Tryb offline (PWA)",
      "Synchronizacja w chmurze",
    ],
    screenshot: "https://dzisiajv3.vercel.app/screenshot.png",
    author: {
      "@type": "Organization",
      name: "Dzisiaj v3",
    },
    inLanguage: "pl-PL",
  };

  return (
    <>
      <SEO
        title="Dzisiaj v3 - Zarządzaj Zadaniami, Notatkami i Kalendarzem"
        description="Dzisiaj v3 to kompleksowa aplikacja do zarządzania czasem i produktywnością. Organizuj zadania z technikami Pomodoro i Eisenhower, twórz notatki, śledź rachunki i planuj w kalendarzu. Wszystko w jednym miejscu, offline i online."
        canonical="https://dzisiajv3.vercel.app"
        ogType="website"
        keywords="zarządzanie zadaniami, produktywność, notatki, kalendarz, pomodoro, eisenhower matrix, organizacja czasu, todo list, planner, budżet domowy, rachunki, pwa"
        structuredData={homepageStructuredData}
      />

      <Layout>
        <main id="main-content" className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <section className="text-center sm:py-12 px-4 line-">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 leading-snug">
              Organizuj swój&nbsp;dzień z&nbsp;<span className="text-primary leading-snug">Dzisiaj&nbsp;v3</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Kompleksowa aplikacja do&nbsp;zarządzania czasem, zadaniami i&nbsp;produktywnością.
              Wszystko czego potrzebujesz w&nbsp;jednym miejscu.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push("/login")}
                className="bg-primary hover:bg-secondary text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
              >
                Rozpocznij
              </button>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-12 px-4" aria-labelledby="features-heading">
            <h2 id="features-heading" className="text-3xl font-bold text-center mb-12">
              Wszystko czego potrzebujesz
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Zadania",
                  description: "Organizuj zadania z\u00A0priorytetami, datami i\u00A0kategoriami. Filtruj i\u00A0sortuj.",
                  icon: <ListTodo />,
                },
                                {
                  title: "Pomodoro",
                  description: "Zwiększ produktywność z\u00A0techniką Pomodoro i\u00A0timerem.",
                  icon: <Timer />,
                },
                {
                  title: "Eisenhower",
                  description: "Priorytetyzuj zadania z\u00A0macierzą Eisenhowera (pilne/ważne).",
                  icon: <Brain />,
                },
                {
                  title: "Kalendarz",
                  description: "Planuj wydarzenia, spotkania i\u00A0terminy. Eksportuj jako .ics.",
                  icon: <Calendar />,
                },
                {
                  title: "Notatki",
                  description: "Twórz notatki, listy zakupów, przepisy i\u00A0plany podróży.",
                  icon: <Pen />,
                },
                {
                  title: "Sprawozdania",
                  description: "Twórz sprawozdania ze\u00A0spotkań z\u00A0agendą, uczestnikami i\u00A0zadaniami.",
                  icon: <FileText />,
                },

                {
                  title: "Harmonogram Dnia",
                  description: "Zadbaj o\u00A0regularność, stwórz własny plan dnia.",
                  icon: <Clock />,
                },
                {
                  title: "Nawyki",
                  description: "Śledź codzienne nawyki: tabletki, trening, woda i\u00A0więcej.",
                  icon: <CheckCircle />,
                },
                {
                  title: "Przypomnienia",
                  description: "Ustaw cykliczne przypomnienia o\u00A0ważnych rzeczach.",
                  icon: <Bell />,
                },
                {
                  title: "Rachunki",
                  description: "Monitoruj swoje wydatki, planuj budżet i\u00A0śledź statystyki.",
                  icon: <Coins />,
                },
                {
                  title: "Budżet Roczny",
                  description: "Analizuj wydatki i\u00A0przychody miesięczne. Obliczaj godziny pracy.",
                  icon: <ChartColumnBig />,
                },
                {
                  title: "Pogoda",
                  description: "Sprawdzaj aktualną pogodę i\u00A0prognozę dla swojej lokalizacji.",
                  icon: <Sun />,
                },
                {
                  title: "Trening",
                  description: "Planuj treningi, zapisuj ćwiczenia i\u00A0śledź swoje postępy.",
                  icon: <Dumbbell />,
                },
                {
                  title: "Listy Zakupów",
                  description: "Twórz i\u00A0udostępniaj listy zakupów z\u00A0możliwością odznaczania.",
                  icon: <ShoppingCart />,
                },
                {
                  title: "Przepisy",
                  description: "Zarządzaj przepisami kulinarnymi z\u00A0listą produktów i\u00A0kategoryzacją.",
                  icon: <CookingPot />,
                },
                {
                  title: "Plecak",
                  description: "Autorska lista wyposażenia plecaka lub torebki.",
                  icon: <Backpack />,
                },
                {
                  title: "Walizka Podróżna",
                  description: "Uniwersalna lista rzeczy na\u00A0wyjazd: odzież, dokumenty, elektronika.",
                  icon: <Luggage />,
                },
                {
                  title: "Plecak Bezpieczeństwa",
                  description: "Pełna lista niezbędnych rzeczy na\u00A0wypadek kryzysu.",
                  icon: <Shield />,
                },
                {
                  title: "Udostępnianie",
                  description: "Udostępniaj zadania, wydarzenia i\u00A0listy innym użytkownikom.",
                  icon: <UsersRound />,
                },
                {
                  title: "Ustawienia",
                  description: "Dostosuj preferencje aplikacji do\u00A0swoich potrzeb.",
                  icon: <Settings />,
                },
                {
                  title: "Wiele więcej...",
                  description: "Aplikacja jest rozwijana i\u00A0pojawiają się nowe funkcje.",
                  icon: <Star />,
                },
              ].map((feature) => (
                <article
                  key={feature.title}
                  className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </section>
        </main>
      </Layout>
    </>
  );
}
