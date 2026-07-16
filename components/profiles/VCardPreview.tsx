import React from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { CopyButton, DownloadButton, CopyButtonSmall } from '../ui/CommonButtons';
import { ChevronLeft } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useToast } from '@/providers/ToastProvider';
import { VCardProfile } from '@/types/profiles';

interface VCardPreviewProps {
  profile: VCardProfile;
  onBack?: () => void;
}

const getUsernameFromUrl = (url: string, platform: string) => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const path = urlObj.pathname.replace(/\/$/, '');
    const parts = path.split('/').filter(Boolean);
    const p = platform.toLowerCase();

    if (p.includes('instagram') || p.includes('tiktok') || p.includes('x') || p.includes('twitter')) {
      const handle = parts.at(-1);
      return handle?.startsWith('@') ? handle : `@${handle}`;
    }
    
    if (p.includes('linkedin')) return parts.at(-1) || urlObj.hostname.replace('www.', '');
    if (p.includes('youtube')) return parts.at(-1) || 'YouTube Channel';
    if (p.includes('facebook') || p.includes('messenger')) return parts.at(-1) || 'Facebook';

    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  }
};

const SocialIcon = ({ platform }: { platform: string; }) => {
  const p = platform.toLowerCase();
  
  if (p.includes('facebook')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>;
  if (p.includes('instagram')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-600"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
  if (p.includes('linkedin')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>;
  if (p.includes('youtube')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>;
  if (p.includes('x') || p.includes('twitter')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-800 dark:text-neutral-200"><path d="M4 4l11.733 16h4.267l-11.733 -16z"></path><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path></svg>;
  if (p.includes('tiktok')) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-900 dark:text-neutral-100"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>;

  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
};

export default function VCardPreview({ profile, onBack }: Readonly<VCardPreviewProps>) {
  const { toast } = useToast();
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const publicLink = profile.is_public && profile.public_slug 
    ? `${appUrl}/v/${profile.public_slug}` 
    : `${appUrl}/vcard-preview`;

  const downloadVCard = () => {
    let vcf = `BEGIN:VCARD\nVERSION:3.0\n`;
    vcf += `FN:${profile.full_name || ''}\n`;
    if (profile.organization) vcf += `ORG:${profile.organization}\n`;
    
    profile.phones?.forEach(phone => {
      const cleanNumber = phone.number.replace(/\s+/g, '');
      vcf += `TEL;TYPE=${phone.type.toUpperCase()},VOICE:${cleanNumber}\n`;
    });
    
    profile.emails?.forEach(email => {
      vcf += `EMAIL;TYPE=${email.type.toUpperCase()}:${email.email}\n`;
    });

    profile.addresses?.forEach(addr => {
      vcf += `ADR;TYPE=${addr.type.toUpperCase()}:;;${addr.address};;;;\n`;
    });

  if (profile.social_links) {
      Object.entries(profile.social_links).forEach(([network, rawLink]) => {
        const link = rawLink as any;

        if (typeof link === 'string' && link.trim() !== '') {
          vcf += `URL;TYPE=${network.toUpperCase()}:${link}\r\n`;
        } 
        else if (link && typeof link === 'object' && typeof link.url === 'string' && link.url.trim() !== '') {
          vcf += `URL;TYPE=${network.toUpperCase()}:${link.url}\r\n`;
        }
      });
    }
    vcf += `END:VCARD`;

    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${profile.full_name?.replace(/\s+/g, '_') || 'wizytowka'}.vcf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const copyAllData = () => {
    const text = `${profile.full_name || ''}\n${profile.organization ? profile.organization + '\n' : ''}Tel: ${profile.phones?.[0]?.number || '-'}\nEmail: ${profile.emails?.[0]?.email || '-'}`;
    navigator.clipboard.writeText(text);
    toast.success('Skopiowano!')
  };

  const bizData = profile.business_data as any || {};
  const hasBusinessData = bizData.nip || bizData.krs || bizData.bank_account;

  const { resolvedTheme } = useTheme();

  const isDarkMode = resolvedTheme === 'dark';
  const activeColor = isDarkMode 
    ? (profile.color_dark || '#171717') 
    : (profile.color_light || '#3b82f6');

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col gap-6">
        {onBack && 
        <button
          onClick={onBack}
          className="flex p-2 sm:p-2.5 bg-transparent hover:bg-surface rounded-xl text-textSecondary hover:text-text transition-colors"
          title="Wróć do listy wizytówek"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" /> <p>Wróć</p>
        </button>
        }

      <div className="card rounded-xl overflow-hidden">
        <div 
          className={`h-24 relative border-b border-black/10 dark:border-white/10 transition-colors duration-300`}
           style={{ backgroundColor: activeColor }}
       >
          {profile.avatar_url && (
            <Image
              src={profile.avatar_url}
              alt="Avatar"
              width={80}
              height={80}
              className="w-20 h-20 rounded-full border-4 border-white dark:border-neutral-900 object-cover absolute -bottom-10 left-6 bg-white transition-colors duration-300"
            />
          )}
        </div>
        
        <div className="pt-12 pb-6 px-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{profile.full_name || 'Brak danych'}</h2>
              {profile.organization && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{profile.organization}</p>}
            </div>
            <CopyButtonSmall text={`${profile.full_name}\n${profile.organization || ''}`} label="Imię i firmę" />
          </div>

          <div className="mt-6 space-y-5">
            {(profile.phones?.length > 0 || profile.emails?.length > 0) && (
              <div className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2">Kontakt</h3>
                {profile.phones?.map((p) => (
                  <div key={`tel-${p.number}`} className="flex flex-col sm:flex-row justify-between items-center text-sm py-1">
                    <span className="opacity-70 text-xs w-20">{p.type}</span>
                    <div className="flex-1 flex justify-end items-center gap-2">
                      <a href={`tel:${p.number.replace(/\s+/g, '')}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        {p.number}
                      </a>
                      <CopyButtonSmall text={p.number} label="numer" />
                    </div>
                  </div>
                ))}
                {profile.emails?.map((e) => (
                  <div key={`email-${e.email}`} className="flex flex-col sm:flex-row justify-between items-center text-sm py-1">
                    <span className="opacity-70 text-xs w-20">{e.type}</span>
                    <div className="flex-1 flex justify-end items-center gap-2">
                      <a href={`mailto:${e.email}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[180px]">
                        {e.email}
                      </a>
                      <CopyButtonSmall text={e.email} label="e-mail" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {profile.addresses?.length > 0 && (
              <div className="space-y-2 pt-3 border-t dark:border-neutral-800">
                <h3 className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2">Adresy</h3>
                {profile.addresses.map((a) => (
                  <div key={`addr-${a.address}`} className="flex flex-col sm:flex-row justify-between items-start text-sm py-1">
                    <span className="opacity-70 text-xs w-20 mt-1">{a.type}</span>
                    <div className="flex-1 flex justify-end items-start gap-2 text-right">
                      <span className="font-medium max-w-[180px]">{a.address}</span>
                      <CopyButtonSmall text={a.address} label="adres" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {profile.social_links?.length > 0 && (
              <div className="space-y-2 pt-3 border-t dark:border-neutral-800">
                <h3 className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2">Linki społecznościowe</h3>
                {profile.social_links.map((social) => {
                  if (!social.url) return null;
                  const displayUser = getUsernameFromUrl(social.url, social.platform);
                  return (
                    <div key={`social-${social.url}`} className="flex flex-row justify-between items-center gap-2">
                        <SocialIcon platform={social.platform} />
                        <a href={social.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate w-full" title={social.url}>
                          {displayUser}
                        </a>
                        <CopyButtonSmall text={social.url} label="link" />
                    </div>
                  );
                })}
              </div>
            )}

            {hasBusinessData && (
              <div className="space-y-2 pt-3 border-t dark:border-neutral-800">
                <h3 className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2">Dane Firmowe</h3>
                {bizData.nip && (
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="opacity-70 text-xs w-20">NIP</span>
                    <div className="flex-1 flex justify-end items-center gap-2">
                      <span className="font-mono">{bizData.nip}</span>
                      <CopyButtonSmall text={bizData.nip} label="NIP" />
                    </div>
                  </div>
                )}
                {bizData.krs && (
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="opacity-70 text-xs w-20">KRS</span>
                    <div className="flex-1 flex justify-end items-center gap-2">
                      <span className="font-mono">{bizData.krs}</span>
                      <CopyButtonSmall text={bizData.krs} label="KRS" />
                    </div>
                  </div>
                )}
                {bizData.bank_account && (
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="opacity-70 text-xs w-20">Nr Konta</span>
                    <div className="flex-1 flex justify-end items-center gap-2">
                      <span className="font-mono text-right max-w-[160px] truncate" title={bizData.bank_account}>{bizData.bank_account}</span>
                      <CopyButtonSmall text={bizData.bank_account} label="Nr konta" />
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="card p-4 rounded-xl flex flex-col items-center gap-4 text-center">
        <h3 className="font-semibold dark:text-white">Udostępnij profil</h3>
        
        {profile.is_public ? (
          <div className="w-full">
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 border dark:border-neutral-700 rounded-lg p-2">
              <input 
                type="text" 
                readOnly 
                value={publicLink} 
                className="flex-1 bg-transparent text-sm outline-none text-neutral-700 dark:text-neutral-300 truncate"
              />
              <CopyButtonSmall text={publicLink} label="link publiczny" />
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded w-full">
            Wizytówka jest prywatna. Zmień ustawienia w edycji, aby wygenerować publiczny adres i aktywny kod QR.
          </p>
        )}

        <div className="bg-white p-3 rounded-xl shadow-sm border mt-2">
          <QRCodeSVG 
            value={profile.is_public ? publicLink : 'Wizytówka jest prywatna.'} 
            size={150} 
            level="M" 
          />
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          <DownloadButton
            onClick={downloadVCard}
            fileFormat='.vcf'
          />

          <CopyButton
            onClick={() => copyAllData()}
            />
        </div>
      </div>
    </div>
  );
}