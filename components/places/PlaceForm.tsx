import React, { useState } from "react";
import { Place, OpeningHours } from "../../types";
import { SaveButton, CancelButton } from "../CommonButtons";
import { PlusCircle, X } from "lucide-react";

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

  const handleSubmit = (e: React.SyntheticEvent) => {
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-text mb-4">Edytuj miejsce</h2>
          <div>
            <label className="form-label">Tagi:</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Dodaj tag..."
                className="input-field"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors shrink-0"
              >
                <PlusCircle className="w-5 h-5"/>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-surface text-textSecondary border border-gray-200 dark:border-gray-700 rounded-full text-sm flex items-center gap-1.5"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-textMuted hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Ocena (0-5):</label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">Numer telefonu:</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+48 123 456 789"
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Strona internetowa:</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="input-field"
            />
          </div>
          <div>
            <label className="form-label">Godziny otwarcia:</label>
            <div className="space-y-2 bg-surface p-3 rounded-xl border border-gray-200 dark:border-gray-700">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-12 text-sm font-medium text-textSecondary">
                    {DAY_NAMES[day]}
                  </span>
                  <input
                    type="text"
                    value={openingHours[day]?.[0] || ""}
                    onChange={(e) => updateOpeningHours(day, e.target.value)}
                    placeholder="np. 09:00-17:00"
                    className="input-field py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Notatki:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Dodaj własne notatki o tym miejscu..."
              className="input-field"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <SaveButton type="submit" />
            <CancelButton onClick={onCancel} />
          </div>
        </form>
      </div>
    </div>
  );
}