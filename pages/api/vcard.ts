import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { VCardProfile } from '@/types/profiles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function escVCardValue(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function sanitizeTypeToken(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
  return cleaned || 'OTHER';
}

function safeFileName(raw: string | undefined): string {
  const cleaned = (raw ?? '').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'wizytowka';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'No slug' });
  }

  const { data: profile, error } = await supabase
    .from('vcard_profiles')
    .select('*')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .single<VCardProfile>();

  if (error || !profile) {
    return res.status(404).json({ error: 'Nie znaleziono wizytówki lub jest prywatna.' });
  }

  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

  lines.push(`FN:${escVCardValue(profile.full_name || '')}`);

  if (profile.organization) {
    lines.push(`ORG:${escVCardValue(profile.organization)}`);
  }

  if (Array.isArray(profile.phones)) {
    for (const phone of profile.phones) {
      if (!phone?.number) continue;
      const cleanNumber = escVCardValue(phone.number.replace(/\s+/g, ''));
      const type = sanitizeTypeToken(phone.type ?? '');
      lines.push(`TEL;TYPE=${type},VOICE:${cleanNumber}`);
    }
  }

  if (Array.isArray(profile.emails)) {
    for (const email of profile.emails) {
      if (!email?.email) continue;
      const type = sanitizeTypeToken(email.type ?? '');
      lines.push(`EMAIL;TYPE=${type}:${escVCardValue(email.email)}`);
    }
  }

  if (Array.isArray(profile.social_links)) {
    for (const link of profile.social_links) {
      const url = link?.url?.trim();
      if (!url) continue;
      const type = sanitizeTypeToken(link.platform ?? '');
      lines.push(`URL;TYPE=${type}:${escVCardValue(url)}`);
    }
  }

  lines.push('END:VCARD', '');
  const vcf = lines.join('\r\n');

  const filename = safeFileName(profile.full_name);
  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.vcf"`);

  res.status(200).send(vcf);
}