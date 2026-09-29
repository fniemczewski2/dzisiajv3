// pages/start.tsx

import Seo from "@/components/ui/SEO";
import { FEATURE_GROUPS, getFeaturesWithStatus } from "@/config/features";
import FeatureStatusBadge from "@/components/features/FeatureStatusBadge";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider'; 
import { useToast } from "@/providers/ToastProvider";
import { useRouter } from 'next/router'; 

export default function StartPage() {
  const { user, supabase, loadingUser } = useAuth(); 
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const changed = getFeaturesWithStatus();

  useEffect(() => {
    if (!loadingUser && user) {
      const searchParams = new URLSearchParams(window.location.search);
      let nextUrl = searchParams.get('next') || '/';
      if (!nextUrl.startsWith('/')) nextUrl = '/'; 
      router.replace(nextUrl);
    }
  }, [user, loadingUser, router]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      
      const searchParams = new URLSearchParams(window.location.search);
      const nextUrl = searchParams.get('next') || '/';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        },
      });

      if (error) throw error;
      
    } catch (err) {
      console.error("Błąd logowania:", err);
      toast.error("Wystąpił błąd podczas logowania.")
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
      let toastId: string | undefined;
      if ((loadingUser || isLoggingIn) && toast.loading) toastId = toast.loading("Logowanie...");
      return () => { if (toastId && toast.dismiss) toast.dismiss(toastId); };
    }, [loadingUser, isLoggingIn, toast]);
  
  return (
    <>
      <Seo
        title="Rozpocznij | Dzisiaj.Fun"
        description="Poznaj Dzisiaj.Fun - kompleksową aplikację, która pomoże Ci uporządkować i zorganizować każdy dzień."
        canonical="https://dzisiaj.fun/start"
        keywords="aplikacja produktywność, organizacja czasu, planner, darmowy organizer"
      />
        <div className="max-w-6xl mx-auto px-1 sm:px-2">
          <section className="text-center py-8 sm:py-14">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-5 text-text leading-[1.05] tracking-tight">
              Organizuj swój&nbsp;dzień z&nbsp;<span className="text-primary">Dzisiaj.Fun</span>
            </h1>
            <p className="text-lg sm:text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              Zadania, kalendarz, finanse, nawyki i&nbsp;transport w&nbsp;jednej aplikacji, która działa też na telefonie jak zwykła aplikacja.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleGoogleLogin}
                type="button"
                disabled={isLoggingIn}
                className="inline-flex items-center justify-center gap-2.5 min-h-12 px-6 py-3 bg-secondary hover:bg-secondary-hover text-white font-semibold rounded-xl shadow-md transition-colors disabled:opacity-60"
              >
                Zaloguj przez Google
              </button>
              <Link
                href="/guide"
                className="inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-xl border border-line-strong bg-card text-text font-semibold hover:bg-surface transition-colors"
              >
                <BookOpen aria-hidden="true" className="h-5 w-5" />
                Instrukcja
              </Link>
            </div>
          </section>

          {changed.length > 0 && (
            <section aria-labelledby="whats-new-heading" className="mb-12 rounded-(--radius-card) border border-line bg-card p-5 sm:p-7 shadow-sm">
              <h2 id="whats-new-heading" className="font-display text-2xl font-bold text-text mb-1">Co nowego</h2>
              <p className="text-sm text-text-muted mb-5">Moduły dodane i zmienione w ostatnich wersjach.</p>
              <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {changed.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <li key={feature.title} className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-primary">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-text">
                          {feature.title}
                          {feature.status && <FeatureStatusBadge status={feature.status} since={feature.since} />}
                        </p>
                        <p className="text-sm text-text-secondary">{feature.note ?? feature.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="pb-8" aria-labelledby="features-heading">
            <h2 id="features-heading" className="font-display text-3xl font-bold text-center text-text mb-2">
              Wszystko w jednym miejscu
            </h2>
            <p className="text-center text-text-muted mb-10">Sześć obszarów, tak jak w menu aplikacji.</p>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURE_GROUPS.map((group) => (
                <section
                  key={group.category}
                  aria-labelledby={`cat-${group.category}`}
                  className="flex flex-col rounded-(--radius-card) border border-line bg-card shadow-sm overflow-hidden"
                >
                  <header className="px-5 pt-5 pb-3 border-b border-line">
                    <h3 id={`cat-${group.category}`} className="font-display text-xl font-bold text-text">{group.category}</h3>
                    <p className="text-sm text-text-muted">{group.summary}</p>
                  </header>
                  <ul className="flex-1 divide-y divide-line">
                    {group.features.map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <li key={feature.title} className="flex gap-3 px-5 py-3.5">
                          <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 font-semibold text-text">
                              {feature.title}
                              {feature.status && <FeatureStatusBadge status={feature.status} since={feature.since} />}
                            </p>
                            <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        </div>
    </>
  );
}
