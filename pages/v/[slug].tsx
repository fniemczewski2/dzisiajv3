import { GetServerSideProps } from "next";
import Seo from "@/components/ui/SEO";
import { createAnonSupabase } from "@/lib/supabase/server";
import VCardPreview from "@/components/profiles/VCardPreview";
import { VCardProfile } from "@/types/profiles";

interface PublicVCardProps {
  profile?: VCardProfile;
  error?: boolean;
}

export default function PublicVCard({ profile, error }: Readonly<PublicVCardProps>) {
  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <h1 className="text-xl text-text-muted">Wizytówka nie istnieje lub nie jest już publiczna.</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-10">
      <Seo
        title={`${profile.full_name} – wizytówka`}
        description={`Wizytówka: ${[profile.full_name, profile.organization].filter(Boolean).join(", ")}. Dane kontaktowe do zapisania w telefonie.`}
        canonical={`https://dzisiaj.fun/v/${profile.public_slug}`}
        ogType="profile"
        noindex={true}
      />

      <VCardPreview profile={profile} />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = context.params?.slug as string;

  if (!slug) return { notFound: true };

  const supabase = createAnonSupabase();

  const { data: profile, error } = await supabase
    .from("vcard_profiles")
    .select(
      "full_name, organization, avatar_url, emails, phones, addresses, social_links, business_data, color_light, color_dark, is_public, public_slug"
    )
    .eq("public_slug", slug)
    .eq("is_public", true)
    .single();

  if (error || !profile) {
    return { props: { error: true } };
  }

  return {
    props: {
      profile: structuredClone(profile),
    },
  };
};
