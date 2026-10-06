// lib/trainTicketUtils.ts

import { useToast } from "@/providers/ToastProvider";
import { TicketFormData } from "@/types/transport";
import { useState, ChangeEvent } from "react";

interface UseTicketUploadProps {
  setFormData: (data: TicketFormData) => void;
  setExpanded?: (expanded: boolean) => void;
}

const TICKET_FIELD_LABELS: Record<keyof TicketFormData, string> = {
  trainNumber: 'numer pociągu',
  trainName: 'nazwa pociągu',
  date: 'data',
  departureTime: 'godzina odjazdu',
  from: 'stacja początkowa',
  to: 'stacja docelowa',
  wagon: 'wagon',
  seat: 'miejsce',
};

type ParsedTicketResponse = Partial<Record<keyof TicketFormData, string>>;

/** Odpowiedź /api/transport/parse-ticket → pola formularza (data z DD.MM.RRRR na RRRR-MM-DD). */
function toTicketFormData(data: ParsedTicketResponse): TicketFormData {
  return {
    trainNumber: data.trainNumber || '',
    trainName: data.trainName || '',
    date: data.date ? data.date.split('.').reverse().join('-') : '',
    departureTime: data.departureTime || '',
    from: data.from || '',
    to: data.to || '',
    wagon: data.wagon || '',
    seat: data.seat || '',
  };
}

export function useTicketUpload({ setFormData, setExpanded }: Readonly<UseTicketUploadProps>) {
  const [loading, setLoading] = useState(false);
  const [missingFromTicket, setMissingFromTicket] = useState<string[] | null>(null);
  const { toast } = useToast();
  const dismissLoading = (toastId: string | undefined) => {
    if (toastId && toast.dismiss) toast.dismiss(toastId);
  };

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
      dismissLoading(toastId);

      if (res.ok) {
        const parsed = toTicketFormData(data);
        const missing = (Object.keys(TICKET_FIELD_LABELS) as (keyof TicketFormData)[])
          .filter((key) => !parsed[key])
          .map((key) => TICKET_FIELD_LABELS[key]);

        toast.success(missing.length ? 'Bilet odczytany częściowo – uzupełnij brakujące pola' : 'Bilet odczytany – sprawdź dane przed zapisem');
        setFormData(parsed);
        setMissingFromTicket(missing);

        setExpanded?.(true); 
      } else {
        toast.error(data.error || 'Nie udało się odczytać biletu');
      }
    } catch (error) {
      console.error('Błąd podczas przesyłania biletu:', error);
      dismissLoading(toastId);
      toast.error('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return {
    handleFileUpload,
    loading,
    missingFromTicket,
    clearTicketReview: () => setMissingFromTicket(null),
  };
}
