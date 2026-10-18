// pages/notes/reports.tsx
//
// Protokoły: lista pogrupowana po miesiącach, wyszukiwanie i sortowanie,
// karta z datą, skrótem treści i rozwijanymi szczegółami. Edycja otwiera
// ten sam formularz co dodawanie. Każdy protokół może mieć własny szablon PDF.

import React, { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useReports } from "@/hooks/db/useReports";
import ReportForm from "@/components/reports/ReportForm";
import { useReportTemplates } from "@/hooks/useReportTemplate";
import { pickTemplate } from "@/lib/reportTemplate";
import {
  downloadReportMarkdown,
  downloadReportPDF,
  formatReportDate,
  reportAgenda,
  reportParticipants,
  reportTasks,
} from "@/lib/reportExport";
import type { NamedReportTemplate, Report, ReportTask } from "@/types/reports";
import { AddButton, DeleteButton, DownloadButton, EditButton, ToTasksButton } from "@/components/ui/CommonButtons";
import ReportTasksToApp from "@/components/reports/ReportTasksToApp";
import SearchBar from "@/components/ui/SearchBar";
import NoResultsState from "@/components/ui/NoResultsState";
import Seo from "@/components/ui/SEO";
import { SkeletonReport } from "@/components/ui/Skeleton";
import { useToast } from "@/providers/ToastProvider";

type SortKey = "newest" | "oldest" | "topic";

const monthFmt = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" });

interface CardProps {
  report: Report;
  template: NamedReportTemplate | null;
  isDefaultTemplate: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPdf: () => void;
  onMarkdown: () => void;
  onTasksLinked: (tasks: ReportTask[]) => Promise<unknown>;
  pdfBusy: boolean;
}

