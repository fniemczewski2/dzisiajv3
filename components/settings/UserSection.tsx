// components/settings/UserSection.tsx
import React from "react";
import { CircleUser } from "lucide-react";

interface UserSectionProps {
  email: string | undefined;
  onSignOut: () => void;
}

export default function UserSection({ email, onSignOut }: UserSectionProps) {
  return (
    <div className="bg-card p-6 mb-6 rounded-xl shadow space-y-4">
      <h3 className="text-xl font-semibold flex items-center">
        <CircleUser className="w-5 h-5 mr-2 text-gray-600" />
        Użytkownik
      </h3>
      <p>
        <strong>Email:</strong> {email}
      </p>
      <button
        onClick={onSignOut}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Wyloguj się
      </button>
    </div>
  );
}