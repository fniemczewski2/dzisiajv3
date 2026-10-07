// lib/noteEditing.ts

export interface TextSelectionState {
  value: string;
  start: number;
  end: number;
}

const BOLD_PLACEHOLDER = "pogrubienie";

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

export function continueListOnEnter(state: TextSelectionState): TextSelectionState | null {
  const { value, start, end } = state;
  if (start !== end) return null;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", start);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  if (start !== lineEnd) return null;

  const currentLine = value.slice(lineStart, lineEnd);
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
