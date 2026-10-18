// lib/reportTemplate.ts
//
// Szablon PDF protokołów: własne czcionki (tytuł, nagłówki, treść) i logo
// papieru firmowego. Pliki leżą w prywatnym buckecie Supabase Storage
// „report-templates” w folderze użytkownika; w ustawieniach zapisujemy tylko
// ścieżki i nazwy plików.

import { DEFAULT_REPORT_LOGO_WIDTH } from "@/config/defaults";
import { REPORT_TEMPLATE_MAX_FONT_BYTES, REPORT_TEMPLATE_MAX_LOGO_BYTES } from "@/config/limits";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isHexColor } from "./reportColors";
import type {
  NamedReportTemplate,
  ReportFontRole,
  ReportTemplate,
  ReportTemplateAsset,
  ReportTemplateSet,
} from "@/types/reports";

export const REPORT_TEMPLATE_BUCKET = "report-templates";
export const MAX_REPORT_TEMPLATES = 5;
export const MAX_TEMPLATE_NAME = 40;
/** Id szablonu przeniesionego z czasów, gdy był tylko jeden. */
export const LEGACY_TEMPLATE_ID = "default";
export const LOGO_WIDTH_RANGE = { min: 60, max: 220 } as const;

export const FONT_ROLES: ReadonlyArray<{ role: ReportFontRole; label: string; hint: string }> = [
  { role: "title", label: "Tytuł", hint: "Temat spotkania na górze dokumentu." },
  { role: "heading", label: "Nagłówki", hint: "Nazwy sekcji, data i nagłówek tabeli zadań." },
  { role: "body", label: "Treść", hint: "Agenda, osoby, zadania i notatki." },
];

export type FontKind = "ttf" | "otf";
export type ImageKind = "png" | "jpeg";

/** Rozpoznaje czcionkę po sygnaturze pliku (nie po rozszerzeniu). */
export function detectFontKind(bytes: Uint8Array): FontKind | null {
  if (bytes.length < 4) return null;
  const [a, b, c, d] = bytes;
  if (a === 0x00 && b === 0x01 && c === 0x00 && d === 0x00) return "ttf";
  const tag = String.fromCodePoint(a, b, c, d);
  if (tag === "true") return "ttf";
  if (tag === "OTTO") return "otf";
  return null;
}

export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  return null;
}

function isAsset(value: unknown): value is ReportTemplateAsset {
  const v = value as ReportTemplateAsset | null;
  return Boolean(v && typeof v.path === "string" && v.path && typeof v.name === "string");
}

export function clampLogoWidth(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_REPORT_LOGO_WIDTH;
  return Math.min(LOGO_WIDTH_RANGE.max, Math.max(LOGO_WIDTH_RANGE.min, Math.round(n)));
}

/** Czyści zapis z bazy: tylko poprawne wpisy w folderze danego użytkownika. */
export function normalizeReportTemplate(raw: unknown, userId?: string): ReportTemplate {
  if (!raw || typeof raw !== "object") return {};
  const t = raw as ReportTemplate;
  const own = (a: ReportTemplateAsset) => !userId || a.path.startsWith(`${userId}/`);
  const fonts: ReportTemplate["fonts"] = {};
  for (const { role } of FONT_ROLES) {
    const f = t.fonts?.[role];
    if (isAsset(f) && own(f)) fonts[role] = { path: f.path, name: f.name.slice(0, 120) };
  }
  const logo =
    isAsset(t.logo) && own(t.logo)
      ? { path: t.logo.path, name: t.logo.name.slice(0, 120), width: clampLogoWidth(t.logo.width) }
      : null;
  return { fonts, logo, heading_color: isHexColor(t.heading_color) ? t.heading_color.toUpperCase() : null };
}

/**
 * Zestaw szablonów z ustawień. Dawny zapis (jeden szablon: { fonts, logo })
 * staje się szablonem „Szablon podstawowy” o id „default”.
 */
export function normalizeTemplateSet(raw: unknown, userId?: string): ReportTemplateSet {
  if (!raw || typeof raw !== "object") return { templates: [], default_id: null };
  const obj = raw as Partial<ReportTemplateSet> & ReportTemplate;
  if (!Array.isArray(obj.templates)) {
    const legacy = normalizeReportTemplate(obj, userId);
    if (!hasCustomTemplate(legacy)) return { templates: [], default_id: null };
    return {
      templates: [{ id: LEGACY_TEMPLATE_ID, name: "Szablon podstawowy", ...legacy }],
      default_id: LEGACY_TEMPLATE_ID,
    };
  }
  const seen = new Set<string>();
  const templates: NamedReportTemplate[] = [];
  for (const t of obj.templates) {
    const id = typeof t?.id === "string" ? t.id.slice(0, 40) : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof t.name === "string" && t.name.trim() ? t.name.trim().slice(0, MAX_TEMPLATE_NAME) : "Szablon";
    templates.push({ id, name, ...normalizeReportTemplate(t, userId) });
    if (templates.length >= MAX_REPORT_TEMPLATES) break;
  }
  const defaultId = templates.some((t) => t.id === obj.default_id)
    ? (obj.default_id as string)
    : (templates[0]?.id ?? null);
  return { templates, default_id: defaultId };
}

