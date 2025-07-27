import { Edit2, Save, X, Loader2 } from "lucide-react";

interface Props {
  isEditing: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

export default function BudgetControls({
  isEditing,
  saving,
  onSave,
  onCancel,
  onEdit,
}: Props) {
  return (
    <h3 className="font-bold mb-2 flex justify-between items-center">
      Liczba godzin pracy
      {isEditing ? (
        <div>
          <button
            onClick={onSave}
            disabled={saving}
            className="ml-2 p-2 bg-green-100 rounded-lg hover:bg-green-200"
            title="zapisz"
          >
            {saving ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={onCancel}
            className="ml-2 p-2 bg-red-100 rounded-lg hover:bg-red-200"
            title="zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <button
          onClick={onEdit}
          className="ml-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          title="edytuj"
        >
          <Edit2 className="w-5 h-5" />
        </button>
      )}
    </h3>
  );
}
