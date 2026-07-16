import { GetServerSideProps } from 'next';
import Head from 'next/head';
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
        <h1 className="text-xl text-neutral-500">Wizytówka nie istnieje lub nie jest już publiczna.</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-10">
      <Head>
        <title>{profile.full_name} | Wizytówka</title>
      </Head>
      
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
    .select('*')
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