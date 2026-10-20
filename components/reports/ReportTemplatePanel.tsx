// components/reports/ReportTemplatePanel.tsx

import { DEFAULT_REPORT_LOGO_WIDTH, DEFAULT_REPORT_HEADING_COLOR } from "@/config/defaults";
import React, { useId, useRef, useState } from "react";
import { Eye, Star } from "lucide-react";
import { derivePalette, isHexColor } from "@/lib/reportColors";
import { CATEGORY_PALETTE } from "@/lib/categoryColors";
import { useReportTemplates } from "@/hooks/useReportTemplate";
import { FONT_ROLES, LOGO_WIDTH_RANGE, MAX_TEMPLATE_NAME } from "@/lib/reportTemplate";
import { previewReportTemplate } from "@/lib/reportExport";
import { useToast } from "@/providers/ToastProvider";
import { AddButton, DeleteButton, FavButton, UploadButton } from "../ui/CommonButtons";

function FilePickerButton({
  id,
  accept,
  label,
  disabled,
  onFile,
}: Readonly<{ id: string; accept: string; label: string; disabled?: boolean; onFile: (f: File) => void }>) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        // Pole uruchamia przycisk obok – poza kolejnością tabulacji, z tą samą nazwą co przycisk.
        tabIndex={-1}
        aria-label={label}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <UploadButton
        onClick={() => inputRef.current?.click()}
        fileFormat={accept
          .split(",")
          .map((x) => (x.includes("/") ? `.${x.slice(x.lastIndexOf("/") + 1)}` : x))
          .join(" ")}
        ariaLabel={label}
        small
      />
    </>
  );
}

