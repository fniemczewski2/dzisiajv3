import React, { useState } from "react";
import { Place, OpeningHours } from "../../types";
import { SaveButton, CancelButton } from "../CommonButtons";
import { PlusCircle } from "lucide-react";

interface PlaceFormProps {
  place: Place | null;
  onSave: (updates: Partial<Place>) => void;
  onCancel: () => void;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_NAMES: { [key: string]: string } = {
  monday: "Pn:",
  tuesday: "Wt:",
  wednesday: "Śr:",
  thursday: "Cz:",
  friday: "Pt:",
  saturday: "Sb:",
  sunday: "Nd:",
};

export default function PlaceForm({ place, onSave, onCancel }: PlaceFormProps) {
  const [tags, setTags] = useState<string[]>(place?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [notes, setNotes] = useState(place?.notes || "");
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    place?.opening_hours || {}
  );
  const [rating, setRating] = useState(place?.rating?.toString() || "");
  const [phoneNumber, setPhoneNumber] = useState(place?.phone_number || "");
  const [website, setWebsite] = useState(place?.website || "");

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Partial<Place> = {
      tags,
      notes: notes.trim() || undefined,
      opening_hours: Object.keys(openingHours).length > 0 ? openingHours : undefined,
      rating: rating ? parseFloat(rating) : undefined,
      phone_number: phoneNumber.trim() || undefined,
      website: website.trim() || undefined,
    };

    onSave(updates);
  };

  const updateOpeningHours = (day: string, hours: string) => {
    if (hours.trim()) {
      setOpeningHours({ ...openingHours, [day]: [hours] });
    } else {
      const newHours = { ...openingHours };
      delete newHours[day];
      setOpeningHours(newHours);
    }
  };

  if (!place) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-2">
            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tagi:
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Dodaj tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-2 py-1 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                  aria-label="Dodaj"
                >
                  <PlusCircle className="w-4 h-4"/>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-900 hover:text-secondary font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ocena (0-5)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numer telefonu
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+48 123 456 789"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Strona internetowa
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Opening Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Godziny otwarcia:
              </label>
              <div className="space-y-2">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-2">
                    <span className="w-32 text-sm text-gray-600">
                      {DAY_NAMES[day]}
                    </span>
                    <input
                      type="text"
                      value={openingHours[day]?.[0] || ""}
                      onChange={(e) => updateOpeningHours(day, e.target.value)}
                      placeholder="np. 09:00-17:00"
                      className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Format: 09:00-17:00 lub zostaw puste jeśli nieczynne
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notatki
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Dodaj własne notatki o tym miejscu..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-3">
            <SaveButton type="submit" />
            <CancelButton onCancel={onCancel} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}