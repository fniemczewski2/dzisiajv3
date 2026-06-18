// components/people/ExportContacts.tsx
import React from 'react';
import { Download } from 'lucide-react';
import { Person } from '../../types';

interface ExportProps {
  people: Person[];
}

export const ExportPeople = ({ people }: ExportProps) => {
  const handleExport = () => {
    const headers = [
      'First Name', 
      'Last Name', 
      'Phone 1 - Value', 
      'Phone 2 - Value', 
      'Phone 3 - Value', 
      'E-mail 1 - Value', 
      'E-mail 2 - Value', 
      'E-mail 3 - Value'
    ];
    

    const escapeCSV = (str: string | undefined | null) => {
      if (!str) return '';
      const stringified = String(str);
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
        return `"${stringified.replaceAll(/"/g, '""')}"`;
      }
      return stringified;
    };

    const rows = people.map(p => {
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
        escapeCSV(emails[2])
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dzisiaj_kontakty_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button 
      onClick={handleExport}
      className="px-4 py-2 bg-surface hover:bg-surfaceHover text-textSecondary font-medium rounded-lg flex items-center gap-2 border border-gray-200 dark:border-gray-800 transition-colors"
    >
      .csv <Download className="w-5 h-5" />
    </button>
  );
};