"use client";

import React, { useState } from 'react';
import { Train, Upload, Loader2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useToast } from '../../providers/ToastProvider';
import { SaveButton } from '../CommonButtons';

interface AddTrainWidgetProps {
  onTrainAdded: (train: any) => void;
}

export default function AddTrainWidget({ onTrainAdded }: Readonly<AddTrainWidgetProps>) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Stan formularza dla ręcznej edycji lub danych zaciągniętych z PDF
  const [formData, setFormData] = useState({
    trainNumber: '',
    date: '',
    departureTime: '',
    from: '',
    to: '',
    wagon: '',
    seat: ''
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    // Zakładam, że Twój useToast obsługuje loading i dismiss, podobnie jak w ImportPlaces.tsx
    let toastId: string | undefined;

    try {
      toastId = toast.loading('Analizowanie biletu PDF...');
      
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/transport/parse-ticket', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();

      if (res.ok) {
        if (toastId && toast.dismiss) toast.dismiss(toastId);
        toast.success('Bilet odczytany! Sprawdź dane w formularzu.');

        // Podział stacji (np. "Poznań Gł. Warszawa Centr.")
        const stations = data.route?.split(/ (?=[A-Z])/) || [];

        setFormData({
          trainNumber: data.trainNumber || '',
          date: data.date ? data.date.split('.').reverse().join('-') : '', // Format dla <input type="date">
          departureTime: data.departureTime || '',
          from: stations[0] || '',
          to: stations[1] || '',
          wagon: data.wagon || '',
          seat: data.seat || ''
        });
        
        // Upewniamy się, że akordeon jest rozwinięty, aby użytkownik widział dane
        setExpanded(true); 
      } else {
        if (toastId && toast.dismiss) toast.dismiss(toastId);
        toast.error(data.error || 'Nie udało się odczytać biletu');
      }
    } catch (err) {
      if (toastId && toast.dismiss) toast.dismiss(toastId);
      toast.error('Błąd połączenia z serwerem');
    } finally {
      setIsLoading(false);
      // Reset inputa, by można było wgrać ten sam plik ponownie
      e.target.value = ''; 
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTrainAdded(formData);
    toast.success('Pociąg dodany do śledzenia!');
    
    // Czyszczenie formularza
    setFormData({ trainNumber: '', date: '', departureTime: '', from: '', to: '', wagon: '', seat: ''});
    setExpanded(false);
  };

  return (
    <div className="card rounded-xl shadow-sm overflow-hidden transition-all mt-2">
      {/* Nagłówek Akordeonu - Wzorowany na ConnectedCalendars.tsx */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-surface dark:bg-zinc-800 text-primary">
            <Train className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="font-bold text-text text-sm">Dodaj pociąg</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-textMuted">
              Import z PDF lub ręcznie
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-textMuted shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-textMuted shrink-0" />
        )}
      </button>

      {/* Rozwinięta zawartość */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-card px-4 py-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Nr pociągu (np. IC 7204)</label>
                <input 
                  type="text" 
                  value={formData.trainNumber}
                  onChange={e => setFormData({...formData, trainNumber: e.target.value})}
                  className="input-field py-1.5 w-full" 
                  required 
                  placeholder="IC 7204"
                />
              </div>
              <div>
                <label className="form-label">Data i czas</label>
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="input-field py-1.5 w-full" 
                    required 
                  />
                  <input 
                    type="time" 
                    value={formData.departureTime}
                    onChange={e => setFormData({...formData, departureTime: e.target.value})}
                    className="input-field py-1.5 w-24" 
                    required 
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Stacja początkowa</label>
                <input 
                  type="text" 
                  value={formData.from}
                  onChange={e => setFormData({...formData, from: e.target.value})}
                  className="input-field py-1.5 w-full" 
                  placeholder="np. Poznań Gł."
                />
              </div>
              <div>
                <label className="form-label">Stacja końcowa</label>
                <input 
                  type="text" 
                  value={formData.to}
                  onChange={e => setFormData({...formData, to: e.target.value})}
                  className="input-field py-1.5 w-full" 
                  placeholder="np. Warszawa Centr."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Wagon</label>
                <input 
                  type="text" 
                  value={formData.wagon}
                  onChange={e => setFormData({...formData, wagon: e.target.value})}
                  className="input-field py-1.5 w-full" 
                  placeholder="13"
                />
              </div>
              <div>
                <label className="form-label">Miejsce</label>
                <input 
                  type="text" 
                  value={formData.seat}
                  onChange={e => setFormData({...formData, seat: e.target.value})}
                  className="input-field py-1.5 w-full" 
                  placeholder="51"
                />
              </div>
            </div>

            {/* Przyciski Akcji na dole - Wzorowane na GoogleCalendarSync.tsx */}
            <div className="grid grid-cols-2 gap-3 pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
              
              <label 
                className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-surface hover:bg-surfaceHover text-text font-bold text-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors shadow-sm cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-textSecondary" />
                )}
                Importuj PDF
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={handleFileUpload} 
                  disabled={isLoading}
                  className="hidden" 
                />
              </label>

              <SaveButton disabled={isLoading} small/>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}