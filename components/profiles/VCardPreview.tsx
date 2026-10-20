// components/profiles/VCardPreview.tsx

import { VCARD_DEFAULT_COLOR_DARK, VCARD_DEFAULT_COLOR_LIGHT } from "@/config/defaults";
import React from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { CopyButton, DownloadButton, CopyButtonSmall } from "../ui/CommonButtons";
import { ChevronLeft } from "lucide-react";
import { useTheme } from "next-themes";
import { useToast } from "@/providers/ToastProvider";
import { VCardProfile } from "@/types/profiles";
import { sanitizeHref } from "@/lib/sanitize";
import { buildVCard, safeFileName } from "@/lib/vcard";

interface VCardPreviewProps {
  profile: VCardProfile;
  onBack?: () => void;
}

const getUsernameFromUrl = (url: string, platform: string) => {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = urlObj.pathname.replace(/\/$/, "");
    const parts = path.split("/").filter(Boolean);
    const p = platform.toLowerCase();

    if (p.includes("instagram") || p.includes("tiktok") || p.includes("x") || p.includes("twitter")) {
      const handle = parts.at(-1);
      return handle?.startsWith("@") ? handle : `@${handle}`;
    }

    if (p.includes("linkedin")) return parts.at(-1) || urlObj.hostname.replace("www.", "");
    if (p.includes("youtube")) return parts.at(-1) || "YouTube Channel";
    if (p.includes("facebook") || p.includes("messenger")) return parts.at(-1) || "Facebook";

    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  }
};

