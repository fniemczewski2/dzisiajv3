import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import { Download, Edit2, Trash2, Save, X, Plus } from "lucide-react";
import { useReports } from "../../hooks/useReports";
import ReportForm from "../../components/reports/ReportForm";
import { generateReportPDF } from "../../lib/pdfGenerator";
import { Report, ReportTask } from "../../types";
import LoadingState from "../../components/LoadingState";
import { AddButton } from "../../components/CommonButtons";

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

  const openNew = () => {
    setShowForm(true);
  };

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
    setEditedReport({
      ...editedReport,
      agenda: [...(editedReport.agenda || []), ""],
    });
  };

  const removeAgendaItem = (index: number) => {
    if (!editedReport) return;
    setEditedReport({
      ...editedReport,
      agenda: editedReport.agenda?.filter((_, i) => i !== index) || [],
    });
  };

  const updateAgendaItem = (index: number, value: string) => {
    if (!editedReport) return;
    const newAgenda = [...(editedReport.agenda || [])];
    newAgenda[index] = value;
    setEditedReport({ ...editedReport, agenda: newAgenda });
  };

  const addParticipant = () => {
    if (!editedReport) return;
    setEditedReport({
      ...editedReport,
      participants: [...(editedReport.participants || []), ""],
    });
  };

  const removeParticipant = (index: number) => {
    if (!editedReport) return;
    setEditedReport({
      ...editedReport,
      participants: editedReport.participants?.filter((_, i) => i !== index) || [],
    });
  };

  const updateParticipant = (index: number, value: string) => {
    if (!editedReport) return;
    const newParticipants = [...(editedReport.participants || [])];
    newParticipants[index] = value;
    setEditedReport({ ...editedReport, participants: newParticipants });
  };

  const addTask = () => {
    if (!editedReport) return;
    setEditedReport({
      ...editedReport,
      tasks: [...(editedReport.tasks || []), { zadanie: "", data: "", osoba: "" }],
    });
  };

  const removeTask = (index: number) => {
    if (!editedReport) return;
    setEditedReport({
      ...editedReport,
      tasks: editedReport.tasks?.filter((_, i) => i !== index) || [],
    });
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
        <meta property="og:title" content="Sprawozdania – Dzisiaj" />
        <meta property="og:description" content="Twórz i zarządzaj sprawozdaniami." />
      </Head>

      <Layout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Sprawozdania</h2>
          {!showForm && <AddButton onClick={openNew} type="button" />}
        </div>

        {(loading) && <LoadingState />}

        {showForm && (
          <div className="mb-6">
            <ReportForm
              onChange={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <ul className="space-y-4">
          {reports.map((r) => {
            const isEditing = editingId === r.id;

            if (isEditing && editedReport) {
              return (
                <li
                  key={r.id}
                  className="p-4 bg-gray-50 border-2 border-gray-300 rounded-xl shadow-lg space-y-3"
                >
                  {/* Topic */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Temat spotkania:
                    </label>
                    <input
                      ref={topicRef}
                      type="text"
                      value={editedReport.topic || ""}
                      onChange={(e) =>
                        setEditedReport({ ...editedReport, topic: e.target.value })
                      }
                      className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Data:
                    </label>
                    <input
                      type="date"
                      value={editedReport.date || ""}
                      onChange={(e) =>
                        setEditedReport({ ...editedReport, date: e.target.value })
                      }
                      className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Agenda and Participants */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Agenda */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700">
                        Agenda:
                      </label>
                      <div className="space-y-2 mt-1">
                        {editedReport.agenda?.map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => updateAgendaItem(i, e.target.value)}
                              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                              placeholder={`Punkt ${i + 1}`}
                            />
                            {(editedReport.agenda?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => removeAgendaItem(i)}
                                className="p-2 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addAgendaItem}
                          className="text-primary hover:text-secondary flex items-center gap-1 text-sm transition-colors"
                        >
                          
                          Dodaj
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Participants */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700">
                        Uczestnicy:
                      </label>
                      <div className="space-y-2 mt-1">
                        {editedReport.participants?.map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => updateParticipant(i, e.target.value)}
                              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                              placeholder={`Uczestnik ${i + 1}`}
                            />
                            {(editedReport.participants?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => removeParticipant(i)}
                                className="p-2 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addParticipant}
                          className="text-primary hover:text-secondary flex items-center gap-1 text-sm transition-colors"
                        >
                          
                          Dodaj
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Zadania:
                    </label>
                    <div className="space-y-3 mt-1">
                      {editedReport.tasks?.map((task, i) => (
                        <div key={i} className="p-3 border rounded-lg bg-gray-50 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={task.zadanie}
                              onChange={(e) => updateTask(i, "zadanie", e.target.value)}
                              placeholder="Zadanie"
                              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary bg-white"
                            />
                            {(editedReport.tasks?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTask(i)}
                                className="mr-2 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={task.data}
                              onChange={(e) => updateTask(i, "data", e.target.value)}
                              className="p-2 border rounded-lg focus:ring-2 focus:ring-primary bg-white"
                            />
                            <input
                              type="text"
                              value={task.osoba}
                              onChange={(e) => updateTask(i, "osoba", e.target.value)}
                              placeholder="Osoba odpowiedzialna"
                              className="p-2 border rounded-lg focus:ring-2 focus:ring-primary bg-white"
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addTask}
                        className="text-primary hover:text-secondary flex items-center gap-1 text-sm transition-colors"
                      >
                        
                        Dodaj
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Notatki:
                    </label>
                    <textarea
                      value={editedReport.notes || ""}
                      onChange={(e) =>
                        setEditedReport({ ...editedReport, notes: e.target.value })
                      }
                      className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      rows={4}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                    >
                      
                      <span className="text-sm">Zapisz</span>
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      
                      <span className="text-sm">Anuluj</span>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            }

            return (
              <li
                key={r.id}
                className="p-4 bg-card rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{r.topic || "Brak tytułu"}</div>
                    <div className="text-sm text-gray-500">{r.date}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerate(r)}
                      className="flex flex-col items-center text-green-600 hover:text-green-800 transition-colors"
                      title="Pobierz PDF"
                    >
                      <Download className="w-5 h-5" />
                      <span className="text-xs mt-1">Pobierz</span>
                    </button>
                    <button
                      onClick={() => handleEdit(r)}
                      className="flex flex-col items-center text-primary hover:text-secondary transition-colors"
                      title="Edytuj"
                    >
                      <Edit2 className="w-5 h-5" />
                      <span className="text-xs mt-1">Edytuj</span>
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="flex flex-col items-center text-red-500 hover:text-red-600 transition-colors"
                      title="Usuń"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="text-xs mt-1">Usuń</span>
                    </button>
                  </div>
                </div>

                {r.participants && r.participants.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Uczestnicy: </span>
                    {r.participants.join(", ")}
                  </div>
                )}

                {r.tasks && r.tasks.length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium text-sm">Zadania:</span>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                      {r.tasks.map((task, i) => (
                        <li key={i}>
                          {task.zadanie} {task.osoba && `- ${task.osoba}`}{" "}
                          {task.data && `(${task.data})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Layout>
    </>
  );
}

ReportsPage.auth = true;