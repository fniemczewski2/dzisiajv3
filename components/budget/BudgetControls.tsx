import { CancelButton, EditButton, SaveButton } from "../ui/CommonButtons";

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
        <EditButton onClick={onEdit} small/>
      )}
    </h3>
  );
}