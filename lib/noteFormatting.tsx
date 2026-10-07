// lib/noteFormatting.tsx

import React from "react";
import { sanitizeHref } from "@/lib/sanitize";

const URL_RE = /(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+)/gi;

const BARE_DOMAIN_RE = /(\b(?:[a-z0-9-]+\.)+[a-z]{2,24}(?:\/[^\s<>()]*)?\b)/gi;

const TRAILING_PUNCT = new Set([".", ",", ";", ":", "!", "?", ")", "]"]);

function trailingPunctuation(text: string): string {
  let i = text.length;
  while (i > 0 && TRAILING_PUNCT.has(text[i - 1])) i--;
  return text.slice(i);
}
const MAX_RENDER_LENGTH = 5000;

function renderLinkToken(part: string, key: string): React.JSX.Element {
  const trailing = trailingPunctuation(part);
  const linkText = trailing ? part.slice(0, -trailing.length) : part;
  const href = linkText.includes(".") ? sanitizeHref(linkText) : null;

  if (!href) {
    return <React.Fragment key={key}>{part}</React.Fragment>;
  }

  const displayText = linkText.replace(/^https?:\/\//, "").replace(/^www\./, "");

  return (
    <React.Fragment key={key}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary-strong underline font-medium transition-colors break-all"
      >
        {displayText}
      </a>
      {trailing}
    </React.Fragment>
  );
}

function linkifyBareDomains(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(BARE_DOMAIN_RE);

  return parts.map((part, i) => {
    if (i % 2 !== 1 || !part) {
      return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
    }
    return renderLinkToken(part, `${keyPrefix}-${i}`);
  });
}

function linkifyPlainText(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(URL_RE);

  return parts.flatMap((part, i): React.ReactNode[] => {

    if (i % 2 !== 1 || !part) {
      return linkifyBareDomains(part, `${keyPrefix}-t-${i}`);
    }
    return [renderLinkToken(part, `${keyPrefix}-t-${i}`)];
  });
}

const BOLD_RE = /\*\*(.+?)\*\*/g;

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

const BULLET_LINE_RE = /^-(?=(\s+))\1(.*)$/;
const NUMBER_LINE_RE = /^\d+\.(?=(\s+))\1(.*)$/;

export function parseNoteLine(raw: string): ParsedNoteLine {
  const bulletMatch = BULLET_LINE_RE.exec(raw);
  if (bulletMatch) return { kind: "bullet", content: bulletMatch[2] };

  const numberMatch = NUMBER_LINE_RE.exec(raw);
  if (numberMatch) return { kind: "number", content: numberMatch[2] };

  return { kind: "text", content: raw };
}

export interface NoteBlock {
  kind: NoteLineKind;
  lines: string[];
}

export function groupNoteLines(items: string[]): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  for (const raw of items) {
    const parsed = parseNoteLine(raw);
    const last = blocks.at(-1);
    if (parsed.kind !== "text" && last?.kind === parsed.kind) {
      last.lines.push(parsed.content);
    } else {
      blocks.push({ kind: parsed.kind, lines: [parsed.content] });
    }
  }
  return blocks;
}
