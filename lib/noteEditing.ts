// lib/noteEditing.ts

/**
 * Pure text/selection helpers behind the note-editor formatting toolbar.
 * Kept free of DOM/React so the cursor math is unit-testable on its own —
 * components wire these onto an (uncontrolled) <textarea> ref.
 */
export interface TextSelectionState {
  value: string;
  start: number;
  end: number;
}

const BOLD_PLACEHOLDER = "pogrubienie";

/** Wraps the selection in `**bold**`, or unwraps it if already bold. */
export function applyBold(state: TextSelectionState): TextSelectionState {
  const { value, start, end } = state;
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);

  if (selected.length === 0) {
    const inserted = `**${BOLD_PLACEHOLDER}**`;
    return {
      value: before + inserted + after,
      start: before.length + 2,
      end: before.length + 2 + BOLD_PLACEHOLDER.length,
    };
  }

  if (selected.startsWith("**") && selected.endsWith("**") && selected.length >= 4) {
    const inner = selected.slice(2, -2);
    return { value: before + inner + after, start, end: start + inner.length };
  }

  const wrapped = `**${selected}**`;
  return { value: before + wrapped + after, start, end: start + wrapped.length };
}

const BULLET_PREFIX_RE = /^-\s+/;
const NUMBER_PREFIX_RE = /^\d+\.\s+/;

function lineBounds(value: string, start: number, end: number): { lineStart: number; lineEnd: number } {
  const lineStart = value.lastIndexOf("\n", Math.max(start - 1, 0)) + 1;
  const nextBreak = value.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  return { lineStart, lineEnd };
}

/**
 * Toggles a bullet/numbered-list marker on every line touched by the
 * selection. Re-numbers sequentially from 1 when turning a block of lines
 * into a numbered list; toggles the whole block off if every touched line
 * already has that marker.
 */
export function toggleListPrefix(
  state: TextSelectionState,
  kind: "bullet" | "number"
): TextSelectionState {
  const { value, start, end } = state;
  const { lineStart, lineEnd } = lineBounds(value, start, end);
  const before = value.slice(0, lineStart);
  const after = value.slice(lineEnd);
  const lines = value.slice(lineStart, lineEnd).split("\n");

  const markerRe = kind === "bullet" ? BULLET_PREFIX_RE : NUMBER_PREFIX_RE;
  const allAlreadyMarked = lines.every((line) => markerRe.test(line));

  let counter = 1;
  const newLines = lines.map((line) => {
    const stripped = line.replace(BULLET_PREFIX_RE, "").replace(NUMBER_PREFIX_RE, "");
    if (allAlreadyMarked) return stripped;
    if (kind === "bullet") return `- ${stripped}`;
    return `${counter++}. ${stripped}`;
  });

  const newBlock = newLines.join("\n");
  return { value: before + newBlock + after, start: before.length, end: before.length + newBlock.length };
}

/**
 * Pressing Enter at the end of a list line continues the list (next bullet,
 * or next number) instead of just breaking to a bare new line; pressing
 * Enter on an *empty* list line exits list mode. Returns null when Enter
 * needs no special handling (let the browser insert a plain newline).
 */
export function continueListOnEnter(state: TextSelectionState): TextSelectionState | null {
  const { value, start, end } = state;
  if (start !== end) return null;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", start);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  if (start !== lineEnd) return null;

  const currentLine = value.slice(lineStart, lineEnd);

  // The lookahead+backreference (`(?=(\s+))\1`) matches the same thing as a
  // plain `\s+` but atomically — it can't give back part of the whitespace
  // to backtrack into `(.*)$`, which is what made the plain version flagged
  // for super-linear backtracking (S8786).
  const bulletMatch = /^-(?=(\s+))\1(.*)$/.exec(currentLine);
  if (bulletMatch) {
    if (bulletMatch[2].trim() === "") {
      const before = value.slice(0, lineStart);
      const after = value.slice(lineEnd);
      return { value: before + after, start: lineStart, end: lineStart };
    }
    const insertion = "\n- ";
    const cursor = start + insertion.length;
    return { value: value.slice(0, start) + insertion + value.slice(start), start: cursor, end: cursor };
  }

  const numberMatch = /^(\d+)\.(?=(\s+))\2(.*)$/.exec(currentLine);
  if (numberMatch) {
    if (numberMatch[3].trim() === "") {
      const before = value.slice(0, lineStart);
      const after = value.slice(lineEnd);
      return { value: before + after, start: lineStart, end: lineStart };
    }
    const insertion = `\n${Number.parseInt(numberMatch[1], 10) + 1}. `;
    const cursor = start + insertion.length;
    return { value: value.slice(0, start) + insertion + value.slice(start), start: cursor, end: cursor };
  }

  return null;
}

/**
 * DOM glue shared by NoteForm/NoteEditForm's onKeyDown: applies
 * continueListOnEnter directly to an (uncontrolled) textarea and reports
 * whether it handled the keypress, so the caller knows to preventDefault().
 */
export function handleListContinuation(textarea: HTMLTextAreaElement): boolean {
  const next = continueListOnEnter({
    value: textarea.value,
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  });
  if (!next) return false;
  textarea.value = next.value;
  textarea.setSelectionRange(next.start, next.end);
  return true;
}
