// lib/imgUtils.ts

import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useState } from "react";


const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export function useImages() {
  const { supabase } = useAuth();
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploading(true)
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];

      const fileExt = AVATAR_EXTENSIONS[file.type];
      if (!fileExt) {
        toast.error('Dozwolone formaty: JPG, PNG, WEBP, GIF.');
        return;
      }
      if (file.size > AVATAR_MAX_BYTES) {
        toast.error('Zdjęcie może mieć najwyżej 5 MB.');
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Brak autoryzacji');

      const fileName = `${userData.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      toast.success('Przesłano zdjęcie zostało wgrane!');
      return publicUrlData;
    } catch {
      toast.error('Bład przesyłania zdjęcia.');
    } finally {
      setUploading(false);
    }
  };
  return {
    handleImageUpload, uploading
  }
}
