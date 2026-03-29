import { Edit2, Save, X } from "lucide-react";
import LoadingState from "../LoadingState";

interface Props {
  isEditing: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onEdit: () => void;
}

export default function BudgetControls({
  isEditing,
  saving,
  onSave,
  onCancel,
  onEdit,
}: Readonly<Props>) {
  return (
    <h3 className="font-bold w-full text-text flex  items-center gap-4">
      <span>Liczba godzin pracy</span>
      
      {isEditing ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="p-2 hover:bg-primary rounded-lg bg-secondary text-white transition-colors disabled:opacity-50 flex items-center justify-center"
            title="Zapisz"
          >
            {saving ? <LoadingState /> : <Save className="w-4 h-4" />}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="p-2 bg-surface text-textSecondary hover:bg-surfaceHover rounded-lg transition-colors disabled:opacity-50"
            title="Anuluj"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={onEdit}
          className="p-2 bg-surface text-textSecondary hover:text-primary hover:bg-surfaceHover rounded-lg transition-colors"
          title="Edytuj stawki"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
    </h3>
  );
}