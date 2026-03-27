import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { X, Plus } from "lucide-react";
import { useReports } from "../../hooks/useReports";
import ReportForm from "../../components/reports/ReportForm";
import { generateReportPDF } from "../../lib/pdfGenerator";
import { Report, ReportTask } from "../../types";
import { AddButton, EditButton, DeleteButton, PdfButton, FormButtons } from "../../components/CommonButtons";
import { format } from "date-fns";
import { useToast } from "../../providers/ToastProvider";

interface ReportViewRowProps {
  report: Report;
  onEdit: (r: Report) => void;
  onDelete: (id: string) => void;
  onGenerate: (r: Report) => void;
}

interface ReportEditRowProps{
  editedReport: Report;
  topicRef: React.RefObject<HTMLInputElement | null>;
  onSave: () => void;
  onCancel: () => void;
  upd: (field: string, val: any) => void;
  updArr: (field: string, arr: any[]) => void;
}

function ReportViewRow({
  report,
  onEdit,
  onDelete,
  onGenerate
}: Readonly<ReportViewRowProps>) {
  return (
    <li className="p-5 mb-4 break-inside-avoid card rounded-2xl shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
      <div className="flex-1">
        <div className="flex justify-between items-end border-b mb-3 border-black/5 dark:border-white/5">
          <h3 className="font-bold text-lg text-text pr-2">{report.topic}</h3>
          <p className="flex-1 text-[10px] text-textMuted font-medium text-right whitespace-nowrap">
            {format(new Date(report.date), "dd.MM.yyyy")}
          </p>
        </div>
        {report.participants && report.participants.length > 0 && (
          <div className="text-sm text-textSecondary mb-3">
            <span className="font-bold text-textMuted uppercase tracking-wider text-[10px] mr-2">Uczestnicy:</span>
            <span className="font-medium">{report.participants.join(", ")}</span>
          </div>
        )}
        {report.tasks && report.tasks.length > 0 && (
          <div className="mt-2 bg-surface p-3 rounded-xl border border-gray-100 dark:border-gray-800 mb-2">
            <span className="font-bold text-textMuted uppercase tracking-wider text-[10px] block mb-1.5">Zadania:</span>
            <ul className="list-none space-y-1 text-sm text-textSecondary">
              {report.tasks.map((task, i) => (
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
        <PdfButton onClick={() => onGenerate(report)} />
        <EditButton onClick={() => onEdit(report)} />
        <DeleteButton onClick={() => onDelete(report.id)} />
      </div>
    </li>
  );
}


function ReportEditRow({
  editedReport,
  topicRef,
  onSave,
  onCancel,
  upd,
  updArr
}: Readonly<ReportEditRowProps>) {
  const editPrefix = `edit-report-${editedReport.id}`;
  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => upd("topic", e.target.value);
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => upd("date", e.target.value);
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => upd("notes", e.target.value);

  const updateAgenda = (i: number, val: string) => {
    const a = [...(editedReport.agenda || [])];
    a[i] = val;
    updArr("agenda", a);
  };
  const removeAgenda = (i: number) => updArr("agenda", editedReport.agenda!.filter((_, j) => j !== i));
  const addAgenda = () => updArr("agenda", [...(editedReport.agenda || []), ""]);

  const updateParticipant = (i: number, val: string) => {
    const p = [...(editedReport.participants || [])];
    p[i] = val;
    updArr("participants", p);
  };
  const removeParticipant = (i: number) => updArr("participants", editedReport.participants!.filter((_, j) => j !== i));
  const addParticipant = () => updArr("participants", [...(editedReport.participants || []), ""]);

  const updateTask = (i: number, field: keyof ReportTask, val: string) => {
    const t = [...(editedReport.tasks || [])];
    t[i] = { ...t[i], [field]: val };
    updArr("tasks", t);
  };
  const removeTask = (i: number) => updArr("tasks", editedReport.tasks!.filter((_, j) => j !== i));
  const addTask = () => updArr("tasks", [...(editedReport.tasks || []), { zadanie: "", data: "", osoba: "" }]);

  return (
    <li className="p-5 break-inside-avoid bg-card border border-primary rounded-2xl shadow-lg space-y-4 animate-in fade-in mb-4">
      <div>
        <label htmlFor={`${editPrefix}-topic`} className="form-label">Temat spotkania:</label>
        <input id={`${editPrefix}-topic`} ref={topicRef} type="text" value={editedReport.topic || ""}
          onChange={handleTopicChange} className="input-field font-medium" />
      </div>
      <div>
        <label htmlFor={`${editPrefix}-date`} className="form-label">Data:</label>
        <input id={`${editPrefix}-date`} type="date" value={editedReport.date || ""}
          onChange={handleDateChange} className="input-field" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <div className="form-label">Agenda:</div>
          <div className="space-y-2 mt-1">
            {editedReport.agenda?.map((item, i) => (
              <div key={`agenda-item-${i}`} className="flex gap-2 items-center">
                <input type="text" value={item} className="input-field py-1.5" aria-label={`Punkt agendy ${i + 1}`} placeholder={`Punkt ${i + 1}`}
                  onChange={(e) => updateAgenda(i, e.target.value)} />
                {(editedReport.agenda?.length || 0) > 1 && (
                  <button type="button" onClick={() => removeAgenda(i)}
                    className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addAgenda}
              className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary flex items-center gap-1 mt-2">
              <Plus className="w-4 h-4" /> Dodaj punkt
            </button>
          </div>
        </div>
        <div>
          <div className="form-label">Uczestnicy:</div>
          <div className="space-y-2 mt-1">
            {editedReport.participants?.map((item, i) => (
              <div key={`participant-${i}`} className="flex gap-2 items-center">
                <input type="text" value={item} className="input-field py-1.5" aria-label={`Uczestnik ${i + 1}`} placeholder={`Uczestnik ${i + 1}`}
                  onChange={(e) => updateParticipant(i, e.target.value)} />
                {(editedReport.participants?.length || 0) > 1 && (
                  <button type="button" onClick={() => removeParticipant(i)}
                    className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addParticipant}
              className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary flex items-center gap-1 mt-2">
              <Plus className="w-4 h-4" /> Dodaj uczestnika
            </button>
          </div>
        </div>
      </div>
      <div>
        <div className="form-label">Zadania:</div>
        <div className="space-y-3 mt-1">
          {editedReport.tasks?.map((task, i) => (
            <div key={`edit-task-${i}`} className="p-3 card rounded-xl bg-surface space-y-2">
              <div className="flex gap-2">
                <input type="text" value={task.zadanie} aria-label="Zadanie" placeholder="Zadanie" className="input-field py-1.5 bg-surface"
                  onChange={(e) => updateTask(i, "zadanie", e.target.value)} />
                {(editedReport.tasks?.length || 0) > 1 && (
                  <button type="button" onClick={() => removeTask(i)}
                    className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={task.data} aria-label="Data zadania" className="input-field py-1.5 bg-card"
                  onChange={(e) => updateTask(i, "data", e.target.value)} />
                <input type="text" value={task.osoba} aria-label="Osoba odpowiedzialna" placeholder="Osoba odp." className="input-field py-1.5 bg-card"
                  onChange={(e) => updateTask(i, "osoba", e.target.value)} />
              </div>
            </div>
          ))}
          <button type="button" onClick={addTask}
            className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary flex items-center gap-1 mt-2">
            <Plus className="w-4 h-4" /> Dodaj zadanie
          </button>
        </div>
      </div>
      <div>
        <label htmlFor={`${editPrefix}-notes`} className="form-label">Notatki:</label>
        <textarea id={`${editPrefix}-notes`} value={editedReport.notes || ""} className="input-field" rows={4}
          onChange={handleNotesChange} />
      </div>
      <FormButtons onClickSave={onSave} onClickClose={onCancel} />
    </li>
  );
}

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
              return (
                <ReportEditRow 
                  key={r.id} 
                  editedReport={editedReport} 
                  topicRef={topicRef} 
                  onSave={handleSaveEdit} 
                  onCancel={handleCancelEdit} 
                  upd={upd} 
                  updArr={updArr} 
                />
              );
            }
            return (
              <ReportViewRow 
                key={r.id} 
                report={r} 
                onEdit={handleEdit} 
                onDelete={handleDelete} 
                onGenerate={handleGenerate} 
              />
            );
          })}
        </ul>
      </Layout>
    </>
  );
}