export default function ReportTemplatePanel() {
  const id = useId();
  const { toast } = useToast();
  const t = useReportTemplates();
  const { set, busy } = t;
  const [chosenId, setChosenId] = useState<string | null>(set.default_id);
  // Wybrany szablon zniknął (usunięty w innej karcie) – pokazujemy domyślny.
  const selectedId = chosenId && set.templates.some((x) => x.id === chosenId) ? chosenId : set.default_id;
  const [newName, setNewName] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [logoWidthDraft, setLogoWidthDraft] = useState<number | null>(null);
  const [colorDraft, setColorDraft] = useState<string | null>(null);

  const template = set.templates.find((x) => x.id === selectedId) ?? null;
  const width = logoWidthDraft ?? template?.logo?.width ?? DEFAULT_REPORT_LOGO_WIDTH;
  const isBusy = (key: string) => busy === `${template?.id}:${key}`;
  const chosenColor = colorDraft ?? template?.heading_color ?? DEFAULT_REPORT_HEADING_COLOR;
  const palette = derivePalette(chosenColor);
  const adjusted = isHexColor(chosenColor) && palette.heading !== chosenColor.toUpperCase();
  const saveColor = (color: string | null) => {
    if (!template) return;
    setColorDraft(null);
    void t.setHeadingColor(template.id, color);
  };

  const add = async () => {
    const newId = await t.addTemplate(newName || `Szablon ${set.templates.length + 1}`);
    if (newId) {
      setChosenId(newId);
      setNewName("");
    }
  };

  const preview = async () => {
    if (!template) return;
    // Karta otwierana synchronicznie w kliknięciu – inaczej blokada wyskakujących okien.
    const win = window.open("", "_blank");
    setPreviewing(true);
    try {
      await previewReportTemplate(await t.load(template.id), win);
    } catch (err) {
      win?.close();
      console.error("[reports] podgląd szablonu:", err);
      toast.error("Nie udało się otworzyć podglądu. Sprawdź, czy czcionki to poprawne pliki TTF/OTF.");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <section aria-labelledby={`${id}-h`} className="form-card max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <h3 id={`${id}-h`} className="text-lg font-bold text-text">
          Szablony PDF
        </h3>
      </div>

      {/* Lista szablonów */}
      <fieldset className="min-w-0">
        <legend className="sr-only">Wybierz szablon do edycji</legend>
        <ul className="flex scrollbar-thin gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:px-0">
          {set.templates.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                aria-pressed={selectedId === x.id}
                onClick={() => setChosenId(x.id)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium ${
                  selectedId === x.id
                    ? "border-text bg-text text-card"
                    : "border-line-strong text-text-secondary hover:text-text"
                }`}
              >
                {set.default_id === x.id && <Star className="h-3.5 w-3.5" aria-label="Domyślny" />}
                {x.name}
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      {!t.maxReached && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`${id}-new`} className="sr-only">
            Nazwa szablonu
          </label>
          <input
            id={`${id}-new`}
            value={newName}
            maxLength={MAX_TEMPLATE_NAME}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void add();
              }
            }}
            placeholder="Nowy szablon, np. Fundacja A"
            className="input-field min-w-48 flex-1"
          />
          <AddButton onClick={() => void add()} small />
        </div>
      )}

      {set.templates.length === 0 && (
        <p className="text-sm text-text-secondary">
          Nie masz jeszcze szablonów – PDF ma wygląd domyślny. Dodaj pierwszy szablon powyżej.
        </p>
      )}

      {template && (
        <div className="space-y-4 rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1">
              <label htmlFor={`${id}-name`} className="form-label">
                Nazwa szablonu:
              </label>
              <input
                key={template.id}
                id={`${id}-name`}
                defaultValue={template.name}
                maxLength={MAX_TEMPLATE_NAME}
                onBlur={(e) =>
                  e.target.value.trim() !== template.name && void t.renameTemplate(template.id, e.target.value)
                }
                className="input-field"
              />
            </div>
            <div className="flex flex-nowrap gap-2">
              {set.default_id !== template.id && (
                <FavButton onClick={() => void t.setDefault(template.id)} label="Ustaw jako domyślny" small />
              )}
              <DeleteButton
                small
                onClick={() => void t.removeTemplate(template.id)}
                ariaLabel={`Usuń szablon ${template.name}`}
              />
            </div>
          </div>

          <fieldset className="min-w-0 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">Kolor nagłówków:</legend>
              <label htmlFor={`${id}-color`} className="sr-only">
                Własny kolor nagłówków
              </label>
              <input
                key={template.id}
                id={`${id}-color`}
                type="color"
                value={isHexColor(chosenColor) ? chosenColor.toLowerCase() : DEFAULT_REPORT_HEADING_COLOR.toLowerCase()}
                onChange={(e) => setColorDraft(e.target.value)}
                onBlur={() => colorDraft && saveColor(colorDraft.toUpperCase())}
                className="h-7 w-14 cursor-pointer rounded-lg border-0"
                style={{ backgroundColor: isHexColor(chosenColor) ? chosenColor : DEFAULT_REPORT_HEADING_COLOR }}
              />
            </div>

            <ul
              className="flex scrollbar-thin gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:px-0"
              aria-label="Gotowe kolory"
            >
              {CATEGORY_PALETTE.map((c) => (
                <li className="" key={c.value}>
                  <button
                    type="button"
                    onClick={() => saveColor(c.value)}
                    aria-label={`Kolor nagłówków: ${c.name}`}
                    aria-pressed={chosenColor.toUpperCase() === c.value.toUpperCase()}
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                  >
                    <span aria-hidden="true" className="h-7 w-7 rounded-full" style={{ backgroundColor: c.value }} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="rounded-lg border border-line bg-white p-4" aria-hidden="true">
              <p style={{ color: palette.heading }} className="text-lg font-bold">
                Posiedzenie zarządu
              </p>
              <p style={{ color: palette.muted }} className="text-sm">
                20 kwietnia 2137
              </p>
              <p style={{ color: palette.heading }} className="mt-3 text-sm font-bold">
                Zadania
              </p>
              <p style={{ color: palette.ink, borderBottom: `1px solid ${palette.rule}` }} className="py-1 text-sm">
                1. Przygotować sprawozdanie
              </p>
            </div>
            {adjusted && (
              <output className="block text-sm text-text-secondary">
                Ten kolor jest za jasny na białym tle – w dokumencie użyjemy ciemniejszego odcienia ({palette.heading}).
              </output>
            )}
          </fieldset>

          <fieldset className="min-w-0 space-y-3">
            <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">Czcionki:</legend>
            {FONT_ROLES.map(({ role, label, hint }) => {
              const current = template.fonts?.[role];
              return (
                <div
                  key={role}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line p-3"
                >
                  <div className="flex w-full min-w-40 flex-wrap justify-between gap-2">
                    <p className="font-medium text-text">{label}</p>
                    <div className="flex items-center gap-2">
                      <FilePickerButton
                        id={`${id}-${template.id}-${role}`}
                        accept=".ttf,.otf,font/ttf,font/otf"
                        label={current ? "Zmień" : "Wgraj czcionkę"}
                        disabled={busy !== null}
                        onFile={(f) => void t.setFont(template.id, role, f)}
                      />
                      {current && (
                        <DeleteButton
                          small
                          onClick={() => void t.clearFont(template.id, role)}
                          disabled={busy !== null}
                          ariaLabel={`Usuń czcionkę: ${label}`}
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {current ? <span className="break-all">{current.name}</span> : hint}
                  </p>

                  {isBusy(role) && <output className="text-sm text-text-secondary">Zapisuję…</output>}
                </div>
              );
            })}
          </fieldset>

          <fieldset className="min-w-0 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">Logo:</legend>
              <div className="flex items-center gap-2">
                <FilePickerButton
                  id={`${id}-${template.id}-logo`}
                  accept="image/png,image/jpeg"
                  label={template.logo ? "Zmień" : "Wgraj logo"}
                  disabled={busy !== null}
                  onFile={(f) => void t.setLogo(template.id, f)}
                />
                {template.logo && (
                  <DeleteButton
                    small
                    onClick={() => void t.clearLogo(template.id)}
                    disabled={busy !== null}
                    ariaLabel="Usuń logo"
                  />
                )}
              </div>
            </div>
            {template.logo && (
              <div>
                <label htmlFor={`${id}-width`} className="form-label">
                  Szerokość logo: <span className="tabular-nums">{width} pt</span>
                </label>
                <input
                  id={`${id}-width`}
                  type="range"
                  min={LOGO_WIDTH_RANGE.min}
                  max={LOGO_WIDTH_RANGE.max}
                  step={10}
                  value={width}
                  onChange={(e) => setLogoWidthDraft(Number(e.target.value))}
                  onPointerUp={() => logoWidthDraft !== null && void t.setLogoWidth(template.id, logoWidthDraft)}
                  onKeyUp={() => logoWidthDraft !== null && void t.setLogoWidth(template.id, logoWidthDraft)}
                  className="w-full"
                />
              </div>
            )}
          </fieldset>

          <button
            type="button"
            onClick={() => void preview()}
            disabled={previewing || busy !== null}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-secondary px-4 font-semibold text-white hover:bg-secondary-hover disabled:opacity-50 sm:w-fit"
          >
            {previewing ? "Przygotowuję…" : `Podgląd PDF`}
            <Eye className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
