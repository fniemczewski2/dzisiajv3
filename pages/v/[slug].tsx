import { GetServerSideProps } from 'next';
import Seo from '@/components/ui/SEO';
import { createClient } from '@supabase/supabase-js';
import VCardPreview from '@/components/profiles/VCardPreview';
import { VCardProfile } from '@/types/profiles';

interface PublicVCardProps {
  profile?: VCardProfile;
  error?: boolean;
}

export default function PublicVCard({ profile, error }: Readonly<PublicVCardProps>) {
  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
        <h1 className="text-xl text-text-muted">Wizytówka nie istnieje lub nie jest już publiczna.</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-10">
      <Seo
        title={`${profile.full_name} – wizytówka`}
        description={`Wizytówka: ${profile.full_name}${profile.organization ? `, ${profile.organization}` : ""}. Dane kontaktowe do zapisania w telefonie.`}
        canonical={`https://dzisiaj.fun/v/${profile.public_slug}`}
        ogType="profile"
        // Dane osobowe: wizytówka jest do udostępniania linkiem lub kodem QR,
        // nie do wyszukiwarek.
        noindex={true}
      />
      
      <VCardPreview 
        profile={profile} 
      />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = context.params?.slug as string;

  if (!slug) return { notFound: true };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: profile, error } = await supabase
    .from('vcard_profiles')
    .select('full_name, organization, avatar_url, emails, phones, addresses, social_links, business_data, color_light, color_dark, is_public, public_slug')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .single();

  if (error || !profile) {
    return { props: { error: true } };
  }

  return { 
    props: { 
      profile: structuredClone(profile) 
    } 
  };
};