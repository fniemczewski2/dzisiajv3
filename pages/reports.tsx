import React, { useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import { useSession } from "@supabase/auth-helpers-react";
import { PlusCircleIcon, Download, Edit2, Trash2, Loader2 } from "lucide-react";
import { useReports } from "../hooks/useReports";
import ReportForm from "../components/reports/ReportForm";
import { generateReportPDF } from "../lib/pdfGenerator";
import { Report } from "../types";
import LoadingState from "../components/LoadingState";

export default function ReportsPage() {
  const session = useSession();
  const userEmail = session?.user?.email || "";
  const { reports, loading, addReport, updateReport, deleteReport, fetchReports } = useReports(userEmail);

  const [editing, setEditing] = useState<Report | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const openNew = () => {
    setEditing(undefined);
    setShowForm(true);
  };

  const openEdit = (r: Report) => {
    setEditing(r);
    setShowForm(true);
  };

  const handleSave = async (payload: Report) => {
    if (editing) {
      await updateReport(editing.id, payload);
    } else {
      await addReport({ ...payload, user_email: userEmail });
    }
    fetchReports();
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć sprawozdanie?")) return;
    await deleteReport(id);
    fetchReports();
  };

  const handleGenerate = async (report: Report) => {
    generateReportPDF(report);
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
          {!showForm && (
            <button
              onClick={openNew}
              className="px-3 py-1.5 flex items-center bg-primary hover:bg-secondary text-white rounded-lg shadow"
            >
              Dodaj&nbsp;&nbsp;
              <PlusCircleIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {(!session || loading) && (
            <LoadingState />
        )}

        {showForm && (
          <div className="mb-6">
            <ReportForm
              userEmail={userEmail}
              onChange={fetchReports}
              initial={editing}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="p-3 bg-card rounded shadow flex justify-between items-center">
              <div>
                <div className="font-semibold">{r.topic || "Brak tytułu"}</div>
                <div className="text-sm text-gray-500">{r.date}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerate(r)}
                  className="flex flex-col px-1.5 items-center justify-center rounded-lg text-green-600 hover:text-green-800 transition-colors"
                >
                  <Download className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[9px] sm:text-[11px]">Pobierz</span>
                </button>
                <button
                  onClick={() => openEdit(r)}
                  className="flex flex-col px-1.5 items-center justify-center rounded-lg text-primary hover:text-secondary transition-colors"
                >
                  <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[9px] sm:text-[11px]">Edytuj</span>
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="flex flex-col px-1.5 items-center justify-center rounded-lg text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[9px] sm:text-[11px]">Usuń</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Layout>
    </>
  );
}

ReportsPage.auth = true;
