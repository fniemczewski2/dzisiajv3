// components/people/PersonForm.tsx
import React, { useState } from 'react';
import { Person, PersonInsert } from '@/types/people';
import { AddButton, FormButtons } from '../ui/CommonButtons';
import { X } from 'lucide-react';

interface PersonFormProps {
  initialData?: Person | null;
  onSave: (data: PersonInsert | Person) => void;
  onCancel: () => void;
  loading: boolean;
}

const EMPTY_PERSON: PersonInsert = {
  first_name: '',
  last_name: '',
  relationship: '',
  priority: 0,
  phones: [],
  emails: [],
  notes: '',
  birthday: '',
  nameday: '',
};

export const PersonForm = ({ initialData, onSave, onCancel, loading }: Readonly<PersonFormProps>) => {
  const [formData, setFormData] = useState<PersonInsert | Person>(initialData ?? EMPTY_PERSON);
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleAddPhone = () => {
    if (!newPhone.trim()) return;
    setFormData((prev) => ({ ...prev, phones: [...(prev.phones || []), newPhone.trim()] }));
    setNewPhone('');
  };

  const handleRemovePhone = (phoneToRemove: string) => {
    setFormData((prev) => ({ ...prev, phones: prev.phones?.filter((p) => p !== phoneToRemove) }));
  };

  const handleAddEmail = () => {
    if (!newEmail.trim()) return;
    setFormData((prev) => ({ ...prev, emails: [...(prev.emails || []), newEmail.trim()] }));
    setNewEmail('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setFormData((prev) => ({ ...prev, emails: prev.emails?.filter((e) => e !== emailToRemove) }));
  };

  const renderChip = (value: string, onRemove: () => void) => (
    <span
      key={value}
      className="px-3 py-1 bg-surface text-textSecondary border border-gray-200 dark:border-gray-700 rounded-full text-sm flex items-center gap-1.5"
    >
      {value}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Usuń ${value}`}
        className="text-textMuted hover:text-red-500 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="form-label">Imię *</label>
          <input
            id="first_name"
            required
            value={formData.first_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="last_name" className="form-label">Nazwisko</label>
          <input
            id="last_name"
            value={formData.last_name || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="relationship" className="form-label">Relacja</label>
          <input
            id="relationship"
            placeholder="np. Mama, Kolega"
            value={formData.relationship || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, relationship: e.target.value }))}
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="priority" className="form-label">Priorytet kontaktu</label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) => setFormData((prev) => ({ ...prev, priority: Number.parseInt(e.target.value, 10) }))}
            className="input-field"
          >
            <option value={0}>0 - Brak przypomnienia</option>
            <option value={1}>1 - Raz na 2 tygodnie</option>
            <option value={2}>2 - Raz na miesiąc</option>
            <option value={3}>3 - Raz na 2 miesiące</option>
            <option value={4}>4 - Raz na rok</option>
            <option value={5}>5 - Brak przypomnienia</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="birthday" className="form-label">Data urodzin</label>
          <input
            id="birthday"
            type="date"
            value={formData.birthday || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, birthday: e.target.value }))}
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="nameday" className="form-label">Data imienin</label>
          <input
            id="nameday"
            type="date"
            value={formData.nameday || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, nameday: e.target.value }))}
            className="input-field"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="form-label mb-0">Telefony</span>
        {formData.phones && formData.phones.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.phones.map((p) => renderChip(p, () => handleRemovePhone(p)))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Nowy numer"
            className="input-field flex-1"
          />
          <AddButton onClick={handleAddPhone} small />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="form-label mb-0">Emaile</span>
        {formData.emails && formData.emails.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.emails.map((e) => renderChip(e, () => handleRemoveEmail(e)))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Nowy email"
            className="input-field flex-1"
          />
          <AddButton onClick={handleAddEmail} small />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="form-label">Notatki</label>
        <textarea
          id="notes"
          rows={3}
          value={formData.notes || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          className="input-field"
        />
      </div>

      <FormButtons onClickClose={onCancel} disabled={!formData.first_name} loading={loading} />
    </form>
  );
};