/** Szablon dla protokołu: wskazany, a gdy go nie ma – domyślny. */
export function pickTemplate(set: ReportTemplateSet, templateId?: string | null): NamedReportTemplate | null {
  return set.templates.find((t) => t.id === templateId) ?? set.templates.find((t) => t.id === set.default_id) ?? null;
}

export function newTemplateId(): string {
  return `t${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

/** Ścieżki plików szablonu (do usunięcia razem z szablonem). */
export function templateAssetPaths(t: ReportTemplate): string[] {
  return [...Object.values(t.fonts ?? {}).map((a) => a?.path), t.logo?.path].filter((p): p is string => Boolean(p));
}

export function hasCustomTemplate(t: ReportTemplate | null | undefined): boolean {
  return Boolean(t && (Object.keys(t.fonts ?? {}).length > 0 || t.logo || t.heading_color));
}

async function fileBytes(file: Blob, limit = 16): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, limit).arrayBuffer());
}

/** Sprawdza i wysyła czcionkę. Zwraca opis pliku albo komunikat błędu. */
export async function uploadFont(
  supabase: SupabaseClient,
  userId: string,
  role: ReportFontRole,
  file: File,
  templateId: string = LEGACY_TEMPLATE_ID
): Promise<ReportTemplateAsset | { error: string }> {
  if (file.size > REPORT_TEMPLATE_MAX_FONT_BYTES) return { error: "Plik czcionki może mieć najwyżej 2 MB." };
  const kind = detectFontKind(await fileBytes(file));
  if (!kind) return { error: "To nie jest czcionka TTF ani OTF. Pliki WOFF/WOFF2 nie są obsługiwane." };
  const path = `${userId}/${templateId}/font-${role}.${kind}`;
  const { error } = await supabase.storage
    .from(REPORT_TEMPLATE_BUCKET)
    .upload(path, file, { upsert: true, contentType: `font/${kind}` });
  if (error) return { error: "Nie udało się wysłać czcionki." };
  return { path, name: file.name };
}

export async function uploadLogo(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  templateId: string = LEGACY_TEMPLATE_ID
): Promise<ReportTemplateAsset | { error: string }> {
  if (file.size > REPORT_TEMPLATE_MAX_LOGO_BYTES) return { error: "Logo może mieć najwyżej 1 MB." };
  const kind = detectImageKind(await fileBytes(file));
  if (!kind) return { error: "Logo musi być plikiem PNG albo JPG." };
  const path = `${userId}/${templateId}/logo.${kind === "png" ? "png" : "jpg"}`;
  const { error } = await supabase.storage
    .from(REPORT_TEMPLATE_BUCKET)
    .upload(path, file, { upsert: true, contentType: `image/${kind}` });
  if (error) return { error: "Nie udało się wysłać logo." };
  return { path, name: file.name };
}

export async function removeTemplateAsset(supabase: SupabaseClient, path: string | string[]): Promise<void> {
  const paths = Array.isArray(path) ? path : [path];
  if (paths.length) await supabase.storage.from(REPORT_TEMPLATE_BUCKET).remove(paths);
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCodePoint(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Pliki szablonu gotowe dla pdfmake: czcionki w base64, logo jako data URL. */
export interface LoadedReportTemplate {
  fonts: Partial<Record<ReportFontRole, string>>;
  headingColor?: string | null;
  logo?: { dataUrl: string; width: number };
}

export async function loadReportTemplate(
  supabase: SupabaseClient,
  template: ReportTemplate
): Promise<LoadedReportTemplate> {
  const bucket = supabase.storage.from(REPORT_TEMPLATE_BUCKET);
  const result: LoadedReportTemplate = { fonts: {}, headingColor: template.heading_color ?? null };

  await Promise.all(
    FONT_ROLES.map(async ({ role }) => {
      const asset = template.fonts?.[role];
      if (!asset) return;
      const { data } = await bucket.download(asset.path);
      if (data) result.fonts[role] = toBase64(await data.arrayBuffer());
    })
  );

  if (template.logo) {
    const { data } = await bucket.download(template.logo.path);
    if (data) {
      const buffer = await data.arrayBuffer();
      const kind = detectImageKind(new Uint8Array(buffer.slice(0, 16)));
      if (kind) {
        result.logo = {
          dataUrl: `data:image/${kind};base64,${toBase64(buffer)}`,
          width: clampLogoWidth(template.logo.width),
        };
      }
    }
  }
  return result;
}
