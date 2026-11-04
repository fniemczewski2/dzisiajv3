// components/people/ExportPeople.tsx

import React from "react";
import { Download } from "lucide-react";
import { Person } from "@/types/people";

interface ExportProps {
  people: Person[];
}

export const ExportPeople = ({ people }: ExportProps) => {
  const handleExport = () => {
    const headers = [
      "First Name",
      "Last Name",
      "Phone 1 - Value",
      "Phone 2 - Value",
      "Phone 3 - Value",
      "E-mail 1 - Value",
      "E-mail 2 - Value",
      "E-mail 3 - Value",
    ];

    const escapeCSV = (str: string | undefined | null) => {
      if (!str) return "";
      const stringified = String(str);
      if (stringified.includes(",") || stringified.includes('"') || stringified.includes("\n")) {
        return `"${stringified.replaceAll('"', '""')}"`;
      }
      return stringified;
    };

    const rows = people.map((p) => {
      const phones = p.phones || [];
      const emails = p.emails || [];

      return [
        escapeCSV(p.first_name),
        escapeCSV(p.last_name),
        escapeCSV(phones[0]),
        escapeCSV(phones[1]),
        escapeCSV(phones[2]),
        escapeCSV(emails[0]),
        escapeCSV(emails[1]),
        escapeCSV(emails[2]),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dzisiaj_kontakty_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <button
      onClick={handleExport}
      type="button"
      aria-label="Eksportuj kontakty do pliku CSV"
      className="my-auto flex h-min min-h-11 w-min min-w-11 flex-col items-center justify-center rounded-lg border border-transparent bg-surface p-1.5 text-text-secondary transition-colors hover:border-success-line hover:bg-success-soft hover:text-success disabled:cursor-not-allowed disabled:opacity-50 sm:p-2"
    >
      <Download className="h-5 w-5" />
    </button>
  );
};
