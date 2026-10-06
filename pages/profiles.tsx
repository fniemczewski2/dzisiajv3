// pages/profiles.tsx


import React from 'react';
import ProfilesList from "@/components/profiles/ProfilesList";
import Seo from '@/components/ui/SEO';
  
export default function ProfilesPage() {  
  return (
    <>
      <Seo
        canonical="https://dzisiaj.fun/profiles" title="Wizytówki" description="Twórz wizytówki z danymi kontaktowymi i udostępniaj je przez link, kod QR lub plik vCard." />
      <ProfilesList />
    </>
  )
}
