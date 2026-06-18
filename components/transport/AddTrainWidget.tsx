"use client";

import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useToast } from '../../providers/ToastProvider';
import { CancelButton, SaveButton } from '../CommonButtons';

interface AddTrainWidgetProps {
  onTrainAdded: (train: any) => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

export default function AddTrainForm({ onTrainAdded, expanded, setExpanded }: Readonly<AddTrainWidgetProps>) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    trainNumber: '',
    trainName: '',
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
          trainName: data.trainName || '',
          date: data.date ? data.date.split('.').reverse().join('-') : '', 
          departureTime: data.departureTime || '',
          from: stations[0] || '',
          to: stations[1] || '',
          wagon: data.wagon || '',
          seat: data.seat || ''
        });
        
        setExpanded(true); 
      } else {
        if (toastId && toast.dismiss) toast.dismiss(toastId);
        toast.error(data.error || 'Nie udało się odczytać biletu');
      }
    } catch {
      if (toastId && toast.dismiss) toast.dismiss(toastId);
      toast.error('Błąd połączenia z serwerem');
    } finally {
      setIsLoading(false);
      e.target.value = ''; 
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTrainAdded(formData);
    toast.success('Pociąg dodany do śledzenia!');
    
    // Czyszczenie formularza
    setFormData({ trainNumber: '', trainName: '', date: '', departureTime: '', from: '', to: '', wagon: '', seat: ''});
    setExpanded(false);
  };

  return (
    <>
      {expanded && (
          <form onSubmit={handleSubmit} className="form-card">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="trainNumber" className="form-label">Nr pociągu</label>
                <input 
                  id="trainNumber"
                  type="text" 
                  value={formData.trainNumber}
                  onChange={e => setFormData({...formData, trainNumber: e.target.value})}
                  className="input-field py-1.5 w-full" 
                  required 
                  placeholder="2137"
                />
              </div>
              <div>
                <label htmlFor="trainName" className="form-label">Nazwa pociągu</label>
                <input 
                  id="trainName"
                  type="text" 
                  value={formData.trainName}
                  onChange={e => setFormData({...formData, trainName: e.target.value})}
                  className="input-field py-1.5 w-full" 
                  required 
                  placeholder="Przemyślanin"
                />
              </div>
            </div>
              <div>
                <label htmlFor="trainDate" className="form-label">Data i czas</label>
                <div className="flex gap-2">
                  <input 
                    id="trainDate"
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="input-field py-1.5 w-full" 
                    required 
                  />
                  {/* Czas nie ma osobnego labela widocznego, więc używamy aria-label dla czytników */}
                  <input 
                    type="time" 
                    aria-label="Godzina odjazdu"
                    value={formData.departureTime}
                    onChange={e => setFormData({...formData, departureTime: e.target.value})}
                    className="input-field py-1.5 w-24" 
                    required 
                  />
                </div>
              </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="stationFrom" className="form-label">Stacja początkowa</label>
                <input 
                  id="stationFrom"
                  type="text" 
                  value={formData.from}
                  onChange={e => setFormData({...formData, from: e.target.value})}
                  className="input-field py-1.5 w-full" 
                  placeholder="np. Poznań Gł."
                />
              </div>
              <div>
                <label htmlFor="stationTo" className="form-label">Stacja końcowa</label>
                <input 
                  id="stationTo"
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
                <label htmlFor="trainWagon" className="form-label">Wagon</label>
                <input 
                  id="trainWagon"
                  type="text" 
                  value={formData.wagon}
                  onChange={e => setFormData({...formData, wagon: e.target.value})}
                  className="input-field py-1.5 w-full" 
                  placeholder="13"
                />
              </div>
              <div>
                <label htmlFor="trainSeat" className="form-label">Miejsce</label>
                <input 
                  id="trainSeat"
                  type="text" 
                  value={formData.seat}
                  onChange={e => setFormData({...formData, seat: e.target.value})}
                  className="input-field py-1.5 w-full" 
                  placeholder="51"
                />
              </div>
            </div>

            {/* Przyciski Akcji na dole - Wzorowane na GoogleCalendarSync.tsx */}
            <div className="flex flex-col md:flex-row items-center justify-end gap-3 mt-2 border-t border-gray-100 dark:border-gray-800">
              <CancelButton onClick={() => setExpanded(false)} />
              <label 
                className={`px-4 py-2 w-full md:flex-1 bg-surface hover:bg-surfaceHover text-textSecondary font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800`}
              >
                .pdf
                <Upload className="w-4 h-4 text-textSecondary" />
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={handleFileUpload} 
                  disabled={isLoading}
                  className="hidden" 
                />
              </label>
            
              <SaveButton disabled={isLoading} />
            </div>

          </form>
      )}
    </>
  );
}