import React, { useState } from "react";
import { Place, OpeningHours } from "../../types";
import { FormButtons } from "../CommonButtons";
import { PlusCircle, X } from "lucide-react";

interface PlaceFormProps {
  place: Place | null;
  onSave: (updates: Partial<Place>) => void;
  onCancel: () => void;
  loading: boolean;
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

export default function PlaceForm({ place, onSave, onCancel, loading }: PlaceFormProps) {
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

  const handleSubmit = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();

    const updates: any = {
      tags,
      notes: notes.trim() || null,
      opening_hours: Object.keys(openingHours).length > 0 ? openingHours : null,
      rating: rating ? parseFloat(rating) : null,
      phone_number: phoneNumber.trim() || null,
      website: website.trim() || null,
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
            <label htmlFor="place-tags" className="form-label">Tagi:</label>
            <div className="flex gap-2 mb-3">
              <input
                id="place-tags"
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
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
              {tags.map((tag) => (
                <span
                  key={tag}
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
              <label htmlFor="place-rating" className="form-label">Ocena (0-5):</label>
              <input
                id="place-rating"
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
              <label htmlFor="place-phone" className="form-label">Numer telefonu:</label>
              <input
                id="place-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+48 123 456 789"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="place-website" className="form-label">Strona internetowa:</label>
            <input
              id="place-website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="input-field"
            />
          </div>

          <div>
            <div className="form-label">Godziny otwarcia:</div>
            <div className="space-y-2 bg-surface p-3 rounded-xl border border-gray-200 dark:border-gray-700">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center gap-3">
                  <label htmlFor={`hours-${day}`} className="w-12 text-sm font-medium text-textSecondary cursor-pointer">
                    {DAY_NAMES[day]}
                  </label>
                  <input
                    id={`hours-${day}`}
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
            <label htmlFor="place-notes" className="form-label">Notatki:</label>
            <textarea
              id="place-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Dodaj własne notatki o tym miejscu..."
              className="input-field"
            />
          </div>

          <FormButtons onClickSave={handleSubmit} onClickClose={onCancel} loading={loading}/>
        </form>
      </div>
    </div>
  );
}