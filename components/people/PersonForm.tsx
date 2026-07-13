// components/people/PersonForm.tsx
import React, { useState } from 'react';
import { Person, PersonInsert } from '@/types';
import { AddButton, FormButtons } from '../ui/CommonButtons';
import { X } from 'lucide-react';

interface PersonFormProps {
  initialData?: Person | null;
  onSave: (data: PersonInsert | Person) => void;
  onCancel: () => void;
}

export const PersonForm = ({ initialData, onSave, onCancel }: Readonly<PersonFormProps>) => {
  const [formData, setFormData] = useState<Partial<Person>>(initialData || {
    first_name: '', last_name: '', relationship: '', priority: 0,
    phones: [], emails: [], notes: '', birthday: '', nameday: '' // <-- Dodane nameday
  });

  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as PersonInsert);
  };

  const handleAddPhone = () => {
    if (newPhone) {
      setFormData(prev => ({ ...prev, phones: [...(prev.phones || []), newPhone] }));
      setNewPhone('');
    }
  };

  const handleRemovePhone = (phoneToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      phones: prev.phones?.filter(p => p !== phoneToRemove)
    }));
  };

  const handleAddEmail = () => {
    if (newEmail) {
      setFormData(prev => ({ ...prev, emails: [...(prev.emails || []), newEmail] }));
      setNewEmail('');
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails?.filter(e => e !== emailToRemove)
    }));
  };

  const renderPhoneItem = (p: string) => (
    <div key={p} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
      {p} 
      <X className="w-4 h-4 cursor-pointer text-red-500" onClick={() => handleRemovePhone(p)} />
    </div>
  );

  const renderEmailItem = (e: string) => (
    <div key={e} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
      {e} 
      <X className="w-4 h-4 cursor-pointer text-red-500" onClick={() => handleRemoveEmail(e)} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-surface p-4 rounded-xl shadow border border-gray-200 dark:border-gray-800">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col text-sm font-medium">
          {"Imię *"}
          <input required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="mt-1 p-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
        </label>
        <label className="flex flex-col text-sm font-medium">
          {"Nazwisko"}
          <input value={formData.last_name || ''} onChange={e => setFormData({...formData, last_name: e.target.value})} className="mt-1 p-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col text-sm font-medium">
          {"Relacja"}
          <input placeholder="np. Mama, Kolega" value={formData.relationship || ''} onChange={e => setFormData({...formData, relationship: e.target.value})} className="mt-1 p-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
        </label>
        
        <label className="flex flex-col text-sm font-medium">
          {"Priorytet kontaktu"}
          <select value={formData.priority} onChange={e => setFormData({...formData, priority: Number.parseInt(e.target.value, 10)})} className="mt-1 p-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <option value={0}>0 - Brak przypomnienia</option>
            <option value={1}>1 - Raz na 2 tygodnie</option>
            <option value={2}>2 - Raz na miesiąc</option>
            <option value={3}>3 - Raz na 2 miesiące</option>
            <option value={4}>4 - Raz na rok</option>
            <option value={5}>5 - Brak przypomnienia</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col text-sm font-medium">
          {"Data urodzin"}
          <input type="date" value={formData.birthday || ''} onChange={e => setFormData({...formData, birthday: e.target.value})} className="mt-1 p-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
        </label>
        <label className="flex flex-col text-sm font-medium">
          {"Data imienin"}
          <input type="date" value={formData.nameday || ''} onChange={e => setFormData({...formData, nameday: e.target.value})} className="mt-1 p-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
        </label>
      </div>

      {/* Numery Telefonu */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Telefony</span>
        {formData.phones?.map(renderPhoneItem)}
        <div className="flex gap-2">
          <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Nowy numer" className="flex-1 p-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm" />
          <AddButton onClick={handleAddPhone} small={true} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Emaile</span>
        {formData.emails?.map(renderEmailItem)}
        <div className="flex gap-2">
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Nowy email" className="flex-1 p-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm" />
          <AddButton onClick={handleAddEmail} small/>
        </div>
      </div>

      <label className="flex flex-col text-sm font-medium">
        {"Notatki"}
        <textarea rows={3} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-1 p-2 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
      </label>

      <FormButtons onClickClose={onCancel} disabled={!formData.first_name} />
    </form>
  );
};