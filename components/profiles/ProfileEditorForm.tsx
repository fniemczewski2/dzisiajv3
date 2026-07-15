import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { FormButtons, DeleteButton, AddButton } from '../ui/CommonButtons';
import { 
  User, 
  Building, 
  Palette, 
  Phone,  
  Link as LinkIcon, 
  Briefcase, 
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe
} from 'lucide-react';
import { useImages } from '@/lib/imgUtils';
import { VCardProfile } from '@/types/profiles';

interface ProfileEditorFormProps {
  initialData?: VCardProfile;
  onSubmit: (data: any) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

export default function ProfileEditorForm({ initialData, onSubmit, onCancel }: Readonly<ProfileEditorFormProps>) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { handleImageUpload, uploading } = useImages()
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    profile_name: initialData?.profile_name || '',
    full_name: initialData?.full_name || '',
    avatar_url: initialData?.avatar_url || '',
    organization: initialData?.organization || '',
    color_light: (initialData as any)?.color_light || '#ffffff',
    color_dark: (initialData as any)?.color_dark || '#171717',
    is_public: initialData?.is_public || false,
    public_slug: initialData?.public_slug || '',
    phones: initialData?.phones || [],
    emails: initialData?.emails || [],
    addresses: initialData?.addresses || [],
    social_links: initialData?.social_links || [],
    business_data: initialData?.business_data || { nip: '', krs: '', bank_account: '' },
  });
  const onAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = await handleImageUpload(e);
    if (result?.publicUrl) {
      setFormData((prev) => ({ ...prev, avatar_url: result.publicUrl }));
    }
  };

  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(!!initialData?.public_slug);

  useEffect(() => {
    if (!isSlugManuallyEdited && (formData.full_name || formData.profile_name)) {
      const baseName = formData.full_name || formData.profile_name;
      const safeName = baseName
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9]+/g, '-') 
        .replace(/^-|-$/g, ''); 
      
      setFormData(prev => ({ ...prev, public_slug: safeName }));
    }
  }, [formData.full_name, formData.profile_name, isSlugManuallyEdited]);

  useEffect(() => {
    const checkSlug = async () => {
      if (!formData.public_slug || !formData.is_public) {
        setSlugStatus('idle');
        return;
      }

      setSlugStatus('checking');
      
      let query = supabase.from('vcard_profiles').select('id').eq('public_slug', formData.public_slug);
      if (initialData?.id) {
        query = query.neq('id', initialData.id);
      }
      
      const { data } = await query;
      
      if (data && data.length > 0) {
        setSlugStatus('taken');
      } else {
        setSlugStatus('available');
      }
    };

    const timeoutId = setTimeout(checkSlug, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.public_slug, formData.is_public, initialData?.id, supabase]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    const formatted = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setFormData(prev => ({ ...prev, public_slug: formatted }));
  };

  const addPhone = () => setFormData(p => ({ ...p, phones: [...p.phones, { type: 'Komórka', number: '' }] }));
  const updatePhone = (index: number, field: string, value: string) => { const newPhones = [...formData.phones]; newPhones[index] = { ...newPhones[index], [field]: value }; setFormData(p => ({ ...p, phones: newPhones })); };
  const removePhone = (index: number) => setFormData(p => ({ ...p, phones: p.phones.filter((_, i) => i !== index) }));
  
  const addEmail = () => setFormData(p => ({ ...p, emails: [...p.emails, { type: 'Prywatny', email: '' }] }));
  const updateEmail = (index: number, field: string, value: string) => { const newEmails = [...formData.emails]; newEmails[index] = { ...newEmails[index], [field]: value }; setFormData(p => ({ ...p, emails: newEmails })); };
  const removeEmail = (index: number) => setFormData(p => ({ ...p, emails: p.emails.filter((_, i) => i !== index) }));
  
  const addAddress = () => setFormData(p => ({ ...p, addresses: [...p.addresses, { type: 'Biuro', address: '' }] }));
  const updateAddress = (index: number, field: string, value: string) => { const newAddresses = [...formData.addresses]; newAddresses[index] = { ...newAddresses[index], [field]: value }; setFormData(p => ({ ...p, addresses: newAddresses })); };
  const removeAddress = (index: number) => setFormData(p => ({ ...p, addresses: p.addresses.filter((_, i) => i !== index) }));

  const addSocialLink = () => {
    setFormData(p => ({
      ...p,
      social_links: [...(p.social_links || []), { platform: 'Strona WWW', url: '' }]
    }));
  };
  
  const updateSocialPlatform = (index: number, value: string) => {
    setFormData(p => {
      const newLinks = [...(p.social_links || [])];
      newLinks[index] = { ...newLinks[index], platform: value };
      return { ...p, social_links: newLinks };
    });
  };

  const updateSocialUrl = (index: number, value: string) => {
    setFormData(p => {
      const newLinks = [...(p.social_links || [])];
      newLinks[index] = { ...newLinks[index], url: value };
      return { ...p, social_links: newLinks };
    });
  };

  const handleSocialBlur = (index: number) => {
    setFormData(p => {
      const newLinks = [...(p.social_links || [])];
      let currentUrl = newLinks[index]?.url?.trim();
      
      if (currentUrl) {
        if (!/^https?:\/\//i.test(currentUrl)) currentUrl = `https://${currentUrl}`;
        newLinks[index].url = currentUrl;
        
        const lowerUrl = currentUrl.toLowerCase();
        if (lowerUrl.includes('facebook.com')) newLinks[index].platform = 'Facebook';
        else if (lowerUrl.includes('m.me')) newLinks[index].platform = 'Messenger';
        else if (lowerUrl.includes('instagram.com')) newLinks[index].platform = 'Instagram';
        else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) newLinks[index].platform = 'YouTube';
        else if (lowerUrl.includes('tiktok.com')) newLinks[index].platform = 'TikTok';
        else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) newLinks[index].platform = 'X';
        else if (lowerUrl.includes('linkedin.com')) newLinks[index].platform = 'LinkedIn';
        else if (newLinks[index].platform === '') newLinks[index].platform = 'Strona WWW';
      }
      return { ...p, social_links: newLinks };
    });
  };

  const removeSocialLink = (index: number) => {
    setFormData(p => ({
      ...p,
      social_links: (p.social_links || []).filter((_, i) => i !== index)
    }));
  };

  const updateBusinessData = (field: string, value: string) => {
    setFormData(p => ({ ...p, business_data: { ...p.business_data, [field]: value } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validSocialLinks = formData.social_links
      .filter(item => item.url.trim() !== '')
      .map(item => ({
        platform: item.platform.trim() || 'Strona WWW',
        url: item.url.trim()
      }));

    await onSubmit({
      ...formData,
      social_links: validSocialLinks
    });
    
    setIsSubmitting(false);
  };

  const appUrl = typeof window !== 'undefined' ? window.location.hostname : 'twojadomena.pl';

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto p-4 sm:p-6 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800">
      
      <div className="flex items-center gap-3 border-b pb-4 dark:border-neutral-800">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <User size={24} />
        </div>
        <h2 className="text-xl font-bold dark:text-white">
          {initialData ? 'Edytuj wizytówkę' : 'Nowa wizytówka'}
        </h2>
      </div>

      <div className="flex flex-col items-center gap-4 pb-6 border-b dark:border-neutral-800">
        <button 
          type="button"
          aria-label="Zmień zdjęcie profilowe"
          className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-2 border-primary/20 shadow-sm flex items-center justify-center relative group cursor-pointer" 
          onClick={() => fileInputRef.current?.click()}
        >
          {formData.avatar_url ? (
            <Image src={formData.avatar_url} alt="Avatar użytkownika" fill sizes="96px" className="object-cover" />
          ) : (
            <ImageIcon className="text-neutral-400 w-8 h-8" aria-hidden="true" />
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
             <span className="text-white text-xs font-medium">Zmień</span>
          </div>
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={onAvatarFileChange} className="hidden" />
        {uploading && <span className="text-xs text-neutral-500 animate-pulse">Wgrywanie...</span>}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-base flex items-center gap-2 dark:text-neutral-200">
          <User size={18} className="text-neutral-400" aria-hidden="true" /> Podstawowe informacje
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="form-label mb-1 block">Nazwa profilu (wymagane)</span>
            <input required type="text" placeholder="np. Służbowa, Prywatna" value={formData.profile_name} onChange={e => setFormData(prev => ({ ...prev, profile_name: e.target.value }))} className="input-field w-full" />
          </label>
          <label className="block">
            <span className="form-label mb-1 block">Imię i nazwisko</span>
            <input type="text" value={formData.full_name} onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))} className="input-field w-full" />
          </label>
          <label className="md:col-span-2 block">
            <span className="form-label mb-1 block">Organizacja / Firma</span>
            <div className="relative">
               <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
               <input type="text" value={formData.organization} onChange={e => setFormData(prev => ({ ...prev, organization: e.target.value }))} className="input-field w-full pl-9" placeholder="Nazwa firmy lub organizacji" />
            </div>
          </label>
        </div>
      </div>

      <div className="space-y-4 border-t pt-6 dark:border-neutral-800">
        <h3 className="font-semibold text-base flex items-center gap-2 dark:text-neutral-200">
          <Palette size={18} className="text-neutral-400" aria-hidden="true" /> Kolorystyka wizytówki
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="form-label mb-1 block">Wersja jasna</span>
            <div className="flex gap-3 items-center">
              <input type="color" value={formData.color_light} onChange={e => setFormData(prev => ({ ...prev, color_light: e.target.value }))} className="w-12 h-12 p-1 bg-white dark:bg-neutral-800 border rounded cursor-pointer dark:border-neutral-700" />
              <span className="text-sm font-mono text-neutral-500">{formData.color_light}</span>
            </div>
          </label>
          <label className="block">
            <span className="form-label mb-1 block">Wersja ciemna</span>
            <div className="flex gap-3 items-center">
              <input type="color" value={formData.color_dark} onChange={e => setFormData(prev => ({ ...prev, color_dark: e.target.value }))} className="w-12 h-12 p-1 bg-white dark:bg-neutral-800 border rounded cursor-pointer dark:border-neutral-700" />
              <span className="text-sm font-mono text-neutral-500">{formData.color_dark}</span>
            </div>
          </label>
        </div>
      </div>

      <div className="space-y-6 border-t pt-6 dark:border-neutral-800">
        <h3 className="font-semibold text-base flex items-center gap-2 dark:text-neutral-200">
          <Phone size={18} className="text-neutral-400" aria-hidden="true" /> Dane kontaktowe
        </h3>

        <div>
          <span className="form-label mb-2 block font-medium">Numery telefonu</span>
          <div className="space-y-2">
            {formData.phones.map((phone, idx) => (
              <div key={`phone-${phone.number}`} className="flex gap-2 items-center">
                <label htmlFor={`field-${phone.type}`} className="sr-only">Typ numeru</label>
                <input id={`field-${phone.type}`} type="text" placeholder="Typ" value={phone.type} onChange={e => updatePhone(idx, 'type', e.target.value)} className="input-field w-24 sm:w-32" />
                
                <label htmlFor={`field-${phone.number}`} className="sr-only">Numer telefonu</label>
                <input id={`field-${phone.number}`} type="text" placeholder="Numer" value={phone.number} onChange={e => updatePhone(idx, 'number', e.target.value)} className="input-field flex-1" />
                
                <DeleteButton onClick={() => removePhone(idx)} small />
              </div>
            ))}
          </div>
          <AddButton onClick={addPhone} small />
        </div>

        <div>
          <span className="form-label mb-2 block font-medium">Adresy e-mail</span>
          <div className="space-y-2">
            {formData.emails.map((email, idx) => (
              <div key={`email-${email.email}`} className="flex gap-2 items-center">
                <label htmlFor={`field-${email.type}`} className="sr-only">Typ e-mail</label>
                <input id={`field-${email.type}`} type="text" placeholder="Typ" value={email.type} onChange={e => updateEmail(idx, 'type', e.target.value)} className="input-field w-24 sm:w-32" />
                
                <label htmlFor={`field-${email.email}`} className="sr-only">Adres e-mail</label>
                <input id={`field-${email.email}`} type="email" placeholder="Adres e-mail" value={email.email} onChange={e => updateEmail(idx, 'email', e.target.value)} className="input-field flex-1" />
                
                <DeleteButton onClick={() => removeEmail(idx)} small />
              </div>
            ))}
          </div>
          <AddButton onClick={addEmail} small />
        </div>

        <div>
          <span className="form-label mb-2 block font-medium">Adresy</span>
          <div className="space-y-2">
            {formData.addresses.map((addr, idx) => (
              <div key={`addr-${addr.address}`} className="flex gap-2 items-center">
                <label htmlFor={`field-${addr.type}`} className="sr-only">Typ adresu</label>
                <input id={`field-${addr.type}`} type="text" placeholder="Typ" value={addr.type} onChange={e => updateAddress(idx, 'type', e.target.value)} className="input-field w-24 sm:w-32" />
                
                <label htmlFor={`field-${addr.address}`} className="sr-only">Adres fizyczny</label>
                <input id={`field-${addr.address}`} type="text" placeholder="Adres" value={addr.address} onChange={e => updateAddress(idx, 'address', e.target.value)} className="input-field flex-1" />
                
                <DeleteButton onClick={() => removeAddress(idx)} small />
              </div>
            ))}
          </div>
          <AddButton onClick={addAddress} small />
        </div>
      </div>

      <div className="space-y-4 border-t pt-6 dark:border-neutral-800">
        <h3 className="font-semibold text-base flex items-center gap-2 dark:text-neutral-200">
          <LinkIcon size={18} className="text-neutral-400" aria-hidden="true" /> Linki i Media Społecznościowe
        </h3>
        
        <div className="space-y-3">
          {formData.social_links.map((social, idx) => (
            <div key={`social-${social.url}`} className="flex gap-2 items-center">
              <label className="sr-only">Platforma społecznościowa {idx + 1}</label>
              <input type="text" placeholder="np. Facebook" value={social.platform} onChange={e => updateSocialPlatform(idx, e.target.value)} className="input-field w-24 sm:w-32" />
              
              <label className="sr-only">Adres URL profilu {idx + 1}</label>
              <input type="text" placeholder="Wklej adres profilu (URL)" value={social.url} onChange={e => updateSocialUrl(idx, e.target.value)} onBlur={() => handleSocialBlur(idx)} className="input-field flex-1" />
              
              <DeleteButton onClick={() => removeSocialLink(idx)} small />
            </div>
          ))}
        </div>
        
        <AddButton onClick={addSocialLink} small />
      </div>

      <div className="space-y-4 border-t pt-6 dark:border-neutral-800">
        <h3 className="font-semibold text-base flex items-center gap-2 dark:text-neutral-200">
          <Briefcase size={18} className="text-neutral-400" aria-hidden="true" /> Dodatkowe dane firmy
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="form-label mb-1 block">NIP</span>
            <input type="text" value={(formData.business_data as any).nip || ''} onChange={e => updateBusinessData('nip', e.target.value)} className="input-field w-full" placeholder="np. 1234567890" />
          </label>
          <label className="block">
            <span className="form-label mb-1 block">KRS</span>
            <input type="text" value={(formData.business_data as any).krs || ''} onChange={e => updateBusinessData('krs', e.target.value)} className="input-field w-full" placeholder="np. 0000123456" />
          </label>
          <label className="sm:col-span-2 block">
            <span className="form-label mb-1 block">Numer konta bankowego</span>
            <input type="text" value={(formData.business_data as any).bank_account || ''} onChange={e => updateBusinessData('bank_account', e.target.value)} className="input-field w-full font-mono text-sm" placeholder="IBAN / Numer konta" />
          </label>
        </div>
      </div>

      <div className="space-y-4 border-t pt-6 dark:border-neutral-800">
        <h3 className="font-semibold text-base flex items-center gap-2 dark:text-neutral-200">
          <Globe size={18} className="text-neutral-400" aria-hidden="true" /> Prywatność i Udostępnianie
        </h3>
        
        <div className="flex items-start gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border dark:border-neutral-800">
          <input
            type="checkbox"
            id="is_public"
            checked={formData.is_public}
            onChange={e => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          />
          <label htmlFor="is_public" className="text-sm dark:text-neutral-300 cursor-pointer select-none">
            <span className="font-semibold block mb-1 text-neutral-900 dark:text-white">Udostępnij publicznie</span>
          </label>
        </div>

        {formData.is_public && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2">
            <label className="block">
              <span className="form-label mb-1 block">Adres URL wizytówki:</span>
              <div className="flex items-center overflow-hidden border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-shadow">
                <span className="px-3 py-2.5 text-sm text-neutral-500 bg-neutral-100 dark:bg-neutral-800 border-r dark:border-neutral-700 select-none hidden sm:inline-block">
                  {appUrl}/v/
                </span>
                <span className="px-2 text-neutral-400 sm:hidden" aria-hidden="true">/v/</span>
                <input
                  type="text"
                  required={formData.is_public}
                  value={formData.public_slug}
                  onChange={handleSlugChange}
                  className="flex-1 p-2.5 bg-transparent text-sm font-medium dark:text-white outline-none w-full"
                  placeholder="np. jan-kowalski"
                />

                <div className="px-3 flex items-center justify-center bg-transparent">
                  {slugStatus === 'checking' && <Loader2 className="animate-spin text-blue-500 w-5 h-5" aria-label="Sprawdzanie dostępności adresu" />}
                  {slugStatus === 'available' && <CheckCircle2 className="text-green-500 w-5 h-5" aria-label="Adres jest dostępny" />}
                  {slugStatus === 'taken' && <XCircle className="text-red-500 w-5 h-5" aria-label="Adres jest zajęty" />}
                </div>
              </div>
            </label>
            
            {slugStatus === 'taken' && (
              <p className="mt-1.5 text-xs font-medium text-red-500" role="alert">Ten adres jest już zajęty. Proszę wpisać inny.</p>
            )}
          </div>
        )}
      </div>

      <div className="pt-6 border-t dark:border-neutral-800">
        <FormButtons 
          onClickClose={onCancel} 
          loading={isSubmitting} 
          disabled={formData.is_public && slugStatus === 'taken'}
        />
      </div>
    </form>
  );
}