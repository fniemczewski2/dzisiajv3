import React, { useState } from 'react';
import { useProfiles, VCardProfile, NewVCardProfile } from '@/hooks/useProfiles';
import NoResultsState from '@/components/ui/NoResultsState';
import ProfileEditorForm from './ProfileEditorForm';
import VCardPreview from './VCardPreview';
import { AddButton, DeleteButton, EditButton, ShareButton } from '../ui/CommonButtons';

type ViewState = 'list' | 'form' | 'preview';

export default function ProfilesList() {
  const { profiles, loading, error, addProfile, updateProfile, deleteProfile } = useProfiles();
  const [view, setView] = useState<ViewState>('list');
  const [selectedProfile, setSelectedProfile] = useState<VCardProfile | null>(null);

  const handleAddClick = () => {
    setSelectedProfile(null); 
    setView('form');
  };

  const handleEditClick = (profile: VCardProfile) => {
    setSelectedProfile(profile);
    setView('form');
  };

  const handlePreviewClick = (profile: VCardProfile) => {
    setSelectedProfile(profile);
    setView('preview');
  };

  const handleFormSubmit = async (data: NewVCardProfile) => {
    let result;
    if (selectedProfile) {
      result = await updateProfile(selectedProfile.id, data);
    } else {
      result = await addProfile(data);
    }

    if (result.success) {
      setView('list');
    }
    return result;
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć profil: ${name}?`)) {
      await deleteProfile(id);
    }
  };

  if (error) return <div className="p-4 text-red-500 bg-red-100 rounded">Błąd: {error}</div>;

  if (view === 'form') {
    return (
      <ProfileEditorForm 
        initialData={selectedProfile || undefined} 
        onSubmit={handleFormSubmit}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'preview' && selectedProfile) {
    return (
      <VCardPreview 
        profile={selectedProfile} 
        onBack={() => setView('list')} 
      />
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-textPrimary">Wizytówka</h1>
            <AddButton
              onClick={handleAddClick}
              disabled={profiles.length >= 5 || loading}
            />
        </div>
      {profiles.length === 0 ? (
        <NoResultsState 
          text="wizytówek" 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(profile => (
            <div key={profile.id} className="card rounded-xl p-4">
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">Brak</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold dark:text-white truncate">{profile.profile_name}</h3>
                    {profile.is_public && (
                      <span className="px-2 py-0.5 text-[11px] bg-blue-50 text-blue-800 font-semibold rounded-full">Publiczna</span>
                    )}
                  </div>
                  <p className="text-sm dark:text-gray-200 text-gray-800 truncate">{profile.full_name}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                <ShareButton 
                  onClick={() => handlePreviewClick(profile)}
                />
                <EditButton 
                  onClick={() => handleEditClick(profile)}
                />
                <DeleteButton 
                  onClick={() => handleDelete(profile.id, profile.profile_name)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}