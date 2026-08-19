// components/notes/NoteFormatToolbar.tsx

import React, { RefObject } from "react";
import { Bold, List, ListOrdered } from "lucide-react";
import { applyBold, toggleListPrefix, type TextSelectionState } from "@/lib/noteEditing";

interface NoteFormatToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
}

function applySelectionState(textarea: HTMLTextAreaElement, state: TextSelectionState) {
  textarea.value = state.value;
  textarea.focus();
  textarea.setSelectionRange(state.start, state.end);
  // The textarea is uncontrolled (ref-only), so React never sees this
  // mutation — dispatch a native input event for any listener relying on it.
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Minimal iPhone-Notes-style formatting toolbar: bold, bullet list, numbered list. */
export default function NoteFormatToolbar({ textareaRef, disabled }: Readonly<NoteFormatToolbarProps>) {
  const runOnTextarea = (transform: (state: TextSelectionState) => TextSelectionState) => () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const next = transform({ value: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd });
    applySelectionState(textarea, next);
  };

  const buttonClass =
    "p-1.5 rounded-md hover:bg-surfaceHover text-textSecondary hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-gray-200 dark:border-gray-800 w-fit">
      <button
        type="button"
        disabled={disabled}
        onClick={runOnTextarea(applyBold)}
        aria-label="Pogrubienie"
        title="Pogrubienie"
        className={buttonClass}
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={runOnTextarea((state) => toggleListPrefix(state, "bullet"))}
        aria-label="Lista punktowana"
        title="Lista punktowana"
        className={buttonClass}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={runOnTextarea((state) => toggleListPrefix(state, "number"))}
        aria-label="Lista numerowana"
        title="Lista numerowana"
        className={buttonClass}
      >
        <ListOrdered className="w-4 h-4" />
      </button>
    </div>
  );
}
