// pages/login.tsx
"use client";

import Head from "next/head";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Logowanie - Dzisiaj</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <LoginForm />
      </div>
    </>
  );
}
