import Head from "next/head";
import Layout from "../components/Layout";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

export default function SettingsPage() {
  const session = useSession();
  const supabase = useSupabaseClient();

  async function signOut() {
    await supabase.auth.signOut();
    // Next.js automatycznie przekieruje do ekranu logowania
  }

  return (
    <>
      <Head>
        <title>Ustawienia – Dzisiaj v3</title>
        <meta
          name="description"
          content="Zarządzaj ustawieniami konta i aplikacji."
        />
      </Head>
      <Layout>
        <div className="bg-card rounded-xl shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold">Ustawienia konta</h2>
          {session?.user && (
            <div>
              <p>
                <strong>Email:</strong> {session.user.email}
              </p>
            </div>
          )}
          <button
            onClick={signOut}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
          >
            Wyloguj się
          </button>
        </div>
      </Layout>
    </>
  );
}
