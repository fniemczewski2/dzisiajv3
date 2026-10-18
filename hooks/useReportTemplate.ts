// hooks/useReportTemplate.ts
//
// Szablony PDF protokołów (do 5) zapisane w ustawieniach + operacje na
// plikach w Storage. Każda zmiana zapisuje się od razu.

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useSettings } from "@/hooks/db/useSettings";
import { useToast } from "@/providers/ToastProvider";
import type { NamedReportTemplate, ReportFontRole, ReportTemplateSet } from "@/types/reports";
import {
  MAX_REPORT_TEMPLATES,
  MAX_TEMPLATE_NAME,
  clampLogoWidth,
  hasCustomTemplate,
  loadReportTemplate,
  newTemplateId,
  normalizeTemplateSet,
  pickTemplate,
  removeTemplateAsset,
  templateAssetPaths,
  uploadFont,
  uploadLogo,
  type LoadedReportTemplate,
} from "@/lib/reportTemplate";

export function useReportTemplates() {
  const { user, supabase } = useAuth();
  const userId = user?.id;
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const set = useMemo(() => normalizeTemplateSet(settings.report_template, userId), [settings.report_template, userId]);

  const save = useCallback(
    async (next: ReportTemplateSet) => {
      const { error } = await updateSettings({ report_template: next });
      return !error;
    },
    [updateSettings]
  );

  const patchTemplate = useCallback(
    (id: string, patch: (t: NamedReportTemplate) => NamedReportTemplate) =>
      save({ ...set, templates: set.templates.map((t) => (t.id === id ? patch(t) : t)) }),
    [set, save]
  );

  const addTemplate = useCallback(
    async (name: string): Promise<string | null> => {
      if (set.templates.length >= MAX_REPORT_TEMPLATES) {
        toast.error(`Możesz mieć najwyżej ${MAX_REPORT_TEMPLATES} szablonów.`);
        return null;
      }
      const id = newTemplateId();
      const template: NamedReportTemplate = {
        id,
        name: name.trim().slice(0, MAX_TEMPLATE_NAME) || "Nowy szablon",
        fonts: {},
        logo: null,
      };
      const ok = await save({ templates: [...set.templates, template], default_id: set.default_id ?? id });
      return ok ? id : null;
    },
    [set, save, toast]
  );

  const renameTemplate = useCallback(
    (id: string, name: string) =>
      patchTemplate(id, (t) => ({ ...t, name: name.trim().slice(0, MAX_TEMPLATE_NAME) || t.name })),
    [patchTemplate]
  );

  const setDefault = useCallback((id: string) => save({ ...set, default_id: id }), [set, save]);

  const removeTemplate = useCallback(
    async (id: string) => {
      const template = set.templates.find((t) => t.id === id);
      if (!template) return;
      const ok = await toast.confirm(
        `Usunąć szablon „${template.name}”? Protokoły z tym szablonem dostaną szablon domyślny.`
      );
      if (!ok) return;
      const templates = set.templates.filter((t) => t.id !== id);
      const defaultId = set.default_id === id ? (templates[0]?.id ?? null) : set.default_id;
      if (await save({ templates, default_id: defaultId }))
        await removeTemplateAsset(supabase, templateAssetPaths(template));
    },
    [set, save, supabase, toast]
  );

  const setFont = useCallback(
    async (id: string, role: ReportFontRole, file: File) => {
      if (!userId) return;
      setBusy(`${id}:${role}`);
      try {
        const result = await uploadFont(supabase, userId, role, file, id);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        const old = set.templates.find((t) => t.id === id)?.fonts?.[role];
        if (old && old.path !== result.path) await removeTemplateAsset(supabase, old.path);
        await patchTemplate(id, (t) => ({ ...t, fonts: { ...t.fonts, [role]: result } }));
      } finally {
        setBusy(null);
      }
    },
    [supabase, userId, set, patchTemplate, toast]
  );

  const clearFont = useCallback(
    async (id: string, role: ReportFontRole) => {
      const old = set.templates.find((t) => t.id === id)?.fonts?.[role];
      if (!old) return;
      setBusy(`${id}:${role}`);
      try {
        const ok = await patchTemplate(id, (t) => {
          const fonts = { ...t.fonts };
          delete fonts[role];
          return { ...t, fonts };
        });
        if (ok) await removeTemplateAsset(supabase, old.path);
      } finally {
        setBusy(null);
      }
    },
    [supabase, set, patchTemplate]
  );

  const setLogo = useCallback(
    async (id: string, file: File) => {
      if (!userId) return;
      setBusy(`${id}:logo`);
      try {
        const result = await uploadLogo(supabase, userId, file, id);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        const old = set.templates.find((t) => t.id === id)?.logo;
        if (old && old.path !== result.path) await removeTemplateAsset(supabase, old.path);
        await patchTemplate(id, (t) => ({ ...t, logo: { ...result, width: clampLogoWidth(old?.width) } }));
      } finally {
        setBusy(null);
      }
    },
    [supabase, userId, set, patchTemplate, toast]
  );

  const setLogoWidth = useCallback(
    (id: string, width: number) =>
      patchTemplate(id, (t) => (t.logo ? { ...t, logo: { ...t.logo, width: clampLogoWidth(width) } } : t)),
    [patchTemplate]
  );

  const clearLogo = useCallback(
    async (id: string) => {
      const old = set.templates.find((t) => t.id === id)?.logo;
      if (!old) return;
      setBusy(`${id}:logo`);
      try {
        if (await patchTemplate(id, (t) => ({ ...t, logo: null }))) await removeTemplateAsset(supabase, old.path);
      } finally {
        setBusy(null);
      }
    },
    [supabase, set, patchTemplate]
  );

  const setHeadingColor = useCallback(
    (id: string, color: string | null) => patchTemplate(id, (t) => ({ ...t, heading_color: color })),
    [patchTemplate]
  );

  /** Pliki szablonu dla PDF (wskazany albo domyślny). Błąd pobierania → wygląd domyślny. */
  const load = useCallback(
    async (templateId?: string | null): Promise<LoadedReportTemplate | undefined> => {
      const template = pickTemplate(set, templateId);
      if (!template || !hasCustomTemplate(template)) return undefined;
      try {
        return await loadReportTemplate(supabase, template);
      } catch {
        toast.error("Nie udało się wczytać szablonu – PDF ma wygląd domyślny.");
        return undefined;
      }
    },
    [supabase, set, toast]
  );

  return {
    set,
    busy,
    addTemplate,
    renameTemplate,
    setDefault,
    removeTemplate,
    setFont,
    clearFont,
    setLogo,
    setLogoWidth,
    clearLogo,
    setHeadingColor,
    load,
    maxReached: set.templates.length >= MAX_REPORT_TEMPLATES,
  };
}
