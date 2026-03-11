import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { Save, X, Plus } from "lucide-react";
import { useReports } from "../../hooks/useReports";
import ReportForm from "../../components/reports/ReportForm";
import { generateReportPDF } from "../../lib/pdfGenerator";
import { Report, ReportTask } from "../../types";
import LoadingState from "../../components/LoadingState";
import { 
  AddButton, 
  EditButton, 
  DeleteButton, 
  SaveButton, 
  CancelButton, 
  PdfButton 
} from "../../components/CommonButtons";
import { formatDate } from "../../lib/dateUtils";
import { format } from "date-fns";

export default function ReportsPage() {
  const { reports, loading, editReport, deleteReport } = useReports();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedReport, setEditedReport] = useState<Report | null>(null);
  const [showForm, setShowForm] = useState(false);
  const topicRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && topicRef.current) {
      topicRef.current.focus();
    }
  }, [editingId]);

  const openNew = () => setShowForm(true);

  const handleEdit = (report: Report) => {
    setEditingId(report.id);
    setEditedReport({ ...report });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedReport(null);
  };

  const handleSaveEdit = async () => {
    if (editedReport) {
      await editReport(editedReport.id, editedReport);
      setEditingId(null);
      setEditedReport(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć sprawozdanie?")) return;
    await deleteReport(id);
  };

  const handleGenerate = async (report: Report) => {
    generateReportPDF(report);
  };

  const addAgendaItem = () => {
    if (!editedReport) return;
    setEditedReport({ ...editedReport, agenda: [...(editedReport.agenda || []), ""] });
  };

  const removeAgendaItem = (index: number) => {
    if (!editedReport) return;
    setEditedReport({ ...editedReport, agenda: editedReport.agenda?.filter((_, i) => i !== index) || [] });
  };

  const updateAgendaItem = (index: number, value: string) => {
    if (!editedReport) return;
    const newAgenda = [...(editedReport.agenda || [])];
    newAgenda[index] = value;
    setEditedReport({ ...editedReport, agenda: newAgenda });
  };

  const addParticipant = () => {
    if (!editedReport) return;
    setEditedReport({ ...editedReport, participants: [...(editedReport.participants || []), ""] });
  };

  const removeParticipant = (index: number) => {
    if (!editedReport) return;
    setEditedReport({ ...editedReport, participants: editedReport.participants?.filter((_, i) => i !== index) || [] });
  };

  const updateParticipant = (index: number, value: string) => {
    if (!editedReport) return;
    const newParticipants = [...(editedReport.participants || [])];
    newParticipants[index] = value;
    setEditedReport({ ...editedReport, participants: newParticipants });
  };

  const addTask = () => {
    if (!editedReport) return;
    setEditedReport({ ...editedReport, tasks: [...(editedReport.tasks || []), { zadanie: "", data: "", osoba: "" }] });
  };

  const removeTask = (index: number) => {
    if (!editedReport) return;
    setEditedReport({ ...editedReport, tasks: editedReport.tasks?.filter((_, i) => i !== index) || [] });
  };

  const updateTask = (index: number, field: keyof ReportTask, value: string) => {
    if (!editedReport) return;
    const newTasks = [...(editedReport.tasks || [])];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setEditedReport({ ...editedReport, tasks: newTasks });
  };

  return (
    <>
      <Head>
        <title>Sprawozdania – Dzisiaj</title>
        <meta name="description" content="Twórz i zarządzaj sprawozdaniami." />
        <link rel="canonical" href="https://dzisiajv3.vercel.app/reports" />
      </Head>

      <Layout>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text">Sprawozdania</h2>
          {!showForm && <AddButton onClick={openNew} type="button" />}
        </div>

        {loading && <LoadingState />}

        {showForm && (
          <div className="mb-6">
            <ReportForm
              onChange={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <ul className="space-y-4 lg:columns-2 gap-4 block">
          {reports.map((r) => {
            const isEditing = editingId === r.id;

            if (isEditing && editedReport) {
              return (
                <li
                  key={r.id}
                  className="p-5 break-inside-avoid bg-card border border-primary dark:border-primary-dark rounded-2xl shadow-lg space-y-4 animate-in fade-in mb-4"
                >
                  {/* Topic */}
                  <div>
                    <label className="form-label">Temat spotkania:</label>
                    <input
                      ref={topicRef}
                      type="text"
                      value={editedReport.topic || ""}
                      onChange={(e) => setEditedReport({ ...editedReport, topic: e.target.value })}
                      className="input-field font-medium"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="form-label">Data:</label>
                    <input
                      type="date w-full min-w-0 px-1 text-sm"
                      value={editedReport.date || ""}
                      onChange={(e) => setEditedReport({ ...editedReport, date: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  {/* Agenda and Participants */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Agenda */}
                    <div>
                      <label className="form-label">Agenda:</label>
                      <div className="space-y-2 mt-1">
                        {editedReport.agenda?.map((item, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => updateAgendaItem(i, e.target.value)}
                              className="input-field py-1.5"
                              placeholder={`Punkt ${i + 1}`}
                            />
                            {(editedReport.agenda?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => removeAgendaItem(i)}
                                className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
                                title="Usuń punkt"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addAgendaItem}
                          className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary flex items-center gap-1 transition-colors mt-2"
                        >
                          <Plus className="w-4 h-4" /> Dodaj punkt
                        </button>
                      </div>
                    </div>

                    {/* Participants */}
                    <div>
                      <label className="form-label">Uczestnicy:</label>
                      <div className="space-y-2 mt-1">
                        {editedReport.participants?.map((item, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => updateParticipant(i, e.target.value)}
                              className="input-field py-1.5"
                              placeholder={`Uczestnik ${i + 1}`}
                            />
                            {(editedReport.participants?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => removeParticipant(i)}
                                className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
                                title="Usuń uczestnika"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addParticipant}
                          className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary flex items-center gap-1 transition-colors mt-2"
                        >
                          <Plus className="w-4 h-4" /> Dodaj uczestnika
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div>
                    <label className="form-label">Zadania:</label>
                    <div className="space-y-3 mt-1">
                      {editedReport.tasks?.map((task, i) => (
                        <div key={i} className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-surface space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={task.zadanie}
                              onChange={(e) => updateTask(i, "zadanie", e.target.value)}
                              placeholder="Zadanie"
                              className="input-field py-1.5 bg-card"
                            />
                            {(editedReport.tasks?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTask(i)}
                                className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date w-full min-w-0 px-1 text-sm"
                              value={task.data}
                              onChange={(e) => updateTask(i, "data", e.target.value)}
                              className="input-field py-1.5 bg-card"
                            />
                            <input
                              type="text"
                              value={task.osoba}
                              onChange={(e) => updateTask(i, "osoba", e.target.value)}
                              placeholder="Osoba odp."
                              className="input-field py-1.5 bg-card"
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addTask}
                        className="text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary flex items-center gap-1 transition-colors mt-2"
                      >
                        <Plus className="w-4 h-4" /> Dodaj zadanie
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="form-label">Notatki:</label>
                    <textarea
                      value={editedReport.notes || ""}
                      onChange={(e) => setEditedReport({ ...editedReport, notes: e.target.value })}
                      className="input-field"
                      rows={4}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <SaveButton onClick={handleSaveEdit} type="button" />
                    <CancelButton onCancel={handleCancelEdit} />
                  </div>
                </li>
              );
            }

            return (
              <li
                key={r.id}
                className="p-5 mb-4 break-inside-avoid bg-card border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full"
              >
                <div className="flex-1">
                  <div className="flex justify-between items-end border-b mb-3 border-black/5 dark:border-white/5">
                    <h3 className="font-bold text-lg text-text pr-2">{r.topic}</h3>
                    <p className="flex-1 text-[10px] text-textMuted font-medium text-right whitespace-nowrap">
                      {format(new Date(r.date), "dd.MM.RRRR")}
                    </p>
                  </div>

                  {r.participants && r.participants.length > 0 && (
                    <div className="text-sm text-textSecondary mb-3">
                      <span className="font-bold text-textMuted uppercase tracking-wider text-[10px] mr-2">Uczestnicy:</span>
                      <span className="font-medium">{r.participants.join(", ")}</span>
                    </div>
                  )}

                  {r.tasks && r.tasks.length > 0 && (
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

ReportsPage.auth = true;