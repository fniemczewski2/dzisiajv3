import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useState } from "react";


export function useImages() {
  const { supabase } = useAuth();
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploading(true)
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Brak autoryzacji');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      toast.success('Przesłano zdjęcie zostało wgrane!');
      return publicUrlData;
    } catch (error: any) {
      console.error(error);
      toast.error('Bład przesyłania zdjęcia.');
    } finally {
      setUploading(false);
    }
  };
  return {
    handleImageUpload, uploading
  }
}