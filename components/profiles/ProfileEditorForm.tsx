// components/profiles/ProfileEditorForm.tsx

import { VCARD_DEFAULT_COLOR_DARK, VCARD_DEFAULT_COLOR_LIGHT } from "@/config/defaults";
import { SLUG_CHECK_DEBOUNCE_MS } from "@/config/timing";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { FormButtons, DeleteButton, AddButton } from "../ui/CommonButtons";
import TypedValueList, { type TypedValueItem } from "@/components/profiles/TypedValueList";
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
  Globe,
} from "lucide-react";
import { useImages } from "@/lib/imgUtils";
import { VCardProfile, NewVCardProfile } from "@/types/profiles";

interface ProfileEditorFormProps {
  initialData?: VCardProfile;
  onSubmit: (data: NewVCardProfile) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

/** Adres publiczny z nazwy: małe litery, bez polskich znaków, słowa rozdzielone myślnikiem. */
function slugFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replaceAll("ł", "l")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-");
  let start = 0;
  let end = slug.length;
  while (start < end && slug[start] === "-") start++;
  while (end > start && slug[end - 1] === "-") end--;
  return slug.slice(start, end);
}

export default function ProfileEditorForm({ initialData, onSubmit, onCancel }: Readonly<ProfileEditorFormProps>) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { handleImageUpload, uploading } = useImages();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState(() => ({
    profile_name: initialData?.profile_name || "",
    full_name: initialData?.full_name || "",
    avatar_url: initialData?.avatar_url || "",
    organization: initialData?.organization || "",
    color_light: initialData?.color_light || VCARD_DEFAULT_COLOR_LIGHT,
    color_dark: initialData?.color_dark || VCARD_DEFAULT_COLOR_DARK,
    is_public: initialData?.is_public || false,
    public_slug: initialData?.public_slug || slugFromName(initialData?.full_name || initialData?.profile_name || ""),

    phones: (initialData?.phones || []).map((p) => ({ ...p, _id: crypto.randomUUID() })),
    emails: (initialData?.emails || []).map((e) => ({ ...e, _id: crypto.randomUUID() })),
    addresses: (initialData?.addresses || []).map((a) => ({ ...a, _id: crypto.randomUUID() })),
    social_links: (initialData?.social_links || []).map((s) => ({ ...s, _id: crypto.randomUUID() })),

    business_data: initialData?.business_data || { nip: "", krs: "", bank_account: "" },
  }));

  const onAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = await handleImageUpload(e);
    if (result?.publicUrl) {
      setFormData((prev) => ({ ...prev, avatar_url: result.publicUrl }));
    }
  };

  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(!!initialData?.public_slug);

  /** Zmiana nazwy – dopóki użytkownik nie wpisał adresu sam, adres publiczny powstaje z nazwy. */
  const updateName = (field: "full_name" | "profile_name", value: string) =>
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (isSlugManuallyEdited) return next;
      return { ...next, public_slug: slugFromName(next.full_name || next.profile_name) };
    });

  useEffect(() => {
    const checkSlug = async () => {
      if (!formData.public_slug || !formData.is_public) {
        setSlugStatus("idle");
        return;
      }

      setSlugStatus("checking");

      let query = supabase.from("vcard_profiles").select("id").eq("public_slug", formData.public_slug);
      if (initialData?.id) {
        query = query.neq("id", initialData.id);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        setSlugStatus("taken");
      } else {
        setSlugStatus("available");
      }
    };

    const timeoutId = setTimeout(() => void checkSlug(), SLUG_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [formData.public_slug, formData.is_public, initialData?.id, supabase]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    const formatted = e.target.value
      .toLowerCase()
      .replaceAll(/[^a-z0-9-]/g, "-")
      .replaceAll(/-+/g, "-");
    setFormData((prev) => ({ ...prev, public_slug: formatted }));
  };

  // Listy „typ + wartość” – zmiany zawsze na najnowszym stanie (prev), bez kopii formData z domknięcia.
  type ListKey = "phones" | "emails" | "addresses";
  const addListItem = (key: ListKey, item: Record<string, string>) =>
    setFormData((p) => ({ ...p, [key]: [...p[key], { ...item, _id: crypto.randomUUID() }] }));
  const updateListItem = (key: ListKey, index: number, field: string, value: string) =>
    setFormData((p) => ({
      ...p,
      [key]: (p[key] as Record<string, string>[]).map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    }));
  const removeListItem = (key: ListKey, index: number) =>
    setFormData((p) => ({ ...p, [key]: (p[key] as unknown[]).filter((_, i) => i !== index) }));

  const addSocialLink = () => {
    setFormData((p) => ({
      ...p,
      social_links: [...(p.social_links || []), { platform: "Strona WWW", url: "", _id: crypto.randomUUID() }],
    }));
  };

  const updateSocialPlatform = (index: number, value: string) => {
    setFormData((p) => {
      const newLinks = [...(p.social_links || [])];
      newLinks[index] = { ...newLinks[index], platform: value };
      return { ...p, social_links: newLinks };
    });
  };

  const updateSocialUrl = (index: number, value: string) => {
    setFormData((p) => {
      const newLinks = [...(p.social_links || [])];
      newLinks[index] = { ...newLinks[index], url: value };
      return { ...p, social_links: newLinks };
    });
  };

  const handleSocialBlur = (index: number) => {
    setFormData((p) => {
      const newLinks = [...(p.social_links || [])];
      let currentUrl = newLinks[index]?.url?.trim();

      if (currentUrl) {
        if (!/^https?:\/\//i.test(currentUrl)) currentUrl = `https://${currentUrl}`;
        newLinks[index].url = currentUrl;

        const lowerUrl = currentUrl.toLowerCase();
        if (lowerUrl.includes("facebook.com")) newLinks[index].platform = "Facebook";
        else if (lowerUrl.includes("m.me")) newLinks[index].platform = "Messenger";
        else if (lowerUrl.includes("instagram.com")) newLinks[index].platform = "Instagram";
        else if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be"))
          newLinks[index].platform = "YouTube";
        else if (lowerUrl.includes("tiktok.com")) newLinks[index].platform = "TikTok";
        else if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) newLinks[index].platform = "X";
        else if (lowerUrl.includes("linkedin.com")) newLinks[index].platform = "LinkedIn";
        else if (newLinks[index].platform === "") newLinks[index].platform = "Strona WWW";
      }
      return { ...p, social_links: newLinks };
    });
  };

  const removeSocialLink = (index: number) => {
    setFormData((p) => ({
      ...p,
      social_links: (p.social_links || []).filter((_, i) => i !== index),
    }));
  };

  const updateBusinessData = (field: string, value: string) => {
    setFormData((p) => ({ ...p, business_data: { ...p.business_data, [field]: value } }));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validSocialLinks = formData.social_links
      .filter((item) => item.url.trim() !== "")
      .map((item) => ({
        platform: item.platform.trim() || "Strona WWW",
        url: item.url.trim(),
      }));

    const cleanData = {
      ...formData,
      phones: formData.phones.map(({ _id, ...rest }) => rest),
      emails: formData.emails.map(({ _id, ...rest }) => rest),
      addresses: formData.addresses.map(({ _id, ...rest }) => rest),
      social_links: validSocialLinks,
    };

    await onSubmit(cleanData);

    setIsSubmitting(false);
  };

  const appUrl = typeof window !== "undefined" ? window.location.hostname : "twojadomena.pl";

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <User size={24} />
        </div>
        <h2 className="section-title">{initialData ? "Edytuj wizytówkę" : "Nowa wizytówka"}</h2>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          aria-label="Zmień zdjęcie profilowe"
          className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-surface shadow-sm"
          onClick={() => fileInputRef.current?.click()}
        >
          {formData.avatar_url ? (
            <Image src={formData.avatar_url} alt="Avatar użytkownika" fill sizes="96px" className="object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8" aria-hidden="true" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-xs font-medium text-white">Zmień</span>
          </div>
        </button>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          ref={fileInputRef}
          onChange={onAvatarFileChange}
          className="hidden"
        />
        {uploading && <span className="animate-pulse text-xs text-text-muted">Wgrywanie...</span>}
      </div>

      <h3 className="flex items-center gap-2 text-base font-semibold">
        <User size={18} className="" aria-hidden="true" /> Podstawowe informacje
      </h3>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="block">
          <span className="form-label mb-1 block">Nazwa profilu (wymagane)</span>
          <input
            required
            type="text"
            placeholder="np. Służbowa, Prywatna"
            value={formData.profile_name}
            onChange={(e) => updateName("profile_name", e.target.value)}
            className="input-field w-full"
          />
        </label>
        <label className="block">
          <span className="form-label mb-1 block">Imię i nazwisko</span>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => updateName("full_name", e.target.value)}
            className="input-field w-full"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="form-label mb-1 block">Organizacja / Firma</span>
          <div className="relative">
            <Building size={16} className="absolute top-1/2 left-3 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData((prev) => ({ ...prev, organization: e.target.value }))}
              className="input-field w-full pl-9"
              placeholder="Nazwa firmy lub organizacji"
            />
          </div>
        </label>
      </div>

      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Palette size={18} className="" aria-hidden="true" /> Kolorystyka wizytówki
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="form-label mb-1 block">Wersja jasna</span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={formData.color_light}
              onChange={(e) => setFormData((prev) => ({ ...prev, color_light: e.target.value }))}
              className="h-12 w-12 cursor-pointer rounded-lg"
            />
            <span className="font-mono text-sm">{formData.color_light}</span>
          </div>
        </label>
        <label className="block">
          <span className="form-label mb-1 block">Wersja ciemna</span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={formData.color_dark}
              onChange={(e) => setFormData((prev) => ({ ...prev, color_dark: e.target.value }))}
              className="h-12 w-12 cursor-pointer rounded-lg"
            />
            <span className="font-mono text-sm">{formData.color_dark}</span>
          </div>
        </label>
      </div>

      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Phone size={18} className="" aria-hidden="true" /> Dane kontaktowe
      </h3>

      <div className="space-y-2">
        <TypedValueList
          title="Numery telefonu"
          itemLabel="numer telefonu"
          items={formData.phones as TypedValueItem[]}
          valueField="number"
          valuePlaceholder="Numer telefonu"
          inputType="tel"
          onAdd={() => addListItem("phones", { type: "Komórka", number: "" })}
          onChange={(i, field, value) => updateListItem("phones", i, field, value)}
          onRemove={(i) => removeListItem("phones", i)}
        />
        <TypedValueList
          title="Adresy e-mail"
          itemLabel="adres e-mail"
          items={formData.emails as TypedValueItem[]}
          valueField="email"
          valuePlaceholder="Adres e-mail"
          inputType="email"
          onAdd={() => addListItem("emails", { type: "Prywatny", email: "" })}
          onChange={(i, field, value) => updateListItem("emails", i, field, value)}
          onRemove={(i) => removeListItem("emails", i)}
        />
        <TypedValueList
          title="Adresy"
          itemLabel="adres"
          items={formData.addresses as TypedValueItem[]}
          valueField="address"
          valuePlaceholder="Adres"
          onAdd={() => addListItem("addresses", { type: "Biuro", address: "" })}
          onChange={(i, field, value) => updateListItem("addresses", i, field, value)}
          onRemove={(i) => removeListItem("addresses", i)}
        />
      </div>

      <h3 className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-base font-semibold">
          <LinkIcon size={18} className="" aria-hidden="true" /> Linki i Media Społecznościowe
        </div>
        <AddButton onClick={addSocialLink} small />
      </h3>

      <div className="space-y-1">
        {formData.social_links.map((social, idx) => (
          <div key={social._id} className="flex items-center gap-2">
            <label htmlFor={`social-platform-${social._id}`} className="sr-only">
              Platforma społecznościowa {idx + 1}
            </label>
            <input
              id={`social-platform-${social._id}`}
              type="text"
              placeholder="np. Facebook"
              value={social.platform}
              onChange={(e) => updateSocialPlatform(idx, e.target.value)}
              className="input-field w-24 sm:w-32"
            />

            <label htmlFor={`social-url-${social._id}`} className="sr-only">
              Adres URL profilu {idx + 1}
            </label>
            <input
              id={`social-url-${social._id}`}
              type="text"
              placeholder="Wklej adres profilu (URL)"
              value={social.url}
              onChange={(e) => updateSocialUrl(idx, e.target.value)}
              onBlur={() => handleSocialBlur(idx)}
              className="input-field flex-1"
            />

            <DeleteButton onClick={() => removeSocialLink(idx)} small />
          </div>
        ))}
      </div>

      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Briefcase size={18} aria-hidden="true" /> Dodatkowe dane
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="form-label mb-1 block">NIP</span>
          <input
            type="text"
            value={formData.business_data.nip || ""}
            onChange={(e) => updateBusinessData("nip", e.target.value)}
            className="input-field w-full"
            placeholder="np. 1234567890"
          />
        </label>
        <label className="block">
          <span className="form-label mb-1 block">KRS</span>
          <input
            type="text"
            value={formData.business_data.krs || ""}
            onChange={(e) => updateBusinessData("krs", e.target.value)}
            className="input-field w-full"
            placeholder="np. 0000123456"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="form-label mb-1 block">Numer konta bankowego</span>
          <input
            type="text"
            value={formData.business_data.bank_account || ""}
            onChange={(e) => updateBusinessData("bank_account", e.target.value)}
            className="input-field w-full font-mono text-sm"
            placeholder="IBAN / Numer konta"
          />
        </label>
      </div>

      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Globe size={18} aria-hidden="true" /> Prywatność i Udostępnianie
      </h3>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="is_public"
          checked={formData.is_public}
          onChange={(e) => setFormData((prev) => ({ ...prev, is_public: e.target.checked }))}
          className="mt-0.5 h-5 w-5 cursor-pointer rounded-lg text-primary"
        />
        <label htmlFor="is_public" className="cursor-pointer text-sm select-none">
          <span className="mb-1 block font-semibold">Udostępnij publicznie</span>
        </label>
      </div>

      {formData.is_public && (
        <div>
          <label className="block">
            <span className="form-label mb-1 block">Adres URL wizytówki:</span>
            <div className="flex items-center overflow-hidden">
              <span className="hidden px-3 py-2.5 text-sm select-none sm:inline-block">{appUrl}/v/</span>
              <span className="px-2 sm:hidden" aria-hidden="true">
                /v/
              </span>
              <input
                type="text"
                required={formData.is_public}
                value={formData.public_slug}
                onChange={handleSlugChange}
                className="input-field w-full"
                placeholder="np. jan-kowalski"
              />

              <div className="flex items-center justify-center bg-transparent px-3">
                {slugStatus === "checking" && (
                  <Loader2 className="h-5 w-5 animate-spin text-info" aria-label="Sprawdzanie dostępności adresu" />
                )}
                {slugStatus === "available" && (
                  <CheckCircle2 className="h-5 w-5 text-success" aria-label="Adres jest dostępny" />
                )}
                {slugStatus === "taken" && <XCircle className="h-5 w-5 text-danger" aria-label="Adres jest zajęty" />}
              </div>
            </div>
          </label>

          {slugStatus === "taken" && (
            <p className="mt-1.5 text-xs font-medium text-danger" role="alert">
              Ten adres jest już zajęty. Proszę wpisać inny.
            </p>
          )}
        </div>
      )}
      <FormButtons
        onClickClose={onCancel}
        loading={isSubmitting}
        disabled={formData.is_public && slugStatus === "taken"}
      />
    </form>
  );
}
