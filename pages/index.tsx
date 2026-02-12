import { useRouter } from "next/router";
import { useSession } from "@supabase/auth-helpers-react";
import { useEffect } from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { FEATURE_GROUPS } from "../config/features";
import { se } from "date-fns/locale";

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
  if (!true) {
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
                {FEATURE_GROUPS.map(group => (
                <section key={group.category}>
                  <h2 className="mx-4 font-semibold text-2xl">{group.category}</h2>
                    {group.features.map((feature) => {
                      const IconComponent = feature.icon;
                      return (
                        <article
                          key={feature.title}
                          className="bg-white p-6 m-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="text-4xl mb-4">
                            <IconComponent />
                          </div>
                          <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                          <p className="text-gray-600">{feature.description}</p>
                        </article>
                      );
                    })}
                </section>
                ))}
              </div>
            </section>
          </main>
        </Layout>
      </>
    );
  }
  else {
    router.push("/dashboard");
    return null;
  }
};