const SocialIcon = ({ platform }: { platform: string }) => {
  const p = platform.toLowerCase();

  if (p.includes("facebook"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-info"
      >
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
      </svg>
    );
  if (p.includes("instagram"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-deco-pink"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    );
  if (p.includes("linkedin"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-info"
      >
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
        <rect x="2" y="9" width="4" height="12"></rect>
        <circle cx="4" cy="4" r="2"></circle>
      </svg>
    );
  if (p.includes("youtube"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-danger"
      >
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path>
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
      </svg>
    );
  if (p.includes("x") || p.includes("twitter"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-text"
      >
        <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
        <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
      </svg>
    );
  if (p.includes("tiktok"))
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-text"
      >
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
      </svg>
    );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-muted"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  );
};

export default function VCardPreview({ profile, onBack }: Readonly<VCardPreviewProps>) {
  const { toast } = useToast();
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const publicLink =
    profile.is_public && profile.public_slug ? `${appUrl}/v/${profile.public_slug}` : `${appUrl}/vcard-preview`;

  const downloadVCard = () => {
    const vcf = buildVCard({
      fullName: profile.full_name ?? "",
      organization: profile.organization,
      phones: profile.phones,
      emails: profile.emails,
      addresses: profile.addresses,
      urls: (profile.social_links ?? []).map((link) => ({ type: link.platform, url: link.url })),
    });

    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${safeFileName(profile.full_name)}.vcf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const copyAllData = async () => {
    const text = `${profile.full_name || ""}\n${profile.organization ? profile.organization + "\n" : ""}Tel: ${profile.phones?.[0]?.number || "-"}\nEmail: ${profile.emails?.[0]?.email || "-"}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Skopiowano!");
    } catch {
      toast.error("Nie udało się skopiować.");
    }
  };

  const bizData = profile.business_data || {};
  const hasBusinessData = bizData.nip || bizData.krs || bizData.bank_account;

  const { resolvedTheme } = useTheme();

  const isDarkMode = resolvedTheme === "dark";
  const activeColor = isDarkMode
    ? profile.color_dark || VCARD_DEFAULT_COLOR_DARK
    : profile.color_light || VCARD_DEFAULT_COLOR_LIGHT;

  const organizations: string[] = profile.organization?.split(",") || [""];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-4">
      {onBack && (
        <button
          onClick={onBack}
          type="button"
          className="flex items-center rounded-xl bg-transparent p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text sm:p-2.5"
          title="Wróć do listy wizytówek"
          aria-label="Wróć do listy wizytówek"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" /> <p>Wróć</p>
        </button>
      )}

      <div className="card overflow-hidden">
        <div
          className={`relative h-24 border-b border-line transition-colors duration-300`}
          style={{ backgroundColor: activeColor }}
        >
          {profile.avatar_url && (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name ? `Zdjęcie: ${profile.full_name}` : "Zdjęcie profilowe"}
              width={80}
              height={80}
              className="absolute -bottom-10 left-6 h-20 w-20 rounded-full border-4 border-card bg-card object-cover transition-colors duration-300"
            />
          )}
        </div>

        <div className="px-4 pt-12 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{profile.full_name || "Brak danych"}</h2>
              {organizations?.map((o: string) => (
                <p key={o} className="mt-0.5 text-sm text-text-muted">
                  {o}
                </p>
              ))}
            </div>
            <CopyButtonSmall text={`${profile.full_name}\n${profile.organization || ""}`} label="Imię i firmę" />
          </div>

          <div className="mt-6 space-y-5">
            {(profile.phones?.length > 0 || profile.emails?.length > 0) && (
              <div className="space-y-2">
                <h3 className="mb-2 text-xs font-semibold text-text-muted">Kontakt</h3>
                {profile.phones?.map((p) => (
                  <div
                    key={`tel-${p.number}`}
                    className="flex flex-col justify-between py-1 text-sm sm:flex-row sm:items-center"
                  >
                    <span className="w-20 text-xs opacity-70">{p.type}</span>
                    <div className="flex flex-1 items-center justify-end gap-2">
                      <a
                        href={`tel:${p.number.replaceAll(/\s+/g, "")}`}
                        className="font-medium text-info hover:underline"
                      >
                        {p.number}
                      </a>
                      <CopyButtonSmall text={p.number} label="numer" />
                    </div>
                  </div>
                ))}
                {profile.emails?.map((e) => (
                  <div
                    key={`email-${e.email}`}
                    className="flex flex-col justify-between py-1 text-sm sm:flex-row sm:items-center"
                  >
                    <span className="w-20 text-xs opacity-70">{e.type}</span>
                    <div className="flex flex-1 items-center justify-end gap-2">
                      <a href={`mailto:${e.email}`} className="truncate font-medium text-info hover:underline">
                        {e.email}
                      </a>
                      <CopyButtonSmall text={e.email} label="e-mail" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {profile.addresses?.length > 0 && (
              <div className="space-y-2 border-t border-line pt-3">
                <h3 className="mb-2 text-xs font-semibold text-text-muted">Adresy</h3>
                {profile.addresses.map((a) => (
                  <div key={`addr-${a.address}`} className="flex flex-row items-start justify-between py-1 text-sm">
                    <span className="mt-1 w-20 text-xs opacity-70">{a.type}</span>
                    <div className="flex flex-1 items-start justify-end gap-2 text-right">
                      <span className="font-medium">{a.address}</span>
                      <CopyButtonSmall text={a.address} label="adres" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {profile.social_links?.length > 0 && (
              <div className="space-y-2 border-t border-line pt-3">
                <h3 className="mb-2 text-xs font-semibold text-text-muted">Linki społecznościowe</h3>
                {profile.social_links.map((social) => {
                  const safeUrl = social.url ? sanitizeHref(social.url) : null;
                  if (!safeUrl) return null;
                  const displayUser = getUsernameFromUrl(social.url, social.platform);
                  return (
                    <div key={`social-${social.url}`} className="flex flex-row items-center justify-between gap-2">
                      <SocialIcon platform={social.platform} />
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full truncate font-medium text-info hover:underline"
                        title={social.url}
                      >
                        {displayUser}
                      </a>
                      <CopyButtonSmall text={social.url} label="link" />
                    </div>
                  );
                })}
              </div>
            )}

            {hasBusinessData && (
              <div className="space-y-2 border-t border-line pt-3">
                <h3 className="mb-2 text-xs font-semibold text-text-muted">Pozostałe Dane</h3>
                {bizData.nip && (
                  <div className="flex items-center justify-between py-1 text-sm">
                    <span className="w-20 text-xs opacity-70">NIP</span>
                    <div className="flex flex-1 items-center justify-end gap-2">
                      <span className="font-mono">{bizData.nip}</span>
                      <CopyButtonSmall text={bizData.nip} label="NIP" />
                    </div>
                  </div>
                )}
                {bizData.krs && (
                  <div className="flex items-center justify-between py-1 text-sm">
                    <span className="w-20 text-xs opacity-70">KRS</span>
                    <div className="flex flex-1 items-center justify-end gap-2">
                      <span className="font-mono">{bizData.krs}</span>
                      <CopyButtonSmall text={bizData.krs} label="KRS" />
                    </div>
                  </div>
                )}
                {bizData.bank_account && (
                  <div className="flex items-center justify-between py-1 text-sm">
                    <span className="text-xs opacity-70">Nr Konta</span>
                    <div className="flex w-full flex-1 items-center justify-end gap-2">
                      <span className="w-fit text-right font-mono text-wrap" title={bizData.bank_account}>
                        {bizData.bank_account}
                      </span>
                      <CopyButtonSmall text={bizData.bank_account} label="Nr konta" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card flex flex-col items-center gap-4 p-4 text-center">
        <h3 className="font-semibold text-text">Udostępnij profil</h3>

        {profile.is_public ? (
          <div className="w-full">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface p-2">
              <input
                type="text"
                readOnly
                aria-label="Publiczny link do wizytówki"
                value={publicLink}
                className="flex-1 truncate rounded bg-transparent text-sm text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <CopyButtonSmall text={publicLink} label="link publiczny" />
            </div>
          </div>
        ) : (
          <p className="w-full rounded-lg bg-warning-soft p-2 text-xs text-warning">
            Wizytówka jest prywatna. Zmień ustawienia w edycji, aby wygenerować publiczny adres i aktywny kod QR.
          </p>
        )}

        <div className="mt-2 rounded-xl border bg-white p-3 shadow-sm">
          <QRCodeSVG value={profile.is_public ? publicLink : "Wizytówka jest prywatna."} size={150} level="M" />
        </div>

        <div className="mt-2 grid w-full grid-cols-2 gap-3">
          <DownloadButton onClick={downloadVCard} fileFormat=".vcf" />

          <CopyButton onClick={() => copyAllData()} />
        </div>
      </div>
    </div>
  );
}
