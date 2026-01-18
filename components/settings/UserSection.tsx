// components/settings/UserSection.tsx
import React, { useState } from "react";
import { CircleUser, LogOut } from "lucide-react";

interface UserSectionProps {
  email: string | undefined;
  onSignOut: () => void;
}

export default function UserSection({ email, onSignOut }: UserSectionProps) {
  
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-card p-6 mb-6 rounded-xl shadow space-y-4">
      <div className="flex items-center">
        <CircleUser className="w-5 h-5 mr-2 text-gray-600 flex-shrink-0" />
          <h3 className="text-xl w-full font-semibold flex items-center">
          Użytkownik
          </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-primary hover:underline"
        >
          {showDetails ? 'Ukryj' : 'Szczegóły'}
        </button>
      </div>
      {showDetails && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Email:</span>
            <span className="px-2 py-1 font-mono rounded text-sm text-gray-700">
              {email}
            </span>
          </div>
        </div>
      )}
      <button
        onClick={onSignOut}
        className="px-4 py-2 flex items-center bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Wyloguj się&nbsp;&nbsp;
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
}