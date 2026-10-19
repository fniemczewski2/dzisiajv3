// components/profiles/TypedValueList.tsx
//
// Lista par „typ + wartość” w edytorze wizytówki (telefony, e-maile, adresy).
// Jeden komponent zamiast trzech kopii tego samego układu.

import { AddButton, DeleteButton } from "@/components/ui/CommonButtons";

export interface TypedValueItem {
  _id: string;
  type: string;
  [field: string]: string;
}

interface Props {
  title: string;
  /** Rzeczownik w dopełniaczu do etykiet przycisków, np. „numer telefonu”. */
  itemLabel: string;
  items: readonly TypedValueItem[];
  valueField: string;
  valuePlaceholder: string;
  inputType?: "text" | "email" | "tel";
  onAdd: () => void;
  onChange: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
}

export default function TypedValueList({
  title,
  itemLabel,
  items,
  valueField,
  valuePlaceholder,
  inputType = "text",
  onAdd,
  onChange,
  onRemove,
}: Readonly<Props>) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="form-label mb-2 block font-medium">{title}</span>
        <AddButton onClick={onAdd} small ariaLabel={`Dodaj ${itemLabel}`} />
      </div>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={item._id} className="flex items-center gap-2">
            <label htmlFor={`field-type-${item._id}`} className="sr-only">
              Typ ({itemLabel})
            </label>
            <input
              id={`field-type-${item._id}`}
              type="text"
              placeholder="Typ"
              value={item.type}
              onChange={(e) => onChange(idx, "type", e.target.value)}
              className="input-field w-24 sm:w-32"
            />
            <label htmlFor={`field-${valueField}-${item._id}`} className="sr-only">
              {valuePlaceholder}
            </label>
            <input
              id={`field-${valueField}-${item._id}`}
              type={inputType}
              placeholder={valuePlaceholder}
              value={item[valueField] ?? ""}
              onChange={(e) => onChange(idx, valueField, e.target.value)}
              className="input-field flex-1"
            />
            <DeleteButton
              onClick={() => onRemove(idx)}
              small
              ariaLabel={item[valueField] ? `Usuń ${itemLabel}: ${item[valueField]}` : `Usuń ${itemLabel}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
