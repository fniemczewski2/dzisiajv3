// pages/api/vcard.ts
//
// GET /api/vcard?slug=… – plik .vcf publicznej wizytówki (bez logowania).

import type { NextApiRequest, NextApiResponse } from "next";
import { createAnonSupabase } from "@/lib/supabase/server";
import { buildVCard, vcardContentDisposition } from "@/lib/vcard";
import { clientIp, enforceRateLimit } from "@/lib/server/rateLimit";
import { CACHE_CONTROL } from "@/config/server";
import type { VCardProfile } from "@/types/profiles";

type PublicVCard = Pick<
  VCardProfile,
  "full_name" | "organization" | "phones" | "emails" | "addresses" | "social_links"
>;

const PUBLIC_COLUMNS = "full_name, organization, phones, emails, addresses, social_links";
const SLUG_PATTERN = /^[a-z0-9-]{1,100}$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Metoda niedozwolona." });
  }

  if (!(await enforceRateLimit(res, "vcard", clientIp(req)))) return;

  const { slug } = req.query;
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
    return res.status(400).json({ error: "Brak lub nieprawidłowy adres wizytówki." });
  }

  const { data: profile, error } = await createAnonSupabase()
    .from("vcard_profiles")
    .select(PUBLIC_COLUMNS)
    .eq("public_slug", slug)
    .eq("is_public", true)
    .maybeSingle<PublicVCard>();

  if (error || !profile) {
    res.setHeader("Cache-Control", CACHE_CONTROL.private);
    return res.status(404).json({ error: "Nie znaleziono wizytówki albo nie jest publiczna." });
  }

  const vcf = buildVCard({
    fullName: profile.full_name ?? "",
    organization: profile.organization,
    phones: profile.phones,
    emails: profile.emails,
    addresses: profile.addresses,
    urls: (profile.social_links ?? []).map((link) => ({ type: link.platform, url: link.url })),
  });

  res.setHeader("Content-Type", "text/vcard; charset=utf-8");
  res.setHeader("Content-Disposition", vcardContentDisposition(profile.full_name));
  res.setHeader("Cache-Control", CACHE_CONTROL.vcard);
  return res.status(200).send(vcf);
}
