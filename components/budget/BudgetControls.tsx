import { Edit2, Save, X } from "lucide-react";
import LoadingState from "../ui/LoadingState";
import { CancelButton, SaveButton } from "../ui/CommonButtons";

interface BudgetControlsProps {
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
}: Readonly<BudgetControlsProps>) {
  return (
    <h3 className="font-bold w-full text-text flex  items-center gap-4">
      <span>Liczba godzin pracy</span>
      
      {isEditing ? (
        <div className="flex items-center gap-2">
          <SaveButton
            onClick={onSave}
            loading={saving}
             small
          />
          <CancelButton 
            onClick={onCancel}
            small
          />
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