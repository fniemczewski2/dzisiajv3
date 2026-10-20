// components/profiles/ProfilesList.tsx

import React, { useState } from "react";
import Image from "next/image";
import { useProfiles } from "@/hooks/db/useProfiles";
import NoResultsState from "@/components/ui/NoResultsState";
import ProfileEditorForm from "./ProfileEditorForm";
import VCardPreview from "./VCardPreview";
import { AddButton, DeleteButton, EditButton, ShareButton } from "../ui/CommonButtons";
import { NewVCardProfile, VCardProfile } from "@/types/profiles";

type ViewState = "list" | "form" | "preview";

export default function ProfilesList() {
  const { profiles, loading, addProfile, updateProfile, deleteProfile } = useProfiles();
  const [view, setView] = useState<ViewState>("list");
  const [selectedProfile, setSelectedProfile] = useState<VCardProfile | null>(null);

  const handleAddClick = () => {
    setSelectedProfile(null);
    setView("form");
  };

  const handleEditClick = (profile: VCardProfile) => {
    setSelectedProfile(profile);
    setView("form");
  };

  const handlePreviewClick = (profile: VCardProfile) => {
    setSelectedProfile(profile);
    setView("preview");
  };

  const handleFormSubmit = async (data: NewVCardProfile) => {
    let result;
    if (selectedProfile) {
      result = await updateProfile(selectedProfile.id, data);
    } else {
      result = await addProfile(data);
    }

    if (result.success) {
      setView("list");
    }
    return result;
  };

  const handleDelete = async (id: string) => {
    await deleteProfile(id);
  };

  if (view === "form") {
    return (
      <ProfileEditorForm
        initialData={selectedProfile || undefined}
        onSubmit={handleFormSubmit}
        onCancel={() => setView("list")}
      />
    );
  }

  if (view === "preview" && selectedProfile) {
    return <VCardPreview profile={selectedProfile} onBack={() => setView("list")} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="page-title">Wizytówki</h1>
        <AddButton onClick={handleAddClick} disabled={profiles.length >= 5 || loading} />
      </div>
      {profiles.length === 0 ? (
        <NoResultsState text="wizytówek" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="card p-4">
              <div className="mb-4 flex items-center gap-4">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-hover">
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs text-text-muted">Brak</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-text">{profile.profile_name}</h3>
                    {profile.is_public && (
                      <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-info">
                        Publiczna
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-text">{profile.full_name}</p>
                </div>
              </div>

              <div className="mt-2 flex gap-2 border-t border-line pt-4">
                <ShareButton onClick={() => handlePreviewClick(profile)} />
                <EditButton onClick={() => handleEditClick(profile)} />
                <DeleteButton onClick={() => handleDelete(profile.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
