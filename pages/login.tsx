// pages/login.tsx
"use client";

import LoginForm from "../components/LoginForm";
import Seo from "../components/SEO";

export default function LoginPage() {
  return (
    <>
      <Seo
        title="Logowanie - Dzisiaj v3"
        description="Zaloguj się na swoje konto w Dzisiaj v3, by uzyskać dostęp do swoich zadań, notatek i finansów."
        canonical="https://dzisiajv3.vercel.app/login"
        keywords="logowanie, konto, autoryzacja, dostęp, panel użytkownika"
      />
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <LoginForm />
      </div>
    </>
  );
}
