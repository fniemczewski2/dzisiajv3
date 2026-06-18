// components/people/ImportPeople.tsx
import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface ImportProps {
  onImport: (people: any[]) => void;
}

const parseCSVRow = (str: string) => {
  const result = [];
  let cell = '';
  let quote = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"' && str[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quote = !quote;
    } else if (char === ',' && !quote) {
      result.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  result.push(cell.trim());
  return result;
};

export const ImportPeople = ({ onImport }: ImportProps) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (lines.length < 2) return;

      const headers = parseCSVRow(lines[0]);
      
      const getIndex = (name: string) => headers.indexOf(name);
      
      // Podstawowe dane
      const idxFirstName = getIndex('First Name');
      const idxLastName = getIndex('Last Name');
      
      const idxNamePrefix = getIndex('Name Prefix');       
      const idxOrganization = getIndex('Organization Name'); 
      const idxNotes = getIndex('Notes');      
      
      const phoneIndices = headers.map((h, i) => h.startsWith('Phone') && h.endsWith('Value') ? i : -1).filter(i => i !== -1);
      const emailIndices = headers.map((h, i) => h.startsWith('E-mail') && h.endsWith('Value') ? i : -1).filter(i => i !== -1);

      const newContacts = lines.slice(1).map(line => {
        const row = parseCSVRow(line);
        
        const first_name = idxFirstName !== -1 && row[idxFirstName] ? row[idxFirstName] : '';
        const last_name = idxLastName !== -1 && row[idxLastName] ? row[idxLastName] : '';
        const relationship = idxNamePrefix !== -1 && row[idxNamePrefix] ? row[idxNamePrefix] : '';
        
        let notes = '';
        if (idxOrganization !== -1 && row[idxOrganization]) {
          notes = row[idxOrganization];
        }
        if (idxNotes !== -1 && row[idxNotes]) {
          notes += notes ? ` | ${row[idxNotes]}` : row[idxNotes];
        }
        
        const phones = phoneIndices.map(idx => row[idx]).filter(Boolean);
        const emails = emailIndices.map(idx => row[idx]).filter(Boolean);

        return {
          first_name,
          last_name,
          relationship,
          notes,
          phones,
          emails,
          priority: 0,
          birthday: null
        };
      }).filter(c => c.first_name); 

      onImport(newContacts);
      
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center gap-2">
      <input 
        type="file" 
        accept=".csv" 
        className="hidden" 
        ref={fileRef} 
        onChange={handleFileUpload} 
      />
      <button 
        onClick={() => fileRef.current?.click()}
        className="px-4 py-2 bg-surface hover:bg-surfaceHover text-textSecondary font-medium rounded-lg flex items-center gap-2 border border-gray-200 dark:border-gray-800 transition-colors"
      >
         .csv <Upload className="w-5 h-5" />
      </button>
    </div>
  );
};