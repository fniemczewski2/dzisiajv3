import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { X, Plus } from "lucide-react";
import { useReports } from "../../hooks/useReports";
import ReportForm from "../../components/reports/ReportForm";
import { generateReportPDF } from "../../lib/pdfGenerator";
import { Report } from "../../types";
import { AddButton, EditButton, DeleteButton, PdfButton, FormButtons } from "../../components/CommonButtons";
import { format } from "date-fns";
import { useToast } from "../../providers/ToastProvider";

export default function ReportsPage() {
  const { reports, fetching, fetchReports, editReport, deleteReport } = useReports();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedReport, setEditedReport] = useState<Report | null>(null);
  const [showForm, setShowForm] = useState(false);
  const topicRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && topicRef.current) topicRef.current.focus();
  }, [editingId]);

  const handleEdit = (report: Report) => { setEditingId(report.id); setEditedReport({ ...report }); };
  const handleCancelEdit = () => { setEditingId(null); setEditedReport(null); };

  const handleSaveEdit = async () => {
    if (!editedReport) return;
    try {
      await editReport(editedReport.id, editedReport);
      toast.success("Zmieniono pomyślnie.");
      setEditingId(null);
      setEditedReport(null);
    } catch { toast.error("Wystąpił błąd podczas zapisywania."); }
  };

  const handleDelete = async (id: string) => {
    const ok = await toast.confirm("Czy na pewno chcesz usunąć to sprawozdanie?");
    if (!ok) return;
    try { await deleteReport(id); toast.success("Usunięto pomyślnie."); }
    catch { toast.error("Wystąpił błąd podczas usuwania."); }
  };

  const upd = (field: string, val: any) => setEditedReport((r) => r ? { ...r, [field]: val } : r);
  const updArr = (field: string, arr: any[]) => upd(field, arr);

  const handleGenerate = async (report: Report) => {
    generateReportPDF(report);
  };
  
  useEffect(() => {
      let toastId: string | undefined;
      
      if (fetching && toast.loading) {
        toastId = toast.loading("Ładowanie sprawozdań...");
      }
  
      return () => {
        if (toastId && toast.dismiss) {
          toast.dismiss(toastId);
        }
      };
  }, [fetching, toast]);

  return (
    <>
      <Head><title>Sprawozdania – Dzisiaj</title></Head>
      <Layout>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text">Sprawozdania</h2>
          {!showForm && <AddButton onClick={() => setShowForm(true)}/>}
        </div>

        {showForm && (
          <div className="mb-6">
            <ReportForm
              onChange={() => { fetchReports(); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <ul className="space-y-4 lg:columns-2 gap-4 block">
          {reports.map((r) => {
            if (editingId === r.id && editedReport) {
              const editPrefix = `edit-report-${r.id}`;
              
              return (
                <li key={r.id} className="p-5 break-inside-avoid bg-card border border-primary rounded-2xl shadow-lg space-y-4 animate-in fade-in mb-4">
                  <div>
                    <label htmlFor={`${editPrefix}-topic`} className="form-label">Temat spotkania:</label>
                    <input id={`${editPrefix}-topic`} ref={topicRef} type="text" value={editedReport.topic || ""}
                      onChange={(e) => upd("topic", e.target.value)} className="input-field font-medium" />
                  </div>
                  <div>
                    <label htmlFor={`${editPrefix}-date`} className="form-label">Data:</label>
                    <input id={`${editPrefix}-date`} type="date" value={editedReport.date || ""}
                      onChange={(e) => upd("date", e.target.value)} className="input-field" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <div className="form-label">Agenda:</div>
                      <div className="space-y-2 mt-1">
                        {editedReport.agenda?.map((item, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input type="text" value={item} className="input-field py-1.5" aria-label={`Punkt agendy ${i + 1}`} placeholder={`Punkt ${i + 1}`}
                              onChange={(e) => { const a = [...(editedReport.agenda || [])]; a[i] = e.target.value; updArr("agenda", a); }} />
                            {(editedReport.agenda?.length || 0) > 1 && (
                              <button type="button" onClick={() => updArr("agenda", editedReport.agenda!.filter((_, j) => j !== i))}
                                className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                                <X className="w-4 h-4" /></button>)}
                          </div>
                        ))}
                        <button type="button" onClick={() => updArr("agenda", [...(editedReport.agenda || []), ""])}
                          className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary flex items-center gap-1 mt-2">
                          <Plus className="w-4 h-4" /> Dodaj punkt</button>
                      </div>
                    </div>
                    <div>
                      <div className="form-label">Uczestnicy:</div>
                      <div className="space-y-2 mt-1">
                        {editedReport.participants?.map((item, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input type="text" value={item} className="input-field py-1.5" aria-label={`Uczestnik ${i + 1}`} placeholder={`Uczestnik ${i + 1}`}
                              onChange={(e) => { const p = [...(editedReport.participants || [])]; p[i] = e.target.value; updArr("participants", p); }} />
                            {(editedReport.participants?.length || 0) > 1 && (
                              <button type="button" onClick={() => updArr("participants", editedReport.participants!.filter((_, j) => j !== i))}
                                className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                                <X className="w-4 h-4" /></button>)}
                          </div>
                        ))}
                        <button type="button" onClick={() => updArr("participants", [...(editedReport.participants || []), ""])}
                          className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary flex items-center gap-1 mt-2">
                          <Plus className="w-4 h-4" /> Dodaj uczestnika</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="form-label">Zadania:</div>
                    <div className="space-y-3 mt-1">
                      {editedReport.tasks?.map((task, i) => (
                        <div key={i} className="p-3 card rounded-xl bg-surface space-y-2">
                          <div className="flex gap-2">
                            <input type="text" value={task.zadanie} aria-label="Zadanie" placeholder="Zadanie" className="input-field py-1.5 bg-surface"
                              onChange={(e) => { const t = [...(editedReport.tasks || [])]; t[i] = { ...t[i], zadanie: e.target.value }; updArr("tasks", t); }} />
                            {(editedReport.tasks?.length || 0) > 1 && (
                              <button type="button" onClick={() => updArr("tasks", editedReport.tasks!.filter((_, j) => j !== i))}
                                className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                                <X className="w-4 h-4" /></button>)}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={task.data} aria-label="Data zadania" className="input-field py-1.5 bg-card"
                              onChange={(e) => { const t = [...(editedReport.tasks || [])]; t[i] = { ...t[i], data: e.target.value }; updArr("tasks", t); }} />
                            <input type="text" value={task.osoba} aria-label="Osoba odpowiedzialna" placeholder="Osoba odp." className="input-field py-1.5 bg-card"
                              onChange={(e) => { const t = [...(editedReport.tasks || [])]; t[i] = { ...t[i], osoba: e.target.value }; updArr("tasks", t); }} />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => updArr("tasks", [...(editedReport.tasks || []), { zadanie: "", data: "", osoba: "" }])}
                        className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary flex items-center gap-1 mt-2">
                        <Plus className="w-4 h-4" /> Dodaj zadanie</button>
                    </div>
                  </div>
                  <div>
                    {/* CHANGED: Associated Notatki label with its textarea */}
                    <label htmlFor={`${editPrefix}-notes`} className="form-label">Notatki:</label>
                    <textarea id={`${editPrefix}-notes`} value={editedReport.notes || ""} className="input-field" rows={4}
                      onChange={(e) => upd("notes", e.target.value)} />
                  </div>
                  <FormButtons onClickSave={handleSaveEdit} onClickClose={handleCancelEdit} />
                </li>
              );
            }
            return (
              <li key={r.id} className="p-5 mb-4 break-inside-avoid card rounded-2xl shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex justify-between items-end border-b mb-3 border-black/5 dark:border-white/5">
                    <h3 className="font-bold text-lg text-text pr-2">{r.topic}</h3>
                    <p className="flex-1 text-[10px] text-textMuted font-medium text-right whitespace-nowrap">
                      {format(new Date(r.date), "dd.MM.yyyy")}
                    </p>
                  </div>
                  {r.participants?.length > 0 && (
                    <div className="text-sm text-textSecondary mb-3">
                      <span className="font-bold text-textMuted uppercase tracking-wider text-[10px] mr-2">Uczestnicy:</span>
                      <span className="font-medium">{r.participants.join(", ")}</span>
                    </div>
                  )}
                  {r.tasks?.length > 0 && (
                    <div className="mt-2 bg-surface p-3 rounded-xl border border-gray-100 dark:border-gray-800 mb-2">
                      <span className="font-bold text-textMuted uppercase tracking-wider text-[10px] block mb-1.5">Zadania:</span>
                      <ul className="list-none space-y-1 text-sm text-textSecondary">
                        {r.tasks.map((task, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-primary">•</span>
                            <span>
                              <span className="font-medium text-text">{task.zadanie}</span>
                              {task.osoba && ` — ${task.osoba}`}
                              {task.data && <span className="text-textMuted text-xs ml-1">({task.data})</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex justify-between w-full gap-1 sm:gap-1.5 pt-4 mt-auto">
                  <PdfButton onClick={() => handleGenerate(r)} />
                  <EditButton onClick={() => handleEdit(r)} />
                  <DeleteButton onClick={() => handleDelete(r.id)} />
                </div>
              </li>
            );
          })}
        </ul>
      </Layout>
    </>
  );
}