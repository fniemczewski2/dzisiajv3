import { useToast } from "@/providers/ToastProvider";
import { useState, ChangeEvent } from "react";

export interface TicketFormData {
  trainNumber: string;
  trainName: string;
  date: string;
  departureTime: string;
  from: string;
  to: string;
  wagon: string;
  seat: string;
}

interface UseTicketUploadProps {
  setFormData: (data: TicketFormData) => void;
  setExpanded?: (expanded: boolean) => void;
}

export function useTicketUpload({ setFormData, setExpanded }: Readonly<UseTicketUploadProps>) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    let toastId: string | undefined;

    try {
      toastId = toast.loading('Analizowanie biletu...');
      
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/transport/parse-ticket', {
        method: 'POST',
        body: form,
      });
      
      const data = await res.json();

      if (res.ok) {
        if (toastId && toast.dismiss) toast.dismiss(toastId);
        toast.success('Bilet odczytany');
        
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
        
        setExpanded?.(true); 
      } else {
        if (toastId && toast.dismiss) toast.dismiss(toastId);
        toast.error(data.error || 'Nie udało się odczytać biletu');
      }
    } catch (error) {
      console.error('Błąd podczas przesyłania biletu:', error);
      if (toastId && toast.dismiss) toast.dismiss(toastId);
      toast.error('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return { handleFileUpload, loading };
}