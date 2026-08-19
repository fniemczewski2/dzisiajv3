// lib/noteFormatting.tsx

import React from "react";
import { sanitizeHref } from "@/lib/sanitize";

// Matches http(s)/www URLs, and now also bare "domain.tld" text anywhere in
// the line (e.g. "google.pl") — previously auto-linking only worked for a
// whole line that WAS a URL, not one mentioned mid-sentence.
const LINK_RE =
  /(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+|\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?:\/[^\s<>()]*)?\b)/gi;
const TRAILING_PUNCT_RE = /[.,;:!?)\]]+$/;
const MAX_RENDER_LENGTH = 5000;

function linkifyPlainText(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(LINK_RE);

  return parts.map((part, i) => {
    // split() with a capturing group returns matches at odd indices.
    if (i % 2 !== 1 || !part) {
      return part ? <React.Fragment key={`${keyPrefix}-t-${i}`}>{part}</React.Fragment> : null;
    }

    const trailingMatch = TRAILING_PUNCT_RE.exec(part);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const linkText = trailing ? part.slice(0, -trailing.length) : part;
    const href = linkText.includes(".") ? sanitizeHref(linkText) : null;

    if (!href) {
      return <React.Fragment key={`${keyPrefix}-t-${i}`}>{part}</React.Fragment>;
    }

    const displayText = linkText.replace(/^https?:\/\//, "").replace(/^www\./, "");

    return (
      <React.Fragment key={`${keyPrefix}-t-${i}`}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-secondary underline font-medium transition-colors break-all"
        >
          {displayText}
        </a>
        {trailing}
      </React.Fragment>
    );
  });
}

const BOLD_RE = /\*\*(.+?)\*\*/g;

/** Renders one note line's inline formatting (`**bold**` + auto-links) as safe React nodes — never raw HTML. */
export function renderNoteLineContent(text: string, keyPrefix: string): React.ReactNode {
  if (!text) return null;
  const clipped = text.length > MAX_RENDER_LENGTH ? `${text.slice(0, MAX_RENDER_LENGTH)}…` : text;
  const parts = clipped.split(BOLD_RE);

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyPrefix}-b-${i}`}>{linkifyPlainText(part, `${keyPrefix}-b${i}`)}</strong>
    ) : (
      <React.Fragment key={`${keyPrefix}-p-${i}`}>{linkifyPlainText(part, `${keyPrefix}-p${i}`)}</React.Fragment>
    )
  );
}

export type NoteLineKind = "bullet" | "number" | "text";

export interface ParsedNoteLine {
  kind: NoteLineKind;
  content: string;
}

const BULLET_LINE_RE = /^-\s+(.*)$/;
const NUMBER_LINE_RE = /^\d+\.\s+(.*)$/;

export function parseNoteLine(raw: string): ParsedNoteLine {
  const bulletMatch = BULLET_LINE_RE.exec(raw);
  if (bulletMatch) return { kind: "bullet", content: bulletMatch[1] };

  const numberMatch = NUMBER_LINE_RE.exec(raw);
  if (numberMatch) return { kind: "number", content: numberMatch[1] };

  return { kind: "text", content: raw };
}

export interface NoteBlock {
  kind: NoteLineKind;
  lines: string[];
}

/**
 * Groups a note's raw lines into renderable blocks: consecutive bullet (or
 * numbered) lines merge into one list, everything else stays its own plain
 * line — matching how Apple Notes treats lines as free text unless the user
 * explicitly turned list formatting on for them.
 */
export function groupNoteLines(items: string[]): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  for (const raw of items) {
    const parsed = parseNoteLine(raw);
    const last = blocks.at(-1);
    if (parsed.kind !== "text" && last && last.kind === parsed.kind) {
      last.lines.push(parsed.content);
    } else {
      blocks.push({ kind: parsed.kind, lines: [parsed.content] });
    }
  }
  return blocks;
}
