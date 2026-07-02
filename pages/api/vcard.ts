import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Brak parametru slug' });
  }

  const { data: profile, error } = await supabase
    .from('vcard_profiles')
    .select('*')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .single();

  if (error || !profile) {
    return res.status(404).json({ error: 'Nie znaleziono wizytówki lub jest prywatna.' });
  }

  let vcf = `BEGIN:VCARD\r\nVERSION:3.0\r\n`;
  vcf += `FN:${profile.full_name || ''}\r\n`;
  
  if (profile.organization) {
    vcf += `ORG:${profile.organization}\r\n`;
  }
  
  if (profile.phones && Array.isArray(profile.phones)) {
    profile.phones.forEach((phone: any) => {
      const cleanNumber = phone.number.replace(/\s+/g, '');
      vcf += `TEL;TYPE=${phone.type.toUpperCase()},VOICE:${cleanNumber}\r\n`;
    });
  }
  
  if (profile.emails && Array.isArray(profile.emails)) {
    profile.emails.forEach((email: any) => {
      vcf += `EMAIL;TYPE=${email.type.toUpperCase()}:${email.email}\r\n`;
    });
  }

  if (profile.social_links) {
    Object.entries(profile.social_links).forEach(([network, link]) => {
      if (link) vcf += `URL;TYPE=${network.toUpperCase()}:${link}\r\n`;
    });
  }

  vcf += `END:VCARD\r\n`;

  const safeFilename = profile.full_name?.replace(/\s+/g, '_') || 'wizytowka';
  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.vcf"`);
  
  res.status(200).send(vcf);
}