function ReportCard({
  report,
  template,
  isDefaultTemplate,
  onEdit,
  onDelete,
  onPdf,
  onMarkdown,
  onTasksLinked,
  pdfBusy,
}: Readonly<CardProps>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [toTasks, setToTasks] = useState(false);
  const agenda = reportAgenda(report);
  const people = reportParticipants(report);
  const tasks = reportTasks(report);
  const notAdded = tasks.filter((t) => !t.app_task_id).length;

  return (
    <li>
      <article aria-labelledby={`${id}-t`} className="card flex gap-4 rounded-card p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <div>
              <h3 id={`${id}-t`} className="text-lg leading-snug font-bold text-text">
                {report.topic || "Bez tematu"}
              </h3>

              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-text-secondary">
                <span>{report.date.slice(0, 10)}</span>
                {template && !isDefaultTemplate && (
                  <span className="rounded-full border border-line px-2">szablon: {template.name}</span>
                )}
              </p>
            </div>

            <span className="shrink-0 rounded-lg bg-surface p-2 text-text-secondary" aria-hidden="true">
              <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </span>
          </button>

          {open && (
            <div id={`${id}-d`} className="mt-3 space-y-3 text-sm">
              {agenda.length > 0 && (
                <section>
                  <h4 className="mb-1 font-semibold text-text">Agenda</h4>
                  <ol className="list-decimal space-y-0.5 pl-5 text-text-secondary">
                    {agenda.map((a, i) => (
                      <li key={`${i}-${a}`}>{a}</li>
                    ))}
                  </ol>
                </section>
              )}
              {people.length > 0 && (
                <section>
                  <h4 className="mb-1 font-semibold text-text">Osoby</h4>
                  <p className="text-text-secondary">{people.map((p) => p.name).join(", ")}</p>
                </section>
              )}
              {tasks.length > 0 && (
                <section>
                  <h4 className="mb-1 font-semibold text-text">Zadania</h4>
                  <ul className="space-y-1">
                    {tasks.map((t, i) => (
                      <li key={`${i}-${t.zadanie}`} className="flex flex-wrap gap-x-2 text-text-secondary">
                        <span className="text-text">{t.zadanie}</span>
                        {t.osoba && <span>· {t.osoba}</span>}
                        {t.data && <span className="tabular-nums">· do {formatReportDate(t.data)}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {report.notes?.trim() && (
                <section>
                  <h4 className="mb-1 font-semibold text-text">Notatki</h4>
                  <p className="whitespace-pre-line text-text-secondary">{report.notes}</p>
                </section>
              )}
            </div>
          )}

          {toTasks && (
            <div className="mt-3">
              <ReportTasksToApp report={report} onTasksLinked={onTasksLinked} onClose={() => setToTasks(false)} />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1" aria-busy={pdfBusy}>
            {tasks.length > 0 && (
              <ToTasksButton onClick={() => setToTasks((v) => !v)} pending={notAdded} expanded={toTasks} />
            )}
            <DownloadButton onClick={onPdf} fileFormat=".pdf" />
            <DownloadButton onClick={onMarkdown} fileFormat=".md" />
            <EditButton onClick={onEdit} ariaLabel={`Edytuj protokół ${report.topic}`} />
            <DeleteButton onClick={onDelete} ariaLabel={`Usuń protokół ${report.topic}`} />
          </div>
        </div>
      </article>
    </li>
  );
}

export default function ReportsPage() {
  const { reports, loading, fetching, addReport, editReport, deleteReport } = useReports();
  const { toast } = useToast();
  const templates = useReportTemplates();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pl");
    const filtered = q
      ? reports.filter((r) =>
          [
            r.topic,
            r.notes,
            ...(r.participants ?? []),
            ...(r.agenda ?? []),
            ...(r.tasks ?? []).map((t) => `${t.zadanie} ${t.osoba}`),
          ]
            .join(" ")
            .toLocaleLowerCase("pl")
            .includes(q)
        )
      : reports;
    return filtered.toSorted((a, b) => {
      if (sort === "topic") return (a.topic ?? "").localeCompare(b.topic ?? "", "pl");
      return sort === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    });
  }, [reports, query, sort]);

  // Grupy miesięcy tylko przy sortowaniu po dacie.
  const groups = useMemo(() => {
    if (sort === "topic") return [{ key: "all", label: null as string | null, items: visible }];
    const map = new Map<string, Report[]>();
    for (const r of visible) map.set(r.date.slice(0, 7), [...(map.get(r.date.slice(0, 7)) ?? []), r]);
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: monthFmt.format(new Date(`${key}-15T12:00:00`)),
      items,
    }));
  }, [visible, sort]);

  const handlePdf = async (report: Report) => {
    setPdfBusyId(report.id);
    try {
      await downloadReportPDF(report, await templates.load(report.template_id));
    } catch (err) {
      console.error("[reports] Generowanie PDF nie powiodło się:", err);
      toast.error("Nie udało się wygenerować PDF.");
    } finally {
      setPdfBusyId(null);
    }
  };

  const handleMarkdown = (report: Report) => {
    try {
      downloadReportMarkdown(report);
    } catch (err) {
      console.error("[reports] Generowanie Markdown nie powiodło się:", err);
      toast.error("Nie udało się wygenerować pliku Markdown.");
    }
  };

  const formProps = { templates: templates.set.templates, defaultTemplateId: templates.set.default_id, loading };

  return (
    <>
      <Seo
        title="Protokoły"
        description="Notuj przebieg spotkań – temat, agendę, uczestników i zadania – i zapisuj protokół jako PDF lub Markdown."
        canonical="https://dzisiaj.fun/notes/reports"
        keywords="raporty, podsumowania, spotkania, protokoły"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">
          Protokoły{" "}
          {reports.length > 0 && <span className="text-base font-normal text-text-secondary">({reports.length})</span>}
        </h1>
        {!showForm && (
          <AddButton
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
            }}
          />
        )}
      </div>
      {showForm && (
        <div className="mb-6">
          <ReportForm
            {...formProps}
            onSubmit={async (r) => {
              await addReport(r as Report);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {reports.length > 0 && (
        <div className="mb-4 flex max-w-3xl flex-wrap items-center gap-2">
          <div className="min-w-56 flex-1">
            <SearchBar value={query} onChange={setQuery} placeholder="Szukaj w protokołach…" />
          </div>
          <label htmlFor="reports-sort" className="sr-only">
            Sortowanie protokołów
          </label>
          <select
            id="reports-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input-field w-auto"
          >
            <option value="newest">Najnowsze</option>
            <option value="oldest">Najstarsze</option>
            <option value="topic">Według tematu</option>
          </select>
        </div>
      )}

      {fetching && (
        <div className="max-w-3xl space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonReport key={i} />
          ))}
        </div>
      )}
      {!fetching && reports.length === 0 && !showForm && (
        <NoResultsState text="protokołów" hint="Dodaj pierwszy protokół przyciskiem „Dodaj”." />
      )}
      {!fetching && reports.length > 0 && visible.length === 0 && <NoResultsState text="protokołów" isSearch />}

      {!fetching && (
        <div className="max-w-3xl space-y-6">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.label ?? "Protokoły"}>
              {g.label && <h2 className="mb-2 text-sm font-semibold text-text-secondary capitalize">{g.label}</h2>}
              <ul className="space-y-3">
                {g.items.map((r) =>
                  editingId === r.id ? (
                    <li key={r.id}>
                      <ReportForm
                        {...formProps}
                        initial={r}
                        onSubmit={async (patch) => {
                          await editReport(r.id, patch as Report);
                          setEditingId(null);
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    </li>
                  ) : (
                    <ReportCard
                      key={r.id}
                      report={r}
                      template={pickTemplate(templates.set, r.template_id)}
                      isDefaultTemplate={!r.template_id || r.template_id === templates.set.default_id}
                      onEdit={() => {
                        setEditingId(r.id);
                        setShowForm(false);
                      }}
                      onDelete={() => void deleteReport(r.id)}
                      onPdf={() => void handlePdf(r)}
                      onMarkdown={() => handleMarkdown(r)}
                      onTasksLinked={(linked) =>
                        editReport(r.id, { tasks: linked } as Partial<Report>, { silent: true })
                      }
                      pdfBusy={pdfBusyId === r.id}
                    />
                  )
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
