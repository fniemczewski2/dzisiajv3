// pages/api/vcard.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { VCardProfile } from '@/types/profiles';

export function escVCardValue(raw: string): string {
return raw
  .replaceAll(/\\/g, String.raw`\\`)
  .replaceAll(/\r?\n/g, String.raw`\n`)
  .replaceAll(/;/g, String.raw`\;`)
  .replaceAll(/,/g, String.raw`\,`);
}

export function sanitizeTypeToken(raw: string): string {
  const cleaned = raw.replaceAll(/[^A-Za-z0-9-]/g, '').toUpperCase();
  return cleaned || 'OTHER';
}

export function safeFileName(raw: string | undefined): string {
  const cleaned = (raw ?? '').replaceAll(/[^\p{L}\p{N}_-]+/gu, '_').replaceAll(/^_+|_+$/g, '');
  return cleaned || 'wizytowka';
}

function buildPhoneLines(phones: VCardProfile['phones']): string[] {
  const lines: string[] = [];
  if (!Array.isArray(phones)) return lines;
  for (const phone of phones) {
    if (!phone?.number) continue;
    const cleanNumber = escVCardValue(phone.number.replaceAll(/\s+/g, ''));
    const type = sanitizeTypeToken(phone.type ?? '');
    lines.push(`TEL;TYPE=${type},VOICE:${cleanNumber}`);
  }
  return lines;
}

function buildEmailLines(emails: VCardProfile['emails']): string[] {
  const lines: string[] = [];
  if (!Array.isArray(emails)) return lines;
  for (const email of emails) {
    if (!email?.email) continue;
    const type = sanitizeTypeToken(email.type ?? '');
    lines.push(`EMAIL;TYPE=${type}:${escVCardValue(email.email)}`);
  }
  return lines;
}

function buildSocialLinkLines(socialLinks: VCardProfile['social_links']): string[] {
  const lines: string[] = [];
  if (!Array.isArray(socialLinks)) return lines;
  for (const link of socialLinks) {
    const url = link?.url?.trim();
    if (!url) continue;
    const type = sanitizeTypeToken(link.platform ?? '');
    lines.push(`URL;TYPE=${type}:${escVCardValue(url)}`);
  }
  return lines;
}

function buildVCardLines(profile: VCardProfile): string[] {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

  lines.push(`FN:${escVCardValue(profile.full_name || '')}`);

  if (profile.organization) {
    lines.push(`ORG:${escVCardValue(profile.organization)}`);
  }

  lines.push(...buildPhoneLines(profile.phones));
  lines.push(...buildEmailLines(profile.emails));
  lines.push(...buildSocialLinkLines(profile.social_links));

  lines.push('END:VCARD', '');
  return lines;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'No slug' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data: profile, error } = await supabase
    .from('vcard_profiles')
    .select('*')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .single<VCardProfile>();

  if (error || !profile) {
    return res.status(404).json({ error: 'Nie znaleziono wizytówki lub jest prywatna.' });
  }

  const lines = buildVCardLines(profile);
  const vcf = lines.join('\r\n');

  const filename = safeFileName(profile.full_name);
  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.vcf"`);

  res.status(200).send(vcf);
}
