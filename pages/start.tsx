'use client';

import Seo from "@/components/SEO";
import { FEATURE_GROUPS } from "@/config/features";
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider'; 
import { useToast } from "@/providers/ToastProvider";

export default function StartPage() {
  const { supabase, loadingUser } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();

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
        title="Rozpocznij - Dzisiaj v3"
        description="Poznaj Dzisiaj v3 - kompleksową aplikację, która pomoże Ci uporządkować i zorganizować każdy dzień."
        canonical="https://dzisiajv3.vercel.app/start"
        keywords="aplikacja produktywność, organizacja czasu, planner, darmowy organizer"
      />
        <main id="main-content" className="max-w-4xl mx-auto">
          <section className="text-center sm:py-12 px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-text leading-snug">
              Organizuj swój&nbsp;dzień z&nbsp;<span className="text-primary leading-snug">Dzisiaj&nbsp;v3</span>
            </h1>
            <p className="text-xl text-textMuted mb-8 max-w-2xl mx-auto">
              Kompleksowa aplikacja do&nbsp;zarządzania czasem, zadaniami i&nbsp;produktywnością.
              Wszystko czego potrzebujesz w&nbsp;jednym miejscu.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGoogleLogin}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
              >
                Zaloguj przez Google
              </button>
            </div>
          </section>

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
                        className="card p-6 m-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="text-4xl mb-4">
                          <IconComponent />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                        <p className="text-textMuted">{feature.description}</p>
                      </article>
                    );
                  })}
                </section>
              ))}
            </div>
          </section>
        </main>
    </>
  );
}