
import React from 'react';
import ProfilesList from "@/components/profiles/ProfilesList";
import Seo from '@/components/ui/SEO';
import { AddButton } from '@/components/ui/CommonButtons';
  
export default function ProfilesPage() {  
  return (
    <>
      <Seo title="Wizytówka | Dzisiaj" description="Zarządzaj swoimi wizytówkami i udostępniaj kontakty." />
      <ProfilesList />
    </>
  )